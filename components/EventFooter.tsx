import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, Grid3x3, Target, Award, DollarSign, LayoutGrid } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { OfflineModeToggle } from '@/components/OfflineModeToggle';
import { EventStatusButton, EventStatus } from '@/components/EventStatusButton';
import { supabaseService } from '@/utils/supabaseService';
import { canViewFinance } from '@/utils/rolePermissions';
import { calculateTournamentHandicap, addTournamentHandicapRecord } from '@/utils/tournamentHandicapHelper';
import type { TournamentHandicapRecord } from '@/types';

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
}: EventFooterProps = {}) {
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
  const router = useRouter();
  const pathname = usePathname();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [useCourseHandicap, setUseCourseHandicap] = useState<boolean>(false);

  const [event, setEvent] = useState<any>(null);
  const isSocialEvent = event?.type === 'social';

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
  }, [eventId]);

  useEffect(() => {
    const loadCourseHandicapSetting = async () => {
      if (eventId) {
        try {
          const key = `useCourseHandicap_${eventId}`;
          const value = await AsyncStorage.getItem(key);
          if (value !== null) {
            setUseCourseHandicap(value === 'true');
          }
        } catch (error) {
          console.error('[EventFooter] Error loading course handicap setting:', error);
        }
      }
    };
    loadCourseHandicapSetting();
  }, [eventId]);

  const toggleCourseHandicap = async () => {
    if (eventId) {
      const newValue = !useCourseHandicap;
      setUseCourseHandicap(newValue);
      try {
        const key = `useCourseHandicap_${eventId}`;
        await AsyncStorage.setItem(key, newValue.toString());
        console.log('[EventFooter] Course handicap toggled:', newValue);
      } catch (error) {
        console.error('[EventFooter] Error saving course handicap setting:', error);
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
          router.push('/(tabs)/dashboard');
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
      {currentUser?.isAdmin && (
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
                  {useCourseHandicap ? 'Play Course HDC' : 'Play GHIN HDC'}
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
    backgroundColor: '#1B5E20',
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
  },
  startButtonWrapper: {
    flex: 1,
  },
  courseHandicapToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    backgroundColor: '#1B5E20',
    paddingBottom: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
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
});
