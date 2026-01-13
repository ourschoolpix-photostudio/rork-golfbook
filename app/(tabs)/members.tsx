import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { Member } from '@/types';
import { PlayerCard } from '@/components/PlayerCard';
import { PlayerEditModal } from '@/components/PlayerEditModal';
import { PlayerHistoricalRecordsModal } from '@/components/PlayerHistoricalRecordsModal';
import { MembershipRenewalModal } from '@/components/MembershipRenewalModal';
import { MemberListingModal } from '@/components/MemberListingModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsiblePlayerCardProps {
  member: Member;
  isAdmin: boolean;
  currentUser: Member | null;
  onPress?: () => void;
  onHistoryPress: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const CollapsiblePlayerCard = React.memo(function CollapsiblePlayerCard({
  member,
  isAdmin,
  currentUser,
  onPress,
  onHistoryPress,
  isExpanded,
  onToggle,
}: CollapsiblePlayerCardProps) {
  const getLocationBadgeColor = () => {
    const localStates = ['', 'MD', 'VA', 'PA', 'NJ', 'DE'];
    const isLocal = localStates.includes(member.state || '');
    return isLocal ? '#007AFF' : '#FF9500';
  };

  const getLocationBadge = () => {
    const localStates = ['', 'MD', 'VA', 'PA', 'NJ', 'DE'];
    const isLocal = localStates.includes(member.state || '');
    return isLocal ? 'Local' : 'Visitor';
  };

  const getMemberStatusColor = (type: string, level?: string) => {
    if (type === 'active') {
      if (level === 'basic') return '#FF9500';
      return '#4CAF50';
    }
    if (type === 'in-active') return '#FF3B30';
    if (type === 'guest') return '#1a1a1a';
    return '#007AFF';
  };

  if (isExpanded) {
    return (
      <View style={collapsibleStyles.expandedContainer}>
        <TouchableOpacity style={collapsibleStyles.collapseHeader} onPress={onToggle} activeOpacity={0.7}>
          <ChevronDown size={20} color="#666" />
          <Text style={collapsibleStyles.collapseHeaderText}>Tap to collapse</Text>
        </TouchableOpacity>
        <PlayerCard
          member={member}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onPress={onPress}
          onHistoryPress={onHistoryPress}
        />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={collapsibleStyles.collapsedCard}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={collapsibleStyles.collapsedContent}>
        <ChevronRight size={18} color="#999" />
        <View style={collapsibleStyles.collapsedInfo}>
          <Text style={collapsibleStyles.collapsedName}>{member.name}</Text>
          <View style={collapsibleStyles.collapsedBadges}>
            <View style={[collapsibleStyles.statusDot, { backgroundColor: getMemberStatusColor(member.membershipType || '', member.membershipLevel) }]} />
            <Text style={collapsibleStyles.collapsedHandicap}>HCP: {member.handicap || 'N/A'}</Text>
            {member.adjustedHandicap && (
              <Text style={collapsibleStyles.collapsedAdjusted}>({member.adjustedHandicap})</Text>
            )}
          </View>
        </View>
      </View>
      <View style={[collapsibleStyles.locationBadge, { backgroundColor: getLocationBadgeColor() }]}>
        <Text style={collapsibleStyles.locationBadgeText}>{getLocationBadge()}</Text>
      </View>
    </TouchableOpacity>
  );
});

const collapsibleStyles = StyleSheet.create({
  expandedContainer: {
    marginBottom: 12,
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8e8e8',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    gap: 6,
  },
  collapseHeaderText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500' as const,
  },
  collapsedCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  collapsedInfo: {
    flex: 1,
  },
  collapsedName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  collapsedBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  collapsedHandicap: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500' as const,
  },
  collapsedAdjusted: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600' as const,
  },
  locationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
});

export default function MembersScreen() {
  const { currentUser: authUser, members: allMembersFromContext, updateMember: updateMemberFromContext, refreshMembers } = useAuth();
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
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);


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
      console.log('[Members] Screen focused, loading members...');
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

  const handleRenewMembership = useCallback(() => {
    console.log('[Members] Opening membership renewal modal');
    setShowRenewalModal(true);
  }, []);

  const handleEditProfileTap = useCallback(() => {
    if (currentUser?.membershipType === 'in-active') {
      Alert.alert(
        'Profile Editing Prohibited',
        'Editing your profile is prohibited for non-active members. Would you like to renew your membership?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('[Members] User cancelled profile edit'),
          },
          {
            text: 'Renew Membership',
            onPress: () => {
              console.log('[Members] User chose to renew membership');
              handleRenewMembership();
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      setShowEditModal(true);
    }
  }, [currentUser, handleRenewMembership]);

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

  const toggleCardExpansion = useCallback((memberId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  }, []);

  const handleManualRefresh = useCallback(async () => {
    try {
      console.log('[Members] Manual refresh triggered');
      setIsRefreshing(true);
      setError(null);
      await refreshMembers();
      console.log('[Members] Manual refresh complete');
    } catch (error) {
      console.error('[Members] Error during manual refresh:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Refresh failed: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshMembers]);



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
          headerRight: () => (
            <TouchableOpacity
              onPress={handleManualRefresh}
              disabled={isRefreshing}
              style={{
                marginRight: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: '#007AFF',
                borderRadius: 6,
                opacity: isRefreshing ? 0.5 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                Refresh Data
              </Text>
            </TouchableOpacity>
          ),
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
                  currentUser={authUser}
                  onEdit={handleEditProfileTap}
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
            {authUser?.isAdmin && (
              <TouchableOpacity
                style={styles.listingButton}
                onPress={() => setShowListingModal(true)}
              >
                <Ionicons name="list-outline" size={16} color="#fff" />
                <Text style={styles.listingButtonText}>Export</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={getFilteredMembers}
            keyExtractor={(item) => item.id}
            style={styles.flatList}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <CollapsiblePlayerCard
                member={item}
                isAdmin={authUser?.isAdmin || false}
                currentUser={authUser || null}
                onPress={authUser?.isAdmin ? () => handleCardPress(item) : undefined}
                onHistoryPress={() => handleHistoryPress(item)}
                isExpanded={expandedCards.has(item.id)}
                onToggle={() => toggleCardExpansion(item.id)}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No members found.</Text>}
            removeClippedSubviews={false}
            initialNumToRender={15}
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

    {currentUser && (
      <MembershipRenewalModal
        visible={showRenewalModal}
        member={currentUser}
        onClose={() => setShowRenewalModal(false)}
      />
    )}

    <MemberListingModal
      visible={showListingModal}
      onClose={() => setShowListingModal(false)}
      members={members}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  listingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  listingButtonText: {
    fontSize: 12,
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
