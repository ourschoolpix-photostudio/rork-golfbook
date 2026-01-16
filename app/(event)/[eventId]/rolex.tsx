import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { authService } from '@/utils/auth';
import { PlayerEditModal } from '@/components/PlayerEditModal';
import { EventFooter } from '@/components/EventFooter';
import { Trophy, Award, X } from 'lucide-react-native';
import { Member, User, Event } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/utils/supabaseService';
import { truncateToTwoDecimals } from '@/utils/numberUtils';
import { useSettings } from '@/contexts/SettingsContext';
import {
  getDisplayHandicap,
  calculateTournamentFlight,
  getHandicapLabel,
} from '@/utils/handicapHelper';

export default function EventRolexScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = eventId || '';
  const [members, setMembers] = useState<Member[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'tournament' | 'rolex'>('tournament');
  const [useCourseHandicap, setUseCourseHandicap] = useState<boolean>(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const { orgInfo } = useSettings();

  const queryClient = useQueryClient();
  
  const { data: eventData, refetch: refetchEvent } = useQuery({
    queryKey: ['events', id],
    queryFn: () => supabaseService.events.get(id),
    enabled: !!id,
  });
  
  const { data: allMembers = [], refetch: refetchMembers } = useQuery({
    queryKey: ['members'],
    queryFn: () => supabaseService.members.getAll(),
  });
  
  const { data: eventScores = [], refetch: refetchScores } = useQuery({
    queryKey: ['scores', id],
    queryFn: () => supabaseService.scores.getAll(id),
    enabled: !!id,
  });
  
  const { data: eventRegistrations = [], refetch: refetchRegistrations } = useQuery({
    queryKey: ['registrations', id],
    queryFn: () => supabaseService.registrations.getAll(id),
    enabled: !!id,
  });
  
  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, updates }: { memberId: string; updates: Partial<Member> }) =>
      supabaseService.members.update(memberId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });

  const checkCurrentUser = async () => {
    const user = await authService.getCurrentUser();
    setCurrentUser(user);
  };

  useEffect(() => {
    const loadCourseHandicapSetting = async () => {
      if (id) {
        try {
          const key = `useCourseHandicap_${id}`;
          const value = await AsyncStorage.getItem(key);
          if (value !== null) {
            setUseCourseHandicap(value === 'true');
            console.log('[rolex] Loaded course handicap setting:', value === 'true');
          }
        } catch (error) {
          console.error('[rolex] Error loading course handicap setting:', error);
        }
      }
    };
    loadCourseHandicapSetting();
    
    const interval = setInterval(loadCourseHandicapSetting, 500);
    return () => clearInterval(interval);
  }, [id]);

  const loadMembers = useCallback(async () => {
    if (!id || !eventData) return;

    try {
      console.log('[rolex] 🔄 loadMembers() called with eventId:', id);
      console.log('[rolex] 📋 Found event:', eventData.name, 'with', eventData.registeredPlayers?.length, 'registered players');
      setEvent(eventData as Event);

      if (!eventData.registeredPlayers || eventData.registeredPlayers.length === 0) {
        setMembers([]);
        return;
      }

      const eventMembers = (eventData.registeredPlayers || [])
        .map((playerId: string) => (allMembers as Member[]).find((m: Member) => m.id === playerId))
        .filter((m: Member | undefined): m is Member => Boolean(m) && m?.membershipType === 'active');

      const numberOfDays = eventData.numberOfDays || 1;
      console.log('[rolex] 📊 Event has', numberOfDays, 'days');

      const registrationMap: Record<string, any> = {};
      eventRegistrations.forEach((reg: any) => {
        registrationMap[reg.memberId] = reg;
      });

      const enrichedMembers = eventMembers.map((player: Member) => {
        const playerReg: any = registrationMap[player.id];
        
        // Use the centralized utility to get the effective handicap
        const effectiveHandicap = getDisplayHandicap(player, playerReg, eventData as Event, useCourseHandicap, 1);
        
        // Calculate flight using the effective handicap
        const calculatedFlight = calculateTournamentFlight(
          player,
          Number(eventData.flightACutoff) || undefined,
          Number(eventData.flightBCutoff) || undefined,
          playerReg,
          eventData as Event,
          useCourseHandicap,
          1
        );

        console.log(`[rolex] 🎯 Player ${player.name}: base handicap=${player.handicap}, adjusted=${playerReg?.adjustedHandicap}, effective=${effectiveHandicap}, flight=${calculatedFlight}`);

        const playerScores = eventScores.filter((s: any) => s.memberId === player.id);
        const grandTotal = playerScores.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0);
        const grandNet = grandTotal - (numberOfDays * effectiveHandicap);

        console.log(`[rolex] Player ${player.name}: grandTotal=${grandTotal}, effectiveHandicap=${effectiveHandicap}, grandNet=${grandNet}`);

        if (grandTotal > 0) {
          return {
            ...player,
            handicap: effectiveHandicap,
            scoreTotal: grandTotal,
            scoreNet: grandNet,
            flight: calculatedFlight,
          };
        }

        return {
          ...player,
          handicap: effectiveHandicap,
          scoreNet: 0,
          flight: calculatedFlight,
        };
      });

      console.log('[rolex] Enriched members with scores:', enrichedMembers.map((m: any) => ({ name: m.name, id: m.id, scoreTotal: m.scoreTotal, flight: m.flight })));

      const sorted = enrichedMembers.sort((a: any, b: any) => {
        const aIsActive = a.membershipType === 'active';
        const bIsActive = b.membershipType === 'active';

        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;

        const aIsUnscored = (a.scoreTotal === undefined || a.scoreTotal === null);
        const bIsUnscored = (b.scoreTotal === undefined || b.scoreTotal === null);

        if (aIsUnscored && bIsUnscored) return 0;
        
        if (aIsUnscored) return 1;
        
        if (bIsUnscored) return -1;
        
        return (a.scoreNet || 0) - (b.scoreNet || 0);
      });

      console.log('[rolex] Final sorted members:', sorted.map((m: any) => ({ 
        name: m.name, 
        flight: m.flight,
        scoreNet: m.scoreNet 
      })));

      setMembers(sorted.map((m: any) => ({
        ...m,
        flight: (m.flight === 'A' || m.flight === 'B' || m.flight === 'C' || m.flight === 'L') ? m.flight as ('A' | 'B' | 'C' | 'L') : undefined
      })) as Member[]);
    } catch (error) {
      console.error('Error loading event members:', error);
    }
  }, [id, eventData, allMembers, eventScores, eventRegistrations, useCourseHandicap]);

  useFocusEffect(
    useCallback(() => {
      console.log('[rolex] 🎯 Page FOCUSED - reloading members (eventId:', id, ')');
      refetchEvent();
      refetchMembers();
      refetchScores();
      refetchRegistrations();
      checkCurrentUser();
    }, [id, refetchEvent, refetchMembers, refetchScores, refetchRegistrations])
  );

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  console.log('[rolex] 📊 Current registrations:', eventRegistrations.map((r: any) => ({ memberId: r.memberId, playerName: r.playerName, adjustedHandicap: r.adjustedHandicap })));
  console.log('[rolex] 📊 Current members:', members.map(m => ({ name: m.name, flight: m.flight, handicap: m.handicap })));

  const handleMemberPress = (member: Member) => {
    if (currentUser?.isAdmin) {
      setSelectedMember(member);
      setEditModalVisible(true);
    }
  };

  const handleSaveQuickEdit = async (updatedMember: Member) => {
    try {
      await updateMemberMutation.mutateAsync({ 
        memberId: updatedMember.id, 
        updates: updatedMember 
      });
      await loadMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      throw error;
    }
  };

  const handleDistributePoints = async () => {
    if (!event || !currentUser) return;

    if (!currentUser.isAdmin) {
      Alert.alert('Permission Denied', 'Only admins can distribute rolex points.');
      return;
    }

    if (eventData?.rolexPointsDistributed) {
      Alert.alert(
        'Already Distributed',
        'Rolex points have already been distributed for this event. Clear them first if you need to redistribute.',
      );
      return;
    }

    const numberOfDays = event.numberOfDays || 1;
    const attendancePoints = parseInt(orgInfo.rolexAttendancePoints || '0');
    const rolexPlacementPoints = orgInfo.rolexPlacementPoints || [];

    const scoredMembers = members.filter(m => m.scoreTotal && m.scoreTotal > 0 && m.membershipType === 'active');

    if (scoredMembers.length === 0) {
      Alert.alert('No Scores', 'No players have completed scores yet.');
      return;
    }

    Alert.alert(
      'Distribute Rolex Points',
      `This will distribute rolex points to ${scoredMembers.length} players based on their net scores. Points will be added to their global rolex points and saved as historical records. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Distribute',
          onPress: async () => {
            try {
              setIsDistributing(true);
              console.log('[rolex] Starting point distribution...');

              const pointsData = scoredMembers.map((member, index) => {
                const rank = index + 1;
                const placementPoints = parseInt(rolexPlacementPoints[rank - 1] || '0');
                const totalPoints = (attendancePoints + placementPoints) * numberOfDays;

                console.log(`[rolex] ${member.name}: rank=${rank}, attendance=${attendancePoints}, placement=${placementPoints}, days=${numberOfDays}, total=${totalPoints}`);

                return {
                  memberId: member.id,
                  rank,
                  attendancePoints,
                  placementPoints,
                  totalPoints,
                };
              });

              await supabaseService.rolexPoints.distributePoints(
                id,
                currentUser.id,
                pointsData
              );

              await refetchEvent();
              await refetchMembers();

              Alert.alert(
                'Success',
                `Rolex points have been distributed to ${scoredMembers.length} players.`
              );

              console.log('[rolex] ✅ Points distributed successfully');
            } catch (error) {
              console.error('[rolex] Error distributing points:', error);
              Alert.alert(
                'Error',
                'Failed to distribute points. Please try again.'
              );
            } finally {
              setIsDistributing(false);
            }
          },
        },
      ]
    );
  };

  const handleClearPoints = async () => {
    if (!event || !currentUser) return;

    if (!currentUser.isAdmin) {
      Alert.alert('Permission Denied', 'Only admins can clear rolex points.');
      return;
    }

    if (!eventData?.rolexPointsDistributed) {
      Alert.alert('No Points', 'No rolex points have been distributed for this event yet.');
      return;
    }

    Alert.alert(
      'Clear Rolex Points',
      'This will remove all rolex points that were distributed for this event. The points will be subtracted from players\' global rolex points. This action should only be used to fix mistakes. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDistributing(true);
              console.log('[rolex] Clearing point distribution for event:', id);

              await supabaseService.rolexPoints.clearPoints(id);

              console.log('[rolex] Clear completed, refetching data...');
              await refetchEvent();
              await refetchMembers();

              Alert.alert('Success', 'Rolex points have been cleared.');

              console.log('[rolex] ✅ Points cleared successfully');
            } catch (error: any) {
              console.error('[rolex] Error clearing points:', error);
              const errorMessage = error?.message || 'Unknown error';
              Alert.alert(
                'Error',
                `Failed to clear points: ${errorMessage}`
              );
            } finally {
              setIsDistributing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TOURNAMENT LEADERBOARD</Text>
        </View>

        {event && event.photoUrl && (
          <View style={styles.eventPhotoContainer}>
            <Image source={{ uri: event.photoUrl }} style={styles.eventPhoto} />
            <Text style={styles.eventNameOverlay}>{event.name}</Text>
            <View style={styles.bottomInfoOverlay}>
              <Text style={styles.eventLocationOverlay}>{event.location}</Text>
              <Text style={styles.eventDateOverlay}>
                {event.date}
                {event.endDate && event.endDate !== event.date && event.endDate !== '' ? ` - ${event.endDate}` : ''}
              </Text>
            </View>
          </View>
        )}

        {currentUser && currentUser.isAdmin && (
          <View style={styles.adminButtonsContainer}>
            {eventData?.rolexPointsDistributed ? (
              <View style={styles.distributedBanner}>
                <Award size={20} color="#4CAF50" />
                <Text style={styles.distributedText}>Points Distributed</Text>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearPoints}
                  disabled={isDistributing}
                >
                  {isDistributing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <X size={16} color="#fff" />
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.distributeButton}
                onPress={handleDistributePoints}
                disabled={isDistributing}
              >
                {isDistributing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Award size={20} color="#fff" />
                    <Text style={styles.distributeButtonText}>Distribute Rolex Points</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              styles.toggleButtonLeft,
              viewMode === 'tournament' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('tournament')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                viewMode === 'tournament' && styles.toggleButtonTextActive,
              ]}
            >
              Tournament
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              styles.toggleButtonRight,
              viewMode === 'rolex' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('rolex')}
          >
            <Text
              style={[
                styles.toggleButtonText,
                viewMode === 'rolex' && styles.toggleButtonTextActive,
              ]}
            >
              Rolex Points
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={(() => {
            if (viewMode === 'rolex') {
              return members.filter(m => m.membershipType === 'active');
            }
            
            const flights = ['A', 'B', 'C', 'D', 'E', 'F'];
            const grouped: (Member | { type: 'separator'; flight: string })[] = [];
            
            flights.forEach(flight => {
              const flightMembers = members.filter(m => m.flight === flight);
              if (flightMembers.length > 0) {
                grouped.push({ type: 'separator', flight });
                grouped.push(...flightMembers);
              }
            });
            
            const noFlightMembers = members.filter(m => !m.flight);
            if (noFlightMembers.length > 0) {
              grouped.push({ type: 'separator', flight: 'Unassigned' });
              grouped.push(...noFlightMembers);
            }
            
            return grouped;
          })()}
          keyExtractor={(item) => 'type' in item ? `separator-${item.flight}` : item.id}
          contentContainerStyle={[styles.listContent, { paddingTop: 12 }]}
          renderItem={({ item, index }) => {
            if ('type' in item && item.type === 'separator') {
              return (
                <View style={styles.flightSeparator}>
                  <Text style={styles.flightSeparatorText}>Flight {item.flight}</Text>
                </View>
              );
            }
            const player = item as Member;
            
            let rank: number;
            let isLeader: boolean;
            let showTrophy = false;
            let trophyColor = '#FF3B30';
            
            if (viewMode === 'rolex') {
              rank = index + 1;
              isLeader = rank === 1;
            } else {
              const currentFlight = player.flight;
              const flightMembers = members.filter(m => m.flight === currentFlight);
              const flightIndex = flightMembers.findIndex(m => m.id === player.id);
              rank = flightIndex + 1;
              isLeader = rank === 1;
              
              if (event && currentFlight) {
                if (currentFlight === 'A') {
                  if (rank === 1 && event.flightATrophy1st) {
                    showTrophy = true;
                    trophyColor = '#FF8C00';
                  } else if (rank === 2 && event.flightATrophy2nd) {
                    showTrophy = true;
                    trophyColor = '#87CEEB';
                  } else if (rank === 3 && event.flightATrophy3rd) {
                    showTrophy = true;
                    trophyColor = '#D2B48C';
                  }
                } else if (currentFlight === 'B') {
                  if (rank === 1 && event.flightBTrophy1st) {
                    showTrophy = true;
                    trophyColor = '#FF8C00';
                  } else if (rank === 2 && event.flightBTrophy2nd) {
                    showTrophy = true;
                    trophyColor = '#87CEEB';
                  } else if (rank === 3 && event.flightBTrophy3rd) {
                    showTrophy = true;
                    trophyColor = '#D2B48C';
                  }
                } else if (currentFlight === 'C') {
                  if (rank === 1 && event.flightCTrophy1st) {
                    showTrophy = true;
                    trophyColor = '#FF8C00';
                  } else if (rank === 2 && event.flightCTrophy2nd) {
                    showTrophy = true;
                    trophyColor = '#87CEEB';
                  } else if (rank === 3 && event.flightCTrophy3rd) {
                    showTrophy = true;
                    trophyColor = '#D2B48C';
                  }
                } else if (currentFlight === 'L') {
                  if (rank === 1 && event.flightLTrophy1st) {
                    showTrophy = true;
                    trophyColor = '#FF8C00';
                  } else if (rank === 2 && event.flightLTrophy2nd) {
                    showTrophy = true;
                    trophyColor = '#87CEEB';
                  } else if (rank === 3 && event.flightLTrophy3rd) {
                    showTrophy = true;
                    trophyColor = '#D2B48C';
                  }
                }
              }
            }

            const playerReg = eventRegistrations.find((r: any) => r.memberId === player.id);
            const rolexFlight = player.rolexFlight || player.flight;
            
            return (
              <TouchableOpacity
                onPress={() => handleMemberPress(player)}
                activeOpacity={currentUser?.isAdmin ? 0.7 : 1}
                disabled={!currentUser?.isAdmin}
              >
              <View style={[
                styles.rankCard,
                viewMode === 'rolex' && rank === 1 && { backgroundColor: '#FFFACD', borderLeftColor: '#FFD700', borderLeftWidth: 6 },
                viewMode === 'rolex' && rank === 2 && { backgroundColor: '#F0F8FF', borderLeftColor: '#C0C0C0', borderLeftWidth: 6 },
                viewMode === 'rolex' && rank === 3 && { backgroundColor: '#FFF8DC', borderLeftColor: '#CD7F32', borderLeftWidth: 6 },
                viewMode === 'tournament' && (isLeader || showTrophy) && styles.rankCardLeader,
              ]}>
                {viewMode === 'rolex' ? (
                  <View style={[
                    styles.positionBadge,
                    (rank === 1 || rank === 2 || rank === 3) && { backgroundColor: 'transparent' },
                  ]}>
                    {rank === 1 ? (
                      <Trophy size={56} color="#FFD700" strokeWidth={2.5} />
                    ) : rank === 2 ? (
                      <Trophy size={48} color="#C0C0C0" strokeWidth={2.5} />
                    ) : rank === 3 ? (
                      <Trophy size={48} color="#CD7F32" strokeWidth={2.5} />
                    ) : (
                      <Text style={styles.positionText}>#{rank}</Text>
                    )}
                  </View>
                ) : (
                  showTrophy ? (
                    <View style={styles.trophyContainer}>
                      <Trophy size={44} color={trophyColor} />
                    </View>
                  ) : isLeader ? (
                    <View style={styles.trophyContainer}>
                      <Trophy size={44} color="#FF3B30" />
                    </View>
                  ) : (
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>#{rank}</Text>
                    </View>
                  )
                )}
                <View style={styles.playerInfo}>
                  <Text style={[
                    styles.playerName,
                    viewMode === 'tournament' && (isLeader || showTrophy) && styles.playerNameLeader
                  ]}>
                    {player.name}
                  </Text>
                  <Text style={[
                    styles.playerHandicap,
                    viewMode === 'tournament' && (isLeader || showTrophy) && styles.playerHandicapLeader
                  ]}>
                    {`${getHandicapLabel(player, playerReg, useCourseHandicap, event || undefined, 1)} ${player.handicap}`}
                  </Text>
                  {viewMode === 'rolex' ? (
                    <>
                      {rolexFlight && (
                        <Text style={styles.playerDetails}>
                          Rolex Flight: {rolexFlight}
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      {player.flight && (
                        <Text style={[
                          styles.playerFlight,
                          (isLeader || showTrophy) && styles.playerFlightLeader
                        ]}>
                          Flight: {player.flight}
                        </Text>
                      )}
                      <Text style={[
                        styles.playerScore,
                        (isLeader || showTrophy) && styles.playerScoreLeader
                      ]}>
                        Total: {player.scoreTotal || '—'}
                      </Text>
                      <Text style={[
                        styles.playerScore,
                        (isLeader || showTrophy) && styles.playerScoreLeader
                      ]}>
                        Net Score: {player.scoreNet ? truncateToTwoDecimals(player.scoreNet) : '—'}
                      </Text>
                    </>
                  )}
                </View>
                {viewMode === 'rolex' ? (
                  <View style={styles.rolexPointsContainer}>
                    <Text style={styles.rolexPointsValue}>{player.rolexPoints || 0}</Text>
                    <Text style={styles.rolexLabel}>rolex pts</Text>
                  </View>
                ) : (
                  <View style={styles.pointsContainer}>
                    <Text style={[styles.points, (isLeader || showTrophy) && styles.pointsLeader]}>
                      {player.rolexPoints || 0}
                    </Text>
                    <Text style={styles.pointsLabel}>pts</Text>
                  </View>
                )}
              </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active members registered</Text>
          }
        />
      </SafeAreaView>

      <EventFooter />

      <PlayerEditModal
        visible={editModalVisible}
        member={selectedMember}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveQuickEdit}
        quickEditMode={true}
      />
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
    paddingVertical: 16,
    paddingTop: 58,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  rankCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rankCardLeader: {
    backgroundColor: '#FFFBF0',
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  positionBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  positionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trophyContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 8,
  },
  playerNameLeader: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  playerHandicap: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  playerHandicapLeader: {
    color: '#996600',
    fontWeight: '600',
  },
  playerDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  playerFlight: {
    fontSize: 13,
    color: '#666',
  },
  playerFlightLeader: {
    color: '#996600',
    fontWeight: '600',
  },
  playerScore: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  playerScoreLeader: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  rolexPointsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolexNetValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFB300',
  },
  rolexPointsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFB300',
  },
  rolexLabel: {
    fontSize: 12,
    color: '#999',
  },
  pointsContainer: {
    alignItems: 'center',
  },
  points: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFB800',
  },
  pointsLeader: {
    fontSize: 24,
  },
  pointsLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  flightSeparator: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  flightSeparatorText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#7f7f7f',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventPhotoContainer: {
    position: 'relative',
    width: '100%',
    height: 100,
  },
  eventPhoto: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  eventNameOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  eventLocationOverlay: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  eventDateOverlay: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 0,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toggleButtonLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  toggleButtonRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#1B5E20',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  adminButtonsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  distributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  distributeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  distributedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  distributedText: {
    flex: 1,
    marginLeft: 8,
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
