import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { Member } from '@/types';
import { PlayerCard } from '@/components/PlayerCard';
import { PlayerEditModal } from '@/components/PlayerEditModal';
import { PlayerHistoricalRecordsModal } from '@/components/PlayerHistoricalRecordsModal';


export default function MembersScreen() {
  const { currentUser: authUser, members: allMembersFromContext, updateMember: updateMemberFromContext } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'members' | 'non-members' | 'guests' | 'local' | 'outofstate'>('all');
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showFullEditModal, setShowFullEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyMember, setHistoryMember] = useState<Member | null>(null);


  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Members] Loading members from AuthContext...');

      const allMembersFromAuth = allMembersFromContext || [];
      
      console.log(`[Members] Loaded ${allMembersFromAuth.length} members from backend`);
      
      const seenIds = new Set<string>();
      const dedupedData = allMembersFromAuth.filter(m => {
        if (seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        if (m.membershipType === 'guest' && m.id.startsWith('guest_')) {
          console.log('[Members] Filtering out custom guest (event-specific):', m.name, m.id);
          return false;
        }
        return true;
      });
      
      const sorted = dedupedData.sort((a, b) => a.name.localeCompare(b.name));
      setMembers(sorted);
      console.log(`[Members] Set ${sorted.length} members to state`);

      if (authUser) {
        const currentMember = sorted.find(m => m.id === authUser.id);
        if (currentMember) {
          setCurrentUser(currentMember);
          console.log('[Members] Current user found:', currentMember.name);
        }
      }

      if (sorted.length === 0) {
        setError('No members found. Try importing or adding members first.');
      }
    } catch (error) {
      console.error('[Members] Error loading members:', error);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [authUser, allMembersFromContext]);

  const getFilteredMembers = useMemo(() => {
    console.log('[Members] Filtering members...');
    const localStatesArray = ['', 'MD', 'VA', 'PA', 'NJ', 'DE'];
    let result = members;
    
    if (filterType === 'members') {
      result = result.filter(m => m.membershipType === 'active');
    } else if (filterType === 'non-members') {
      result = result.filter(m => m.membershipType === 'in-active');
    } else if (filterType === 'guests') {
      result = result.filter(m => m.membershipType === 'guest');
    } else if (filterType === 'local') {
      result = result.filter(m => localStatesArray.includes(m.state || ''));
    } else if (filterType === 'outofstate') {
      result = result.filter(m => !localStatesArray.includes(m.state || ''));
    }
    
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(member => member.name.toLowerCase().includes(searchLower));
    }
    
    return result;
  }, [members, filterType, searchText]);

  useFocusEffect(
    useCallback(() => {
      console.log('[Members] Screen focused, reloading members');
      loadMembers();
    }, [loadMembers])
  );

  const handleSaveCurrentUser = useCallback(async (updatedMember: Member) => {
    try {
      console.log('[Members] Saving current user profile:', updatedMember.name);
      console.log('[Members] Board member roles:', updatedMember.boardMemberRoles);
      
      await updateMemberFromContext(updatedMember.id, updatedMember);
      
      console.log('[Members] Update complete, updating local state');
      setCurrentUser(updatedMember);
      
      console.log('[Members] Current user profile saved successfully');
    } catch (error) {
      console.error('[Members] Error saving current user profile:', error);
      throw error;
    }
  }, [updateMemberFromContext]);

  const handleSaveMember = useCallback(async (updatedMember: Member) => {
    try {
      console.log('[Members] Saving member:', updatedMember.name);
      console.log('[Members] Board member roles:', updatedMember.boardMemberRoles);
      
      await updateMemberFromContext(updatedMember.id, updatedMember);
      
      console.log('[Members] Member saved successfully');
    } catch (error) {
      console.error('[Members] Error saving member:', error);
      throw error;
    }
  }, [updateMemberFromContext]);

  const handleCardPress = (member: Member) => {
    if (authUser?.isAdmin) {
      console.log('[Members] Admin tapped card:', member.name);
      setSelectedMember(member);
      setShowFullEditModal(true);
    }
  };

  const handleHistoryPress = (member: Member) => {
    console.log('[Members] Opening history for:', member.name);
    setHistoryMember(member);
    setShowHistoryModal(true);
  };



  const getFilterTitle = () => {
    switch (filterType) {
      case 'members':
        return 'Active Members';
      case 'non-members':
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
    <>
      <Stack.Screen
        options={{
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '700',
          },
        }}
      />
      <View style={styles.container}>
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh-circle" size={48} color="#999" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      ) : members.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No Members Yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Import members from CSV or add them individually from Admin
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.statsHeader}>
            <View style={styles.statsRow}>
              <TouchableOpacity style={[styles.statBox, filterType === 'all' && styles.statBoxActive]} onPress={() => setFilterType('all')}>
                <Text style={styles.statNumber}>{totalPlayers}</Text>
                <Text style={styles.statLabel}>Players</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statBox, filterType === 'members' && styles.statBoxActive]} onPress={() => setFilterType('members')}>
                <Text style={styles.statNumber}>{activeMembers}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.statBox, filterType === 'non-members' && styles.statBoxActive]} onPress={() => setFilterType('non-members')}>
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

          {currentUser && (
            <View style={styles.currentUserSection}>
              <View style={styles.currentUserHeader}>
                <Text style={styles.currentUserLabel}>My Profile</Text>
              </View>
              <TouchableOpacity 
                onPress={authUser?.isAdmin ? () => handleCardPress(currentUser) : undefined}
                activeOpacity={authUser?.isAdmin ? 0.7 : 1}
                disabled={!authUser?.isAdmin}
              >
                <PlayerCard
                  member={currentUser}
                  isAdmin={authUser?.isAdmin || false}
                  isCurrentUser={true}
                  onEdit={() => setShowEditModal(true)}
                  onHistoryPress={() => handleHistoryPress(currentUser)}
                />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search members..."
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

          <View style={styles.filterTitleCard}>
            <Text style={styles.filterTitleText}>{getFilterTitle()}</Text>
          </View>

          <FlatList
            data={getFilteredMembers}
            keyExtractor={(item) => item.id}
            style={styles.flatList}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <PlayerCard
                member={item}
                isAdmin={authUser?.isAdmin || false}
                onPress={authUser?.isAdmin ? () => handleCardPress(item) : undefined}
                onHistoryPress={() => handleHistoryPress(item)}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No members found.</Text>}
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </>
      )}
    </View>

    <PlayerEditModal
      visible={showEditModal}
      member={currentUser}
      onClose={() => setShowEditModal(false)}
      onSave={handleSaveCurrentUser}
      isLimitedMode={true}
    />

    <PlayerEditModal
      visible={showFullEditModal}
      member={selectedMember}
      onClose={() => {
        setShowFullEditModal(false);
        setSelectedMember(null);
      }}
      onSave={handleSaveMember}
      isLimitedMode={false}
    />

    <PlayerHistoricalRecordsModal
      visible={showHistoryModal}
      member={historyMember}
      onClose={() => {
        setShowHistoryModal(false);
        setHistoryMember(null);
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe6e6',
    padding: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#FF3B30',
    marginLeft: 8,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#999',
  },
  statsHeader: {
    backgroundColor: '#4a4a4a',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    color: '#fff',
    marginBottom: 8,
  },
  filterButtonsRow: {
    display: 'none',
  },
  filterButton: {
    display: 'none',
  },
  filterButtonActive: {
    display: 'none',
  },
  filterButtonText: {
    display: 'none',
  },
  filterButtonTextActive: {
    display: 'none',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#5BA3FF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBoxActive: {
    backgroundColor: '#003D99',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 8,
    color: '#fff',
    marginTop: 1,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
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

  flatList: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  filterTitleCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#a0a0a0',
    borderBottomWidth: 1,
    borderBottomColor: '#888',
  },
  filterTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ccc',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  currentUserSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#4a4a4a',
  },
  currentUserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentUserLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
