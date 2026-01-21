import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Alert } from '@/utils/alertPolyfill';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, Grid3x3, Target, Award, DollarSign, LayoutGrid, Upload } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { OfflineModeToggle } from '@/components/OfflineModeToggle';
import { useOfflineMode } from '@/contexts/OfflineModeContext';
import { EventStatusButton, EventStatus } from '@/components/EventStatusButton';
import { supabaseService } from '@/utils/supabaseService';
import { supabase } from '@/integrations/supabase/client';
import { canViewFinance } from '@/utils/rolePermissions';
import { calculateTournamentHandicap, addTournamentHandicapRecord } from '@/utils/tournamentHandicapHelper';
import type { TournamentHandicapRecord } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

type EventFooterProps = {
  showStartButton?: boolean;
  eventStatus?: EventStatus;
  onStatusChange?: (newStatus: EventStatus) => void | Promise<void>;
  isAdmin?: boolean;
  showRolexButtons?: boolean;
  onDistributePoints?: () => void | Promise<void>;
  onClearPoints?: () => void | Promise<void>;
  isDistributing?: boolean;
  isClearing?: boolean;
  pointsDistributed?: boolean;
  showSyncButton?: boolean;
  hideTopRowButtons?: boolean;
  showGroupingButtons?: boolean;
  onLoadByHDC?: () => void;
  onLoadByNetScores?: () => void;
  showSubmitButton?: boolean;
  onSubmit?: () => void | Promise<void>;
  isSubmitting?: boolean;
};

