import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Member, Guest } from '@/types';
import { CreateTablesModal } from '@/components/CreateTablesModal';
import { TableCard } from '@/components/TableCard';
import { EventFooter } from '@/components/EventFooter';
import { canManageGroupings } from '@/utils/rolePermissions';

interface Table {
  id: string;
  label: string;
  number: number;
  guests: Guest[];
}

export default function TablesScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { currentUser, members: allMembers } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [checkedGuests, setCheckedGuests] = useState<{ tableIdx: number; guestId: string }[]>([]);
  const [checkedTables, setCheckedTables] = useState<Set<number>>(new Set());
  const [initialTables, setInitialTables] = useState<Table[]>([]);

  const isAdmin = useMemo(() => canManageGroupings(currentMember), [currentMember]);

  const { isLoading: eventLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const { data: registrationsData, isLoading: registrationsLoading } = useQuery({
    queryKey: ['registrations', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const { data: tableAssignmentsData, isLoading: tablesLoading, refetch: refetchTables } = useQuery({
    queryKey: ['table_assignments', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_assignments')
        .select('*')
        .eq('event_id', eventId)
        .order('table_label')
        .order('table_number');
      
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const createTablesMutation = useMutation({
    mutationFn: async (newTables: Table[]) => {
      const inserts = newTables.map((table) => ({
        event_id: eventId,
        table_label: table.label,
        table_number: table.number,
        guest_slots: table.guests,
      }));

      const { error } = await supabase
        .from('table_assignments')
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table_assignments', eventId] });
      refetchTables();
    },
  });

  const updateTablesMutation = useMutation({
    mutationFn: async (updatedTables: Table[]) => {
      for (const table of updatedTables) {
        const { error } = await supabase
          .from('table_assignments')
          .update({ guest_slots: table.guests })
          .eq('id', table.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table_assignments', eventId] });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase
        .from('table_assignments')
        .delete()
        .eq('id', tableId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table_assignments', eventId] });
      refetchTables();
    },
  });

  useEffect(() => {
    if (currentUser && allMembers.length > 0) {
      const member = allMembers.find((m: any) => m.id === currentUser.id);
      setCurrentMember(member as Member || null);
    }
  }, [currentUser, allMembers]);



  useEffect(() => {
    if (tableAssignmentsData) {
      const mappedTables: Table[] = tableAssignmentsData.map((ta: any) => ({
        id: ta.id,
        label: ta.table_label,
        number: ta.table_number,
        guests: ta.guest_slots || [],
      }));
      setTables(mappedTables);
      setInitialTables(JSON.parse(JSON.stringify(mappedTables)));
    }
  }, [tableAssignmentsData]);

  const registeredGuests = useMemo(() => {
    console.log('[tables] 🔍 REGISTERED GUESTS CALCULATION STARTED');
    console.log('[tables] registrationsData exists:', !!registrationsData);
    console.log('[tables] registrationsData length:', registrationsData?.length || 0);
    console.log('[tables] allMembers length:', allMembers?.length || 0);
    
    if (!registrationsData) {
      console.log('[tables] ❌ No registrations data - returning empty array');
      return [];
    }
    
    if (!allMembers || allMembers.length === 0) {
      console.log('[tables] ⚠️ No members data available');
    }
    
    console.log('[tables] Processing', registrationsData.length, 'registrations');
    
    const assignedGuestIds = new Set<string>();
    tables.forEach((table) => {
      table.guests.forEach((guest) => {
        assignedGuestIds.add(guest.id);
      });
    });
    
    console.log('[tables] Currently assigned guest IDs:', Array.from(assignedGuestIds));
    console.log('[tables] Number of tables:', tables.length);

    const guests = registrationsData
      .map((reg: any) => {
        console.log('[tables] 📋 Processing registration:', {
          id: reg.id,
          member_id: reg.member_id,
          is_custom_guest: reg.is_custom_guest,
          custom_guest_name: reg.custom_guest_name,
        });
        
        if (reg.is_custom_guest) {
          const guestId = `custom-${reg.id}`;
          if (assignedGuestIds.has(guestId)) {
            console.log('[tables] Custom guest already assigned:', guestId);
            return null;
          }
          
          return {
            id: guestId,
            name: reg.custom_guest_name || 'Unknown Guest',
            memberId: undefined,
          } as Guest;
        } else {
          const member = allMembers.find((m: any) => m.id === reg.member_id);
          if (!member) {
            console.log('[tables] Member not found for registration:', reg.member_id);
            return null;
          }
          if (assignedGuestIds.has(member.id)) {
            console.log('[tables] Member already assigned:', member.id, member.name);
            return null;
          }
          
          return {
            id: member.id,
            name: member.name,
            memberId: member.id,
          } as Guest;
        }
      })
      .filter((g): g is Guest => g !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('[tables] ✅ Final unassigned guests:', guests.length);
    console.log('[tables] Guest names:', guests.map(g => ({ id: g.id, name: g.name })));
    console.log('[tables] 🔍 REGISTERED GUESTS CALCULATION COMPLETE');
    return guests;
  }, [registrationsData, allMembers, tables]);

  const handleCreateTables = (count: number, label: string) => {
    const newTables: Table[] = [];
    for (let i = 1; i <= count; i++) {
      newTables.push({
        id: `temp-${Date.now()}-${i}`,
        label,
        number: i,
        guests: [],
      });
    }
    
    createTablesMutation.mutate(newTables);
  };

  const handleAddGuestsToTable = (tableIdx: number) => {
    if (selectedGuestIds.size === 0) return;

    const guestsToAdd = Array.from(selectedGuestIds)
      .map((id) => registeredGuests.find((g) => g.id === id))
      .filter((g): g is Guest => g !== null);

    setTables((prevTables) => {
      const newTables = [...prevTables];
      newTables[tableIdx] = {
        ...newTables[tableIdx],
        guests: [...newTables[tableIdx].guests, ...guestsToAdd],
      };
      return newTables;
    });

    setSelectedGuestIds(new Set());
  };

  const handleRemoveGuest = (tableIdx: number, guestId: string) => {
    setTables((prevTables) => {
      const newTables = [...prevTables];
      newTables[tableIdx] = {
        ...newTables[tableIdx],
        guests: newTables[tableIdx].guests.filter((g) => g.id !== guestId),
      };
      return newTables;
    });

    setCheckedGuests((prev) =>
      prev.filter((cg) => !(cg.tableIdx === tableIdx && cg.guestId === guestId))
    );
  };

  const handleResetTable = (tableIdx: number) => {
    Alert.alert(
      'Reset Table',
      'Are you sure you want to remove all guests from this table?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setTables((prevTables) => {
              const newTables = [...prevTables];
              newTables[tableIdx] = {
                ...newTables[tableIdx],
                guests: [],
              };
              return newTables;
            });
          },
        },
      ]
    );
  };

  const handleDeleteTable = (tableIdx: number) => {
    Alert.alert(
      'Delete Table',
      'Are you sure you want to delete this table?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const tableId = tables[tableIdx].id;
            if (tableId.startsWith('temp-')) {
              setTables((prev) => prev.filter((_, idx) => idx !== tableIdx));
            } else {
              deleteTableMutation.mutate(tableId);
            }
          },
        },
      ]
    );
  };

  const handleSaveTables = async () => {
    try {
      await updateTablesMutation.mutateAsync(tables);
      setInitialTables(JSON.parse(JSON.stringify(tables)));
      Alert.alert('Success', 'Tables saved successfully');
    } catch (error) {
      console.error('[tables] Error saving tables:', error);
      Alert.alert('Error', 'Failed to save tables');
    }
  };

  const handleGuestCheckboxChange = (tableIdx: number, guestId: string, checked: boolean) => {
    if (checked) {
      setCheckedGuests([...checkedGuests, { tableIdx, guestId }]);
    } else {
      setCheckedGuests(checkedGuests.filter(
        (cg) => !(cg.tableIdx === tableIdx && cg.guestId === guestId)
      ));
    }
  };

  const handleTableCheckboxChange = (tableIdx: number, checked: boolean) => {
    const newCheckedTables = new Set(checkedTables);
    if (checked) {
      newCheckedTables.add(tableIdx);
    } else {
      newCheckedTables.delete(tableIdx);
    }
    setCheckedTables(newCheckedTables);
  };

  const handleSwitchGuests = () => {
    if (checkedGuests.length !== 2) return;

    const [guest1, guest2] = checkedGuests;
    const newTables = [...tables];

    const g1 = newTables[guest1.tableIdx].guests.find((g) => g.id === guest1.guestId);
    const g2 = newTables[guest2.tableIdx].guests.find((g) => g.id === guest2.guestId);

    if (!g1 || !g2) return;

    newTables[guest1.tableIdx].guests = newTables[guest1.tableIdx].guests.map((g) =>
      g.id === guest1.guestId ? g2 : g
    );
    newTables[guest2.tableIdx].guests = newTables[guest2.tableIdx].guests.map((g) =>
      g.id === guest2.guestId ? g1 : g
    );

    setTables(newTables);
    setCheckedGuests([]);
  };

  const handleSwitchTables = () => {
    const checkedTablesArray = Array.from(checkedTables).sort();
    if (checkedTablesArray.length !== 2) return;

    const [table1Idx, table2Idx] = checkedTablesArray;
    const newTables = [...tables];

    const tempGuests = newTables[table1Idx].guests;
    newTables[table1Idx].guests = newTables[table2Idx].guests;
    newTables[table2Idx].guests = tempGuests;

    setTables(newTables);
    setCheckedTables(new Set());
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(tables) !== JSON.stringify(initialTables);
  }, [tables, initialTables]);

  const isCheckboxMode = checkedGuests.length > 0 || checkedTables.size > 0;

  if (eventLoading || registrationsLoading || tablesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.titleText}>TABLES</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.titleText}>TABLES</Text>
        </View>

        {isAdmin && (
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setCreateModalVisible(true)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createBtnText}>CREATE TABLES</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAdmin && checkedTables.size === 2 && (
          <View style={styles.switchContainer}>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={handleSwitchTables}
            >
              <Text style={styles.switchBtnText}>SWITCH TABLES</Text>
            </TouchableOpacity>
          </View>
        )}

        {checkedGuests.length === 2 && (
          <View style={styles.switchContainer}>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={handleSwitchGuests}
            >
              <Text style={styles.switchBtnText}>SWITCH GUESTS</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasChanges && isAdmin && (
          <View style={styles.saveContainer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTables}>
              <Text style={styles.saveBtnText}>SAVE TABLES</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.contentWrapper}>
          {isAdmin && (
            <View style={styles.guestsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionCount}>{registeredGuests.length}</Text>
                <Text style={styles.sectionTitle}>Unassigned</Text>
              </View>

              <ScrollView style={styles.guestsList} showsVerticalScrollIndicator={false}>
                {registeredGuests.map((guest) => {
                  const isSelected = selectedGuestIds.has(guest.id);
                  return (
                    <TouchableOpacity
                      key={guest.id}
                      style={[styles.guestCard, isSelected && styles.guestCardSelected]}
                      onPress={() => {
                        const newSelected = new Set(selectedGuestIds);
                        if (isSelected) {
                          newSelected.delete(guest.id);
                        } else {
                          newSelected.add(guest.id);
                        }
                        setSelectedGuestIds(newSelected);
                      }}
                    >
                      <Text style={[styles.guestName, isSelected && styles.guestNameSelected]}>
                        {guest.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.tablesSection}>
            {tables.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="grid-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Tables Created</Text>
                {isAdmin && (
                  <Text style={styles.emptySubtitle}>Tap &quot;CREATE TABLES&quot; to get started</Text>
                )}
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tablesScrollContent}>
                {tables.map((table, idx) => (
                  <TableCard
                    key={table.id}
                    tableLabel={table.label}
                    tableNumber={table.number}
                    guests={table.guests}
                    selectedCount={selectedGuestIds.size}
                    onAddGuests={() => handleAddGuestsToTable(idx)}
                    onRemoveGuest={(guestId) => handleRemoveGuest(idx, guestId)}
                    isCheckboxMode={isCheckboxMode}
                    checkedGuests={checkedGuests}
                    onGuestCheckboxChange={handleGuestCheckboxChange}
                    tableIdx={idx}
                    isChecked={checkedTables.has(idx)}
                    onTableCheckboxChange={handleTableCheckboxChange}
                    onResetTable={() => handleResetTable(idx)}
                    onDeleteTable={() => handleDeleteTable(idx)}
                    isAdmin={isAdmin}
                  />
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </SafeAreaView>

      <CreateTablesModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreateTables={handleCreateTables}
      />

      <EventFooter />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1B5E20',
    gap: 8,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  switchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  switchBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  saveContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  guestsSection: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#999',
    marginTop: 4,
  },
  guestsList: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  guestCard: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  guestCardSelected: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  guestName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#333',
  },
  guestNameSelected: {
    color: '#fff',
  },
  tablesSection: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tablesScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#666',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
