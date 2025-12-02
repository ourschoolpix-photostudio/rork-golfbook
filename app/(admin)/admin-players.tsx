import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Member } from '@/types';
import { PlayerEditModal } from '@/components/PlayerEditModal';
import { PlayerCard } from '@/components/PlayerCard';
import { AdminFooter } from '@/components/AdminFooter';

export default function AdminPlayersScreen() {
  const router = useRouter();
  const { members: allMembersFromContext, addMember, updateMember: updateMemberFromContext, deleteMember: deleteMemberFromContext } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'active' | 'in-active' | 'guests' | 'local' | 'outofstate'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedForActivation, setSelectedForActivation] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('[AdminPlayers] Loading members from AuthContext');
    const filteredMembers = allMembersFromContext.filter(m => {
      if (m.membershipType === 'guest' && m.id.startsWith('guest_')) {
        console.log('[AdminPlayers] Filtering out custom guest (event-specific):', m.name, m.id);
        return false;
      }
      return true;
    });
    const sorted = [...filteredMembers].sort((a, b) => a.name.localeCompare(b.name));
    setMembers(sorted);
    console.log(`[AdminPlayers] Set ${sorted.length} members to state (excluded event-specific guests)`);
  }, [allMembersFromContext]);

  useFocusEffect(
    useCallback(() => {
      setFilterType('all');
    }, [])
  );

  const loadMembers = async () => {
    console.log('[AdminPlayers] Reloading members from context');
    const filteredMembers = allMembersFromContext.filter(m => {
      if (m.membershipType === 'guest' && m.id.startsWith('guest_')) {
        return false;
      }
      return true;
    });
    const sorted = [...filteredMembers].sort((a, b) => a.name.localeCompare(b.name));
    setMembers(sorted);
  };

  const handleSavePlayer = async (updatedMember: Member) => {
    console.log('[AdminPlayers] Saving player:', updatedMember.name, updatedMember.id);
    try {
      if (editingMember) {
        await updateMemberFromContext(updatedMember.id, updatedMember);
        console.log('[AdminPlayers] Player updated, reloading members...');
      } else {
        await addMember(updatedMember);
        console.log('[AdminPlayers] New player added, reloading members...');
      }
      await loadMembers();
    } catch (error) {
      console.error('[AdminPlayers] Error saving player:', error);
    }
    setModalVisible(false);
    setEditingMember(null);
  };

  const handleDeleteMember = async (id: string) => {
    Alert.alert('Delete Member', 'Are you sure you want to delete this member?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMemberFromContext(id);
          loadMembers();
        },
      },
    ]);
  };

  const handleBulkActivate = async () => {
    if (selectedForActivation.size === 0) {
      Alert.alert('No Members Selected', 'Please select at least one member to activate.');
      return;
    }

    try {
      const toActivate = members.filter((m) => selectedForActivation.has(m.id));
      for (const member of toActivate) {
        const updated = { ...member, membershipType: 'active' as const };
        await updateMemberFromContext(member.id, updated as Member);
      }
      await loadMembers();
      setSelectedForActivation(new Set());
      Alert.alert('Success', `Activated ${toActivate.length} member(s)`);
    } catch (error) {
      console.error('Error activating members:', error);
      Alert.alert('Error', 'Failed to activate members');
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedForActivation.size === 0) {
      Alert.alert('No Members Selected', 'Please select at least one member to deactivate.');
      return;
    }

    const selectedMembers = members.filter((m) => selectedForActivation.has(m.id));
    Alert.alert(
      'Deactivate Members',
      `Are you sure you want to deactivate ${selectedMembers.length} member(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const member of selectedMembers) {
                const updated = { ...member, membershipType: 'in-active' as const };
                await updateMemberFromContext(member.id, updated as Member);
              }
              await loadMembers();
              setSelectedForActivation(new Set());
              Alert.alert('Success', `Deactivated ${selectedMembers.length} member(s)`);
            } catch (error) {
              console.error('Error deactivating members:', error);
              Alert.alert('Error', 'Failed to deactivate members');
            }
          },
        },
      ]
    );
  };

  const getSelectedMembersStatus = () => {
    if (selectedForActivation.size === 0) return null;
    const selectedMembers = members.filter((m) => selectedForActivation.has(m.id));
    const allActive = selectedMembers.every((m) => m.membershipType === 'active');
    const allInactive = selectedMembers.every((m) => m.membershipType === 'in-active');
    const hasGuests = selectedMembers.some((m) => m.membershipType === 'guest');
    
    if (allActive) return 'all-active';
    if (allInactive) return 'all-inactive';
    return 'mixed';
  };

  const handleDeactivateAllActive = async () => {
    const activeMembers = members.filter(m => m.membershipType === 'active');
    
    if (activeMembers.length === 0) {
      Alert.alert('No Active Members', 'There are no active members to deactivate.');
      return;
    }

    Alert.alert(
      'Deactivate All Active Members',
      `Are you sure you want to deactivate ${activeMembers.length} active member(s)? Guest status will not be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const member of activeMembers) {
                const updated = { ...member, membershipType: 'in-active' as const };
                await updateMemberFromContext(member.id, updated as Member);
              }
              await loadMembers();
              Alert.alert('Success', `Deactivated ${activeMembers.length} member(s)`);
            } catch (error) {
              console.error('Error deactivating members:', error);
              Alert.alert('Error', 'Failed to deactivate members');
            }
          },
        },
      ]
    );
  };

  const handleToggleBulkSelect = (memberId: string) => {
    const newSelected = new Set(selectedForActivation);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedForActivation(newSelected);
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setModalVisible(true);
  };

  const handleAddNewMemberClick = () => {
    console.log('[AdminPlayers] Opening modal to add new member');
    setEditingMember(null);
    setModalVisible(true);
  };

  const getFilteredMembers = () => {
    const localStatesArray = ['', 'MD', 'VA', 'PA', 'NJ', 'DE'];
    let result = [...members];
    if (filterType === 'active') {
      result = result.filter(m => m.membershipType === 'active');
    } else if (filterType === 'in-active') {
      result = result.filter(m => m.membershipType === 'in-active');
    } else if (filterType === 'guests') {
      result = result.filter(m => m.membershipType === 'guest');
    } else if (filterType === 'local') {
      result = result.filter(m => localStatesArray.includes(m.state || ''));
    } else if (filterType === 'outofstate') {
      result = result.filter(m => !localStatesArray.includes(m.state || ''));
    }
    if (searchText.trim()) {
      result = result.filter(m => m.name.toLowerCase().includes(searchText.toLowerCase()));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  };

  const getFilterTitle = () => {
    switch (filterType) {
      case 'active':
        return 'Active Members';
      case 'in-active':
        return 'In-active Members';
      case 'guests':
        return 'Guest Players';
      case 'local':
        return 'Local Players';
      case 'outofstate':
        return 'Visiting Players';
      default:
        return 'All Members';
    }
  };

  const localStates = ['', 'MD', 'VA', 'PA', 'NJ', 'DE'];
  const totalPlayers = members.length;
  const activeMembers = members.filter(m => m.membershipType === 'active').length;
  const nonMembers = members.filter(m => m.membershipType === 'in-active').length;
  const guests = members.filter(m => m.membershipType === 'guest').length;
  const localMembers = members.filter(m => localStates.includes(m.state || '')).length;
  const outOfStateMembers = members.filter(m => !localStates.includes(m.state || '')).length;

  return (
    <View style={styles.container}>
      <View style={styles.customHeaderWrapper}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Player Management</Text>
        </View>

        <View style={styles.statsRow}>
        <TouchableOpacity style={[styles.statBox, filterType === 'all' && styles.statBoxActive]} onPress={() => setFilterType('all')}>
          <Text style={styles.statNumber}>{totalPlayers}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statBox, filterType === 'active' && styles.statBoxActive]} onPress={() => setFilterType('active')}>
          <Text style={styles.statNumber}>{activeMembers}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statBox, filterType === 'in-active' && styles.statBoxActive]} onPress={() => setFilterType('in-active')}>
          <Text style={styles.statNumber}>{nonMembers}</Text>
          <Text style={styles.statLabel}>In-active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statBox, filterType === 'guests' && styles.statBoxActive]} onPress={() => setFilterType('guests')}>
          <Text style={styles.statNumber}>{guests}</Text>
          <Text style={styles.statLabel}>Guests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statBox, filterType === 'local' && styles.statBoxActive]} onPress={() => setFilterType('local')}>
          <Text style={styles.statNumber}>{localMembers}</Text>
          <Text style={styles.statLabel}>Local</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statBox, filterType === 'outofstate' && styles.statBoxActive]} onPress={() => setFilterType('outofstate')}>
          <Text style={styles.statNumber}>{outOfStateMembers}</Text>
          <Text style={styles.statLabel}>Visitor</Text>
        </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterTitleCard}>
        <View style={styles.buttonGroup}>
          {selectedForActivation.size > 0 && getSelectedMembersStatus() === 'all-active' && (
            <TouchableOpacity
              style={styles.deactivateButtonOverlay}
              onPress={handleBulkDeactivate}
            >
              <Ionicons name="close-circle" size={14} color="#fff" />
              <Text style={styles.deactivateButtonText}>DEACTIVATE ({selectedForActivation.size})</Text>
            </TouchableOpacity>
          )}
          {selectedForActivation.size > 0 && getSelectedMembersStatus() !== 'all-active' && (
            <TouchableOpacity
              style={styles.activateButtonOverlay}
              onPress={handleBulkActivate}
            >
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.activateButtonText}>ACTIVATE ({selectedForActivation.size})</Text>
            </TouchableOpacity>
          )}
          {selectedForActivation.size === 0 && (
            <TouchableOpacity
              style={styles.deactivateButtonOverlay}
              onPress={handleDeactivateAllActive}
            >
              <Ionicons name="power" size={14} color="#fff" />
              <Text style={styles.deactivateButtonText}>DEACTIVATE</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.importButtonOverlay}
            onPress={() => router.push('/(admin)/import-members')}
          >
            <Ionicons name="cloud-upload" size={14} color="#fff" />
            <Text style={styles.importButtonText}>BULK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButtonOverlay}
            onPress={handleAddNewMemberClick}
          >
            <Text style={styles.addButtonText}>ADD</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search players..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.trim() !== '' && (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterTitleDisplayCard}>
        <Text style={styles.filterTitleDisplayText}>{getFilterTitle()}</Text>
      </View>

      <FlatList
        data={getFilteredMembers()}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <PlayerCard
            member={item}
            isAdmin={true}
            onPress={() => handleEditMember(item)}
            onDelete={() => handleDeleteMember(item.id)}
            showCheckbox={true}
            isSelected={selectedForActivation.has(item.id)}
            onCheckboxPress={() => handleToggleBulkSelect(item.id)}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No players found</Text>}
      />

      <PlayerEditModal
        visible={modalVisible}
        member={editingMember}
        onClose={() => {
          console.log('[AdminPlayers] Closing modal');
          setModalVisible(false);
          setEditingMember(null);
        }}
        onSave={handleSavePlayer}
        isLimitedMode={false}
      />
      <AdminFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customHeaderWrapper: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 145,
    zIndex: 1000,
    backgroundColor: '#003366',
  },
  headerTop: {
    backgroundColor: '#003366',
    paddingHorizontal: 16,
    paddingTop: 62,
    paddingBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },

  filterButtonsRow: {
    display: 'none' as 'none',
  },
  filterButton: {
    display: 'none' as 'none',
  },
  filterButtonActive: {
    display: 'none' as 'none',
  },
  filterButtonText: {
    display: 'none' as 'none',
  },
  filterButtonTextActive: {
    display: 'none' as 'none',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#003366',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#5BA3FF',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBoxActive: {
    backgroundColor: '#003D99',
  },
  statNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 7,
    color: '#fff',
    marginTop: 1,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderColor: '#ddd',
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#1a1a1a',
  },
  clearButton: {
    padding: 4,
  },
  filterTitleCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#a0a0a0',
    borderBottomWidth: 1,
    borderBottomColor: '#888',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 150,
  },
  filterTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  filterTitleDisplayCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#a0a0a0',
    borderBottomWidth: 1,
    borderBottomColor: '#888',
  },
  filterTitleDisplayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 5,
    flex: 1,
  },
  importButtonOverlay: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    flex: 1,
  },
  importButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  addButtonOverlay: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    flex: 1,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  activateButtonOverlay: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    flex: 1,
  },
  activateButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  deactivateButtonOverlay: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#d32f2f',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    flex: 1,
  },
  deactivateButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