export function EventFooter({
  showStartButton = false,
  eventStatus = 'upcoming',
  onStatusChange,
  isAdmin = false,
  showRolexButtons = false,
  onDistributePoints,
  onClearPoints,
  isDistributing = false,
  isClearing = false,
  pointsDistributed = false,
  showSyncButton = false,
  hideTopRowButtons = false,
  showGroupingButtons = false,
  onLoadByHDC,
  onLoadByNetScores,
  showSubmitButton = false,
  onSubmit,
  isSubmitting = false,
}: EventFooterProps = {}) {
  const { shouldUseOfflineMode } = useOfflineMode();
  const router = useRouter();
  const pathname = usePathname();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [useCourseHandicap, setUseCourseHandicap] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const [hasOfflineScores, setHasOfflineScores] = useState(false);

  const [event, setEvent] = useState<any>(null);
  const isSocialEvent = event?.type === 'social';
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkForOfflineScores = async () => {
      if (!eventId) return;
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const scoreKeys = allKeys.filter(key => key.startsWith(`@golf_offline_scores_${eventId}_`));
        setHasOfflineScores(scoreKeys.length > 0);
      } catch (error) {
        console.error('[EventFooter] Error checking offline scores:', error);
      }
    };

    if (shouldUseOfflineMode && showSyncButton) {
      checkForOfflineScores();
      const interval = setInterval(checkForOfflineScores, 3000);
      return () => clearInterval(interval);
    } else {
      setHasOfflineScores(false);
    }
  }, [eventId, shouldUseOfflineMode, showSyncButton]);
  const calculateAndStoreTournamentHandicaps = async (eventId: string) => {
    try {
      console.log('[EventFooter] Calculating tournament handicaps for event:', eventId);
      
      const event = await supabaseService.events.get(eventId);
      const scores = await supabaseService.scores.getAll(eventId);
      
      if (!event || !scores || scores.length === 0) {
        console.log('[EventFooter] No event or scores found, skipping handicap calculation');
        return;
      }

      const numberOfDays = event.numberOfDays || 1;
      console.log('[EventFooter] ⚠️ Event details - numberOfDays:', numberOfDays, 'event.numberOfDays:', event.numberOfDays, 'eventName:', event.name);
      const memberScoresByDay: { [memberId: string]: { [day: number]: number } } = {};
      
      scores.forEach((score: any) => {
        if (!memberScoresByDay[score.memberId]) {
          memberScoresByDay[score.memberId] = {};
        }
        memberScoresByDay[score.memberId][score.day] = score.totalScore;
      });

      for (const memberId of Object.keys(memberScoresByDay)) {
        let totalScore = 0;
        let totalPar = 0;
        let completedDays = 0;

        for (let day = 1; day <= numberOfDays; day++) {
          const dayScore = memberScoresByDay[memberId][day];
          if (dayScore !== undefined) {
            totalScore += dayScore;
            completedDays++;

            const parKey = `day${day}Par` as keyof typeof event;
            const dayPar = event[parKey];
            if (dayPar) {
              totalPar += parseInt(dayPar as string, 10);
            }
          }
        }

        if (completedDays === numberOfDays && totalPar > 0) {
          console.log('[EventFooter] ========================================');
          console.log('[EventFooter] Member:', memberId);
          console.log('[EventFooter] totalScore:', totalScore);
          console.log('[EventFooter] totalPar:', totalPar);
          console.log('[EventFooter] numberOfDays:', numberOfDays);
          console.log('[EventFooter] completedDays:', completedDays);
          console.log('[EventFooter] Raw calculation: (', totalScore, '-', totalPar, ') /', numberOfDays, '=', (totalScore - totalPar) / numberOfDays);
          const handicap = calculateTournamentHandicap(totalScore, totalPar, numberOfDays);
          console.log('[EventFooter] ✅ Final calculated handicap:', handicap);
          console.log('[EventFooter] ========================================');
          
          const member = await supabaseService.members.get(memberId);
          if (member) {
            const existingRecords = (member.tournamentHandicaps || []) as TournamentHandicapRecord[];
            const newRecord: TournamentHandicapRecord = {
              eventId: event.id,
              eventName: event.name,
              score: totalScore,
              par: totalPar,
              handicap: handicap,
              date: event.date,
            };
            
            const updatedRecords = addTournamentHandicapRecord(existingRecords, newRecord);
            
            await supabaseService.members.update(memberId, {
              tournamentHandicaps: updatedRecords,
            });
            
            console.log('[EventFooter] Updated tournament handicap for member:', memberId, 'handicap:', handicap);
          }
        }
      }
      
      console.log('[EventFooter] ✅ Tournament handicaps calculated and stored');
    } catch (error) {
      console.error('[EventFooter] Error calculating tournament handicaps:', error);
    }
  };

  const handleSync = async () => {
    if (!eventId || !currentUser) {
      console.log('[EventFooter] Missing eventId or currentUser');
      return;
    }

    setIsSyncing(true);
    try {
      console.log('[EventFooter] 🔄 Starting offline scores sync for event:', eventId);
      
      let successCount = 0;
      let failCount = 0;
      const storagKeysToDelete: string[] = [];

      const allKeys = await AsyncStorage.getAllKeys();
      const scoreKeys = allKeys.filter(key => 
        key.startsWith(`@golf_offline_scores_${eventId}_`)
      );

      console.log('[EventFooter] Found', scoreKeys.length, 'offline score entries');

      for (const key of scoreKeys) {
        try {
          const dayMatch = key.match(/_day(\d+)$/);
          if (!dayMatch) continue;

          const day = parseInt(dayMatch[1], 10);
          const scoresJson = await AsyncStorage.getItem(key);
          
          if (!scoresJson) continue;

          const scores = JSON.parse(scoresJson);
          console.log('[EventFooter] Syncing scores for day', day, ':', Object.keys(scores).length, 'players');

          for (const [memberId, playerScores] of Object.entries(scores as Record<string, Record<number, number>>)) {
            const holesArray = Array(18).fill(null);
            let totalScore = 0;

            Object.entries(playerScores).forEach(([hole, score]) => {
              const holeNum = parseInt(hole, 10);
              if (holeNum >= 1 && holeNum <= 18) {
                holesArray[holeNum - 1] = score;
                totalScore += score;
              }
            });

            if (totalScore > 0) {
              await supabaseService.scores.submit(
                eventId,
                memberId,
                day,
                holesArray,
                totalScore,
                currentUser.id
              );
              console.log('[EventFooter] ✅ Synced scores for member:', memberId, 'day:', day, 'total:', totalScore);
              successCount++;
            }
          }

          storagKeysToDelete.push(key);
        } catch (error) {
          console.error('[EventFooter] Failed to sync scores from key:', key, error);
          failCount++;
        }
      }

      for (const key of storagKeysToDelete) {
        await AsyncStorage.removeItem(key);
        console.log('[EventFooter] 🗑️ Cleared synced scores:', key);
      }

      queryClient.invalidateQueries({ queryKey: ['scores', eventId] });
      
      console.log('[EventFooter] ✅ Sync complete:', successCount, 'player scores synced,', failCount, 'failed');
      
      if (failCount === 0 && successCount > 0) {
        Alert.alert('Sync Complete', `Successfully synced ${successCount} player score(s) to the server!`);
      } else if (successCount > 0) {
        Alert.alert('Sync Partially Complete', `${successCount} synced, ${failCount} failed`);
      } else {
        Alert.alert('No Scores to Sync', 'No offline scores found.');
      }
    } catch (error) {
      console.error('[EventFooter] Sync error:', error);
      Alert.alert('Sync Failed', 'Unable to sync scores. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    
    const fetchEvent = async () => {
      try {
        const data = await supabaseService.events.get(eventId);
        setEvent(data);
        console.log('[EventFooter] Fetched event:', data?.id);
      } catch (error) {
        console.error('[EventFooter] Error fetching event:', error);
        setEvent(null);
      }
    };
    
    fetchEvent();

    const subscription = supabase
      .channel(`event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload: any) => {
          console.log('[EventFooter] Realtime event update:', payload);
          fetchEvent();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [eventId]);

  useEffect(() => {
    const loadCourseHandicapSetting = async () => {
      if (eventId && event) {
        try {
          const dbValue = event.useCourseHandicap;
          if (dbValue !== undefined && dbValue !== null) {
            setUseCourseHandicap(dbValue);
            const key = `useCourseHandicap_${eventId}`;
            await AsyncStorage.setItem(key, dbValue.toString());
          } else {
            const key = `useCourseHandicap_${eventId}`;
            const localValue = await AsyncStorage.getItem(key);
            if (localValue !== null) {
              setUseCourseHandicap(localValue === 'true');
            }
          }
        } catch (error) {
          console.error('[EventFooter] Error loading course handicap setting:', error);
        }
      }
    };
    loadCourseHandicapSetting();
  }, [eventId, event]);

  const toggleCourseHandicap = async () => {
    if (eventId) {
      const newValue = !useCourseHandicap;
      console.log('[EventFooter] 🎯 Toggling course handicap from', useCourseHandicap, 'to', newValue);
      
      // 1. Update local state immediately
      setUseCourseHandicap(newValue);
      setEvent((prev: any) => prev ? { ...prev, useCourseHandicap: newValue } : prev);
      
      // 2. Immediately update React Query cache for instant UI update across all components
      queryClient.setQueryData(['events', eventId], (oldData: any) => {
        if (oldData) {
          console.log('[EventFooter] 🔄 Immediately updating query cache with useCourseHandicap:', newValue);
          return { ...oldData, useCourseHandicap: newValue };
        }
        return oldData;
      });
      
      // 3. Save to AsyncStorage for local persistence
      const key = `useCourseHandicap_${eventId}`;
      AsyncStorage.setItem(key, newValue.toString()).catch(err => 
        console.error('[EventFooter] Error saving to AsyncStorage:', err)
      );
      
      try {
        // 4. Persist to Supabase (this will trigger realtime for other devices)
        await supabaseService.events.update(eventId, {
          useCourseHandicap: newValue,
        });
        console.log('[EventFooter] ✅ Course handicap saved to Supabase:', newValue);
        
        // 5. Invalidate to ensure any stale data is refreshed
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } catch (error) {
        console.error('[EventFooter] ❌ Error saving course handicap setting:', error);
        // Rollback on error
        setUseCourseHandicap(!newValue);
        setEvent((prev: any) => prev ? { ...prev, useCourseHandicap: !newValue } : prev);
        queryClient.setQueryData(['events', eventId], (oldData: any) => {
          if (oldData) {
            return { ...oldData, useCourseHandicap: !newValue };
          }
          return oldData;
        });
        AsyncStorage.setItem(key, (!newValue).toString()).catch(() => {});
      }
    }
  };

  const [isNavigating, setIsNavigating] = React.useState(false);
  const navigationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const navigateTo = React.useCallback((route: string) => {
    if (isNavigating) {
      console.log('[EventFooter] Already navigating, ignoring tap');
      return;
    }
    
    console.log('[EventFooter] Navigating to:', route);
    setIsNavigating(true);
    
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    requestAnimationFrame(() => {
      try {
        if (route === 'home') {
          router.push('/(tabs)/dashboard' as any);
        } else if (route === 'registration') {
          router.push(`/(event)/${eventId}/registration` as any);
        } else {
          router.push(`/(event)/${eventId}/${route}` as any);
        }
      } catch (error) {
        console.error('[EventFooter] Navigation error:', error);
      }
      
      navigationTimeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        console.log('[EventFooter] Navigation guard reset');
      }, 500);
    });
  }, [isNavigating, eventId, router]);

  const isActive = (route: string) => {
    if (route === 'home') return false;
    if (route === 'index') return pathname === `/(event)/${eventId}` || pathname === `/(event)/${eventId}/`;
    return pathname.includes(`/${route}`);
  };

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'registration', icon: Users, label: 'Register' },
    ...(!isSocialEvent ? [
      { id: 'groupings', icon: Grid3x3, label: 'Groupings' },
      { id: 'scoring', icon: Target, label: 'Scoring' },
      { id: 'leaderboard', icon: Award, label: 'Leader' },
    ] : [
      { id: 'tables', icon: LayoutGrid, label: 'Tables' },
    ]),
  ];

  if (canViewFinance(currentUser)) {
    tabs.push({ id: 'finance', icon: DollarSign, label: 'Finance' });
  }

  return (
    <View style={styles.footerContainer}>
      {currentUser?.isAdmin && showGroupingButtons && (
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.groupingButton}
            onPress={onLoadByHDC}
          >
            <Text style={styles.groupingButtonText}>Load by HDC</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.groupingButton}
            onPress={onLoadByNetScores}
          >
            <Text style={styles.groupingButtonText}>Load by Net Scores</Text>
          </TouchableOpacity>
        </View>
      )}
      {showSubmitButton && onSubmit && (
        <View style={styles.topRow}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'SUBMIT SCORES'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {currentUser?.isAdmin && !hideTopRowButtons && (
        <View style={styles.topRow}>
          {showRolexButtons ? (
            <>
              <TouchableOpacity
                style={[
                  styles.rolexButton,
                  styles.distributeButton,
                  (isDistributing || pointsDistributed) && styles.rolexButtonDisabled,
                ]}
                onPress={onDistributePoints}
                disabled={isDistributing || isClearing || pointsDistributed}
              >
                <Text style={styles.rolexButtonText}>
                  {isDistributing ? 'Distributing...' : pointsDistributed ? 'Points Distributed' : 'Distribute Points'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.rolexButton,
                  styles.clearButton,
                  (isClearing || !pointsDistributed) && styles.rolexButtonDisabled,
                ]}
                onPress={onClearPoints}
                disabled={isDistributing || isClearing || !pointsDistributed}
              >
                <Text style={styles.rolexButtonText}>
                  {isClearing ? 'Clearing...' : 'Clear Points'}
                </Text>
              </TouchableOpacity>
            </>
          ) : showSyncButton ? (
            shouldUseOfflineMode ? (
              <TouchableOpacity
                style={[styles.syncButton, (isSyncing || !hasOfflineScores) && styles.syncButtonDisabled]}
                onPress={handleSync}
                disabled={isSyncing || !hasOfflineScores}
              >
                <Upload size={18} color="#fff" />
                <Text style={styles.syncButtonText}>
                  {isSyncing ? 'Syncing...' : hasOfflineScores ? 'You Are Offline - Sync When Connected' : 'You Are Offline - Syncing Not Required'}
                </Text>
              </TouchableOpacity>
            ) : null
          ) : (
            <>
              <View style={styles.toggleButtonWrapper}>
                <OfflineModeToggle eventId={eventId} position="footer" />
              </View>
              {showStartButton && onStatusChange && (
                <View style={styles.startButtonWrapper}>
                  <EventStatusButton
                    status={eventStatus!}
                    onStatusChange={async (newStatus) => {
                      await onStatusChange(newStatus);
                      if (newStatus === 'complete' && eventId) {
                        await calculateAndStoreTournamentHandicaps(eventId);
                      }
                    }}
                    isAdmin={isAdmin}
                  />
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.courseHandicapToggle,
                  useCourseHandicap && styles.courseHandicapToggleActive,
                ]}
                onPress={toggleCourseHandicap}
              >
                <Text style={styles.courseHandicapToggleText}>
                  {useCourseHandicap ? 'Play GHIN HDC' : 'Play Course HDC'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
        {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.id);
        
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => navigateTo(tab.id)}
            activeOpacity={0.7}
          >
            <Icon size={24} color={active ? '#fff' : '#8899AA'} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: '#5A0015',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  toggleButtonWrapper: {
    flex: 1,
    height: 36,
    borderWidth: 2,
    borderColor: '#FFD54F',
    borderRadius: 8,
    overflow: 'hidden',
  },
  startButtonWrapper: {
    flex: 1,
    height: 36,
    borderWidth: 2,
    borderColor: '#FFD54F',
    borderRadius: 8,
    overflow: 'hidden',
  },
  courseHandicapToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#8B2E4A',
    height: 36,
    borderWidth: 2,
    borderColor: '#FFD54F',
  },
  courseHandicapToggleActive: {
    backgroundColor: '#2196F3',
  },
  courseHandicapToggleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  rolexButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFD54F',
    marginHorizontal: 4,
  },
  distributeButton: {
    backgroundColor: '#FFB300',
  },
  clearButton: {
    backgroundColor: '#D32F2F',
  },
  rolexButtonDisabled: {
    opacity: 0.5,
  },
  rolexButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#5A0015',
    paddingBottom: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#8899AA',
    marginTop: 4,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#fff',
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    minHeight: 40,
    borderWidth: 2,
    borderColor: '#FFD54F',
    gap: 6,
  },
  syncButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  groupingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#8B2E4A',
    borderWidth: 2,
    borderColor: '#FFD54F',
    marginHorizontal: 4,
  },
  groupingButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FDB813',
    borderWidth: 2,
    borderColor: '#FFD54F',
  },
  submitButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
