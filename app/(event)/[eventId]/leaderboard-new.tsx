import { useLocalSearchParams } from 'expo-router';
import { Trophy, RefreshCw } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { EventFooter } from '@/components/EventFooter';
import { useQuery } from '@tanstack/react-query';
import { supabaseService } from '@/utils/supabaseService';
import { getDisplayHandicap, calculateTournamentFlight } from '@/utils/handicapHelper';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Member, Event } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  member: Member;
  grossScore: number;
  netScore: number;
  handicap: number;
  position: number;
  flight: string;
  registration?: any;
}

export default function LeaderboardNewScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [selectedDay, setSelectedDay] = useState<number | 'all' | 'rolex'>('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => supabaseService.events.get(eventId || ''),
    enabled: !!eventId,
    staleTime: 60000,
  });

  const membersQuery = useQuery({
    queryKey: ['members'],
    queryFn: () => supabaseService.members.getAll(),
    staleTime: 300000,
  });

  const registrationsQuery = useQuery({
    queryKey: ['event-registrations', eventId],
    queryFn: () => supabaseService.registrations.getAll(eventId || ''),
    enabled: !!eventId,
    staleTime: 60000,
  });

  const scoresQuery = useQuery({
    queryKey: ['event-scores', eventId, lastUpdate.getTime()],
    queryFn: () => supabaseService.scores.getAll(eventId || ''),
    enabled: !!eventId,
    staleTime: 15000,
  });

  useEffect(() => {
    if (!eventId) return;

    console.log('[LeaderboardNew] Setting up realtime subscription');

    const channel = supabase
      .channel(`leaderboard-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('[LeaderboardNew] Score update received:', payload.eventType);
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        console.log('[LeaderboardNew] Subscription status:', status);
      });

    return () => {
      console.log('[LeaderboardNew] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const handleRefresh = useCallback(() => {
    console.log('[LeaderboardNew] Manual refresh triggered');
    setLastUpdate(new Date());
  }, []);

  const leaderboard = useMemo<{ flightA: LeaderboardEntry[]; flightB: LeaderboardEntry[]; rolex: LeaderboardEntry[] }>(() => {
    const event = eventQuery.data;
    const members = membersQuery.data || [];
    const registrations = registrationsQuery.data || [];
    const scores = scoresQuery.data || [];

    console.log('[LeaderboardNew] Computing leaderboard:', {
      eventId,
      membersCount: members.length,
      registrationsCount: registrations.length,
      scoresCount: scores.length,
      selectedDay,
    });

    if (!event || members.length === 0 || registrations.length === 0) {
      console.log('[LeaderboardNew] Missing data:', { event: !!event, members: members.length, registrations: registrations.length });
      return { flightA: [], flightB: [], rolex: [] };
    }

    const allEntries: LeaderboardEntry[] = [];

    registrations.forEach((registration: any) => {
      if (!registration.memberId) return;
      
      const member = members.find((m: Member) => m.id === registration.memberId);
      if (!member) return;
      
      const playerScores = scores.filter((s: any) => {
        if (s.memberId !== registration.memberId) return false;
        if (selectedDay === 'all' || selectedDay === 'rolex') return true;
        return s.day === selectedDay;
      });

      const grossScore = playerScores.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0);
      
      const handicap = getDisplayHandicap(member, registration, event as Event, false, 1);
      const netScore = grossScore - handicap;
      
      const flight = calculateTournamentFlight(
        member,
        Number(event.flightACutoff) || undefined,
        Number(event.flightBCutoff) || undefined,
        registration,
        event as Event,
        false,
        1
      );

      console.log('[LeaderboardNew] Player:', member.name, 'Flight:', flight, 'Scores count:', playerScores.length, 'Gross:', grossScore, 'Net:', netScore);

      allEntries.push({
        member,
        grossScore,
        netScore,
        handicap,
        flight,
        position: 0,
        registration,
      });
    });

    console.log('[LeaderboardNew] All entries before filtering:', allEntries.length);
    console.log('[LeaderboardNew] Sample calculated flights:', allEntries.slice(0, 3).map(e => ({
      name: e.member.name,
      flight: e.flight,
      handicap: e.handicap
    })));

    let flightAEntries = allEntries.filter(e => e.flight === 'A');
    let flightBEntries = allEntries.filter(e => e.flight === 'B');
    const noFlightEntries = allEntries.filter(e => !e.flight || e.flight === '—');

    console.log('[LeaderboardNew] Flight A entries:', flightAEntries.length, 'Flight B entries:', flightBEntries.length, 'No flight:', noFlightEntries.length);

    if (noFlightEntries.length > 0) {
      console.log('[LeaderboardNew] Players without flight assignment found, putting them in Flight A');
      flightAEntries = [...flightAEntries, ...noFlightEntries];
    }

    flightAEntries.sort((a, b) => a.netScore - b.netScore);
    flightBEntries.sort((a, b) => a.netScore - b.netScore);

    let currentPosition = 1;
    let previousNetScore: number | null = null;
    flightAEntries.forEach((entry, index) => {
      if (previousNetScore === null || entry.netScore !== previousNetScore) {
        currentPosition = index + 1;
      }
      entry.position = currentPosition;
      previousNetScore = entry.netScore;
    });

    currentPosition = 1;
    previousNetScore = null;
    flightBEntries.forEach((entry, index) => {
      if (previousNetScore === null || entry.netScore !== previousNetScore) {
        currentPosition = index + 1;
      }
      entry.position = currentPosition;
      previousNetScore = entry.netScore;
    });

    const rolexEntries = [...allEntries].sort((a, b) => a.netScore - b.netScore);
    currentPosition = 1;
    previousNetScore = null;
    rolexEntries.forEach((entry, index) => {
      if (previousNetScore === null || entry.netScore !== previousNetScore) {
        currentPosition = index + 1;
      }
      entry.position = currentPosition;
      previousNetScore = entry.netScore;
    });

    return { flightA: flightAEntries, flightB: flightBEntries, rolex: rolexEntries };
  }, [eventQuery.data, membersQuery.data, registrationsQuery.data, scoresQuery.data, selectedDay, eventId]);

  const isLoading = eventQuery.isLoading || membersQuery.isLoading || registrationsQuery.isLoading || scoresQuery.isLoading;
  const isRefetching = scoresQuery.isFetching && !scoresQuery.isLoading;

  const handleDaySelect = useCallback((day: number | 'all' | 'rolex') => {
    setSelectedDay(day);
  }, []);

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TOURNAMENT LEADERBOARD</Text>
          <TouchableOpacity 
            onPress={handleRefresh} 
            style={styles.refreshButton}
            disabled={isRefetching}
          >
            <RefreshCw 
              size={18} 
              color="#fff" 
              style={isRefetching ? styles.refreshing : undefined}
            />
          </TouchableOpacity>
        </View>

        {eventQuery.data?.photoUrl && (
          <View style={styles.eventPhotoContainer}>
            <Image source={{ uri: eventQuery.data.photoUrl }} style={styles.eventPhoto} />
            <Text style={styles.eventNameOverlay}>{eventQuery.data.name}</Text>
            <View style={styles.bottomInfoOverlay}>
              <Text style={styles.eventLocationOverlay}>{eventQuery.data.location}</Text>
              <Text style={styles.eventDateOverlay}>
                {eventQuery.data.date}
                {eventQuery.data.endDate && eventQuery.data.endDate !== eventQuery.data.date ? ` - ${eventQuery.data.endDate}` : ''}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabButton, selectedDay !== 'rolex' && styles.tabButtonActive]}
            onPress={() => handleDaySelect('all')}
          >
            <Text style={[styles.tabButtonText, selectedDay !== 'rolex' && styles.tabButtonTextActive]}>
              Tournament
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, selectedDay === 'rolex' && styles.tabButtonActive]}
            onPress={() => handleDaySelect('rolex')}
          >
            <Text style={[styles.tabButtonText, selectedDay === 'rolex' && styles.tabButtonTextActive]}>
              Rolex Points
            </Text>
          </TouchableOpacity>
        </View>

        {selectedDay !== 'rolex' && eventQuery.data?.numberOfDays && eventQuery.data.numberOfDays > 1 && (
          <View style={styles.daySelector}>
            <TouchableOpacity
              style={[styles.dayButton, selectedDay === 'all' && styles.dayButtonActive]}
              onPress={() => handleDaySelect('all')}
            >
              <Text style={[styles.dayButtonText, selectedDay === 'all' && styles.dayButtonTextActive]}>
                All Days
              </Text>
            </TouchableOpacity>
            {Array.from({ length: eventQuery.data.numberOfDays }, (_, i) => i + 1).map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.dayButton, selectedDay === day && styles.dayButtonActive]}
                onPress={() => handleDaySelect(day)}
              >
                <Text style={[styles.dayButtonText, selectedDay === day && styles.dayButtonTextActive]}>
                  Day {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1B5E20" />
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          ) : selectedDay === 'rolex' ? (
            leaderboard.rolex.length === 0 ? (
              <View style={styles.emptyState}>
                <Trophy size={64} color="#999" />
                <Text style={styles.emptyTitle}>No Scores Yet</Text>
                <Text style={styles.emptyText}>
                  Scores will appear here in real-time as they are submitted during the tournament.
                </Text>
              </View>
            ) : (
              leaderboard.rolex.map((entry) => (
                <View 
                  key={entry.member.id} 
                  style={[
                    styles.playerCard, 
                    entry.position === 1 && styles.leaderCard
                  ]}
                >
                  <View style={styles.cardLeft}>
                    {entry.position === 1 ? (
                      <Trophy size={32} color="#FFD700" fill="#FFD700" style={styles.trophyIcon} />
                    ) : (
                      <View style={styles.positionCircle}>
                        <Text style={styles.positionNumberCircle}>#{entry.position}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardCenter}>
                    <Text style={styles.cardPlayerName}>{entry.member.name}</Text>
                    <Text style={styles.cardDetail}>HDC: {entry.handicap}</Text>
                    <Text style={styles.cardDetail}>Flight: {entry.flight}</Text>
                    <Text style={styles.cardDetail}>Rolex Flight: {entry.flight}</Text>
                    <Text style={styles.cardDetailRed}>Total: {entry.grossScore || '—'}</Text>
                    <Text style={styles.cardDetailRed}>Net Score: {entry.netScore || '—'}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.cardPoints}>{entry.member.rolexPoints || 0}</Text>
                    <Text style={styles.cardPointsLabel}>pts</Text>
                  </View>
                </View>
              ))
            )
          ) : leaderboard.flightA.length === 0 && leaderboard.flightB.length === 0 ? (
            <View style={styles.emptyState}>
              <Trophy size={64} color="#999" />
              <Text style={styles.emptyTitle}>No Scores Yet</Text>
              <Text style={styles.emptyText}>
                Scores will appear here as they are submitted during the tournament.
              </Text>
            </View>
          ) : (
            <>
              {leaderboard.flightA.length > 0 && (
                <>
                  <View style={styles.flightSeparator}>
                    <Text style={styles.flightLabel}>Flight A</Text>
                  </View>
                  {leaderboard.flightA.map((entry) => (
                    <View 
                      key={entry.member.id} 
                      style={[
                        styles.playerCard, 
                        entry.position <= 3 && styles.leaderCard
                      ]}
                    >
                      <View style={styles.cardLeft}>
                        {entry.position === 1 ? (
                          <Trophy size={32} color="#FFD700" fill="#FFD700" style={styles.trophyIcon} />
                        ) : entry.position === 2 ? (
                          <Trophy size={32} color="#B0C4DE" fill="#B0C4DE" style={styles.trophyIcon} />
                        ) : entry.position === 3 ? (
                          <Trophy size={32} color="#CD7F32" fill="#CD7F32" style={styles.trophyIcon} />
                        ) : (
                          <View style={styles.positionCircle}>
                            <Text style={styles.positionNumberCircle}>#{entry.position}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.cardCenter}>
                        <Text style={styles.cardPlayerName}>{entry.member.name}</Text>
                        <Text style={styles.cardDetail}>HDC: {entry.handicap}</Text>
                        <Text style={styles.cardDetail}>Flight: {entry.flight}</Text>
                        <Text style={styles.cardDetail}>Rolex Flight: {entry.flight}</Text>
                        <Text style={styles.cardDetailRed}>Total: {entry.grossScore || '—'}</Text>
                        <Text style={styles.cardDetailRed}>Net Score: {entry.netScore || '—'}</Text>
                      </View>
                      <View style={styles.cardRight}>
                        <Text style={styles.cardPoints}>{entry.member.rolexPoints || 0}</Text>
                        <Text style={styles.cardPointsLabel}>pts</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {leaderboard.flightB.length > 0 && (
                <>
                  <View style={[styles.flightSeparator, { marginTop: leaderboard.flightA.length > 0 ? 32 : 0 }]}>
                    <Text style={styles.flightLabel}>Flight B</Text>
                  </View>
                  {leaderboard.flightB.map((entry) => (
                    <View 
                      key={entry.member.id} 
                      style={[
                        styles.playerCard, 
                        entry.position <= 3 && styles.leaderCard
                      ]}
                    >
                      <View style={styles.cardLeft}>
                        {entry.position === 1 ? (
                          <Trophy size={32} color="#FFD700" fill="#FFD700" style={styles.trophyIcon} />
                        ) : entry.position === 2 ? (
                          <Trophy size={32} color="#B0C4DE" fill="#B0C4DE" style={styles.trophyIcon} />
                        ) : entry.position === 3 ? (
                          <Trophy size={32} color="#CD7F32" fill="#CD7F32" style={styles.trophyIcon} />
                        ) : (
                          <View style={styles.positionCircle}>
                            <Text style={styles.positionNumberCircle}>#{entry.position}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.cardCenter}>
                        <Text style={styles.cardPlayerName}>{entry.member.name}</Text>
                        <Text style={styles.cardDetail}>HDC: {entry.handicap}</Text>
                        <Text style={styles.cardDetail}>Flight: {entry.flight}</Text>
                        <Text style={styles.cardDetail}>Rolex Flight: {entry.flight}</Text>
                        <Text style={styles.cardDetailRed}>Total: {entry.grossScore || '—'}</Text>
                        <Text style={styles.cardDetailRed}>Net Score: {entry.netScore || '—'}</Text>
                      </View>
                      <View style={styles.cardRight}>
                        <Text style={styles.cardPoints}>{entry.member.rolexPoints || 0}</Text>
                        <Text style={styles.cardPointsLabel}>pts</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  refreshButton: {
    padding: 4,
    position: 'absolute' as const,
    right: 16,
  },
  refreshing: {
    opacity: 0.5,
  },
  eventPhotoContainer: {
    position: 'relative' as const,
    width: '100%',
    height: 100,
  },
  eventPhoto: {
    width: '100%',
    height: 100,
    resizeMode: 'cover' as const,
  },
  eventNameOverlay: {
    position: 'absolute' as const,
    top: 8,
    left: 0,
    right: 0,
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center' as const,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomInfoOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center' as const,
    gap: 2,
  },
  eventLocationOverlay: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  eventDateOverlay: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  tabSelector: {
    flexDirection: 'row' as const,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    height: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#1B5E20',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#999',
  },
  tabButtonTextActive: {
    color: '#1B5E20',
    fontWeight: '700' as const,
  },
  daySelector: {
    flexDirection: 'row' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#1B5E20',
    backgroundColor: '#fff',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dayButtonActive: {
    backgroundColor: '#1B5E20',
  },
  dayButtonText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#1B5E20',
    textAlign: 'center' as const,
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  firstPlaceCard: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  leaderCard: {
    backgroundColor: '#FFF9E6',
    borderWidth: 2,
    borderColor: '#FFB84D',
  },
  cardLeft: {
    width: 60,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  trophyIcon: {
    marginBottom: 4,
  },
  positionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  positionNumberCircle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  cardCenter: {
    flex: 1,
    paddingRight: 12,
  },
  cardPlayerName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#E53935',
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  cardDetailRed: {
    fontSize: 13,
    color: '#E53935',
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  cardRight: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 50,
  },
  cardPoints: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFC107',
  },
  cardPointsLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: -4,
  },
  flightSeparator: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  flightLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center' as const,
    letterSpacing: 1,
  },
});
