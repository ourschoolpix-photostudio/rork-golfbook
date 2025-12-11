import { useLocalSearchParams } from 'expo-router';
import { Trophy, Medal } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image, TouchableOpacity } from 'react-native';
import { EventFooter } from '@/components/EventFooter';
import { useQuery } from '@tanstack/react-query';
import { supabaseService } from '@/utils/supabaseService';
import { useRealtimeScores } from '@/utils/useRealtimeSubscription';
import { getDisplayHandicap } from '@/utils/handicapHelper';
import { useState, useMemo } from 'react';
import { Member, Event } from '@/types';

interface LeaderboardEntry {
  member: Member;
  grossScore: number;
  netScore: number;
  handicap: number;
  position: number;
  registration?: any;
}

export default function LeaderboardScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => supabaseService.events.get(eventId || ''),
    enabled: !!eventId,
  });

  const { data: allMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => supabaseService.members.getAll(),
  });

  const { data: registrations = [], isLoading: registrationsLoading } = useQuery({
    queryKey: ['registrations', eventId],
    queryFn: () => supabaseService.registrations.getAll(eventId || ''),
    enabled: !!eventId,
  });

  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['scores', eventId],
    queryFn: () => supabaseService.scores.getAll(eventId || ''),
    enabled: !!eventId,
  });

  useRealtimeScores(eventId || '', !!eventId);

  const leaderboard = useMemo(() => {
    console.log('[Leaderboard] Computing leaderboard:', {
      hasEvent: !!event,
      membersCount: allMembers.length,
      registrationsCount: registrations.length,
      scoresCount: scores.length,
    });

    if (!event || !allMembers.length || !registrations.length) {
      console.log('[Leaderboard] Missing required data for leaderboard');
      return [];
    }

    const entries: LeaderboardEntry[] = [];

    registrations.forEach((registration: any) => {
      if (!registration.memberId) return;
      
      const member = allMembers.find((m: any) => m.id === registration.memberId);
      if (!member) return;
      
      const playerScores = scores.filter((s: any) => {
        if (s.memberId !== registration.memberId) return false;
        if (selectedDay === 'all') return true;
        return s.day === selectedDay;
      });

      const grossScore = playerScores.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0);
      
      if (grossScore === 0) return;

      const handicap = getDisplayHandicap(member, registration, event as Event, false, 1);
      const netScore = grossScore - handicap;

      entries.push({
        member,
        grossScore,
        netScore,
        handicap,
        position: 0,
        registration,
      });
    });

    entries.sort((a, b) => a.netScore - b.netScore);
    
    let currentPosition = 1;
    let previousNetScore: number | null = null;

    entries.forEach((entry, index) => {
      if (previousNetScore === null || entry.netScore !== previousNetScore) {
        currentPosition = index + 1;
      }
      entry.position = currentPosition;
      previousNetScore = entry.netScore;
    });

    return entries;
  }, [event, allMembers, scores, registrations, selectedDay]);

  const isLoading = eventLoading || membersLoading || registrationsLoading || scoresLoading;

  const getPodiumColor = (position: number): string => {
    switch (position) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#1B5E20';
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Trophy size={20} color="#fff" />
          <Text style={styles.headerTitle}>LEADERBOARD</Text>
        </View>

        {event && event.photoUrl && (
          <View style={styles.eventPhotoContainer}>
            <Image source={{ uri: event.photoUrl }} style={styles.eventPhoto} />
            <Text style={styles.eventNameOverlay}>{event.name}</Text>
            <View style={styles.bottomInfoOverlay}>
              <Text style={styles.eventLocationOverlay}>{event.location}</Text>
              <Text style={styles.eventDateOverlay}>
                {event.date}
                {event.endDate && event.endDate !== event.date ? ` - ${event.endDate}` : ''}
              </Text>
            </View>
          </View>
        )}

        {event && event.numberOfDays && event.numberOfDays > 1 && (
          <View style={styles.daySelector}>
            <TouchableOpacity
              style={[styles.dayButton, selectedDay === 'all' && styles.dayButtonActive]}
              onPress={() => setSelectedDay('all')}
            >
              <Text style={[styles.dayButtonText, selectedDay === 'all' && styles.dayButtonTextActive]}>
                All Days
              </Text>
            </TouchableOpacity>
            {Array.from({ length: event.numberOfDays }, (_, i) => i + 1).map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.dayButton, selectedDay === day && styles.dayButtonActive]}
                onPress={() => setSelectedDay(day)}
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
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          ) : leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <Trophy size={64} color="#999" />
              <Text style={styles.emptyTitle}>No Scores Yet</Text>
              <Text style={styles.emptyText}>
                Scores will appear here as they are submitted during the tournament.
              </Text>
            </View>
          ) : (
            <>
              {leaderboard.slice(0, 3).map((entry) => (
                <View key={entry.member.id} style={[styles.podiumCard, { borderLeftColor: getPodiumColor(entry.position) }]}>
                  <View style={styles.positionBadge}>
                    {entry.position <= 3 ? (
                      <Medal size={20} color={getPodiumColor(entry.position)} fill={getPodiumColor(entry.position)} />
                    ) : (
                      <Text style={styles.positionText}>#{entry.position}</Text>
                    )}
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{entry.member.name}</Text>
                    <Text style={styles.playerHandicap}>Handicap: {entry.handicap}</Text>
                  </View>
                  <View style={styles.scoresContainer}>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Net</Text>
                      <Text style={[styles.scoreValue, styles.netScoreValue]}>{entry.netScore}</Text>
                    </View>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Gross</Text>
                      <Text style={styles.scoreValue}>{entry.grossScore}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {leaderboard.length > 3 && (
                <View style={styles.restOfFieldContainer}>
                  <Text style={styles.restOfFieldTitle}>Rest of Field</Text>
                  {leaderboard.slice(3).map((entry) => (
                    <View key={entry.member.id} style={styles.leaderboardRow}>
                      <View style={styles.positionBox}>
                        <Text style={styles.positionNumber}>{entry.position}</Text>
                      </View>
                      <View style={styles.rowPlayerInfo}>
                        <Text style={styles.rowPlayerName}>{entry.member.name}</Text>
                        <Text style={styles.rowPlayerHandicap}>Handicap: {entry.handicap}</Text>
                      </View>
                      <View style={styles.rowScores}>
                        <Text style={styles.rowNetScore}>{entry.netScore}</Text>
                        <Text style={styles.rowGrossScore}>({entry.grossScore})</Text>
                      </View>
                    </View>
                  ))}
                </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
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
  comingSoon: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic' as const,
  },
  podiumCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  positionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  positionText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 4,
  },
  playerHandicap: {
    fontSize: 12,
    color: '#999',
  },
  scoresContainer: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  scoreItem: {
    alignItems: 'center' as const,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#999',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333',
  },
  netScoreValue: {
    color: '#1B5E20',
  },
  restOfFieldContainer: {
    marginTop: 24,
  },
  restOfFieldTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#999',
    marginBottom: 12,
    paddingLeft: 4,
  },
  leaderboardRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  positionBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  positionNumber: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#666',
  },
  rowPlayerInfo: {
    flex: 1,
  },
  rowPlayerName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 2,
  },
  rowPlayerHandicap: {
    fontSize: 10,
    color: '#999',
  },
  rowScores: {
    alignItems: 'flex-end' as const,
  },
  rowNetScore: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  rowGrossScore: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
