import { useLocalSearchParams } from 'expo-router';
import { Award, RefreshCw } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Alert } from '@/utils/alertPolyfill';
import { EventFooter } from '@/components/EventFooter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/utils/supabaseService';
import { getDisplayHandicap, calculateTournamentFlight } from '@/utils/handicapHelper';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Member, Event } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

const formatScore = (score: number): string => {
  const rounded = Math.round(score * 10) / 10;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
};

interface LeaderboardEntry {
  member: Member;
  grossScore: number;
  netScore: number;
  handicap: number;
  position: number;
  flight: string;
  registration?: any;
}

export default function LeaderboardScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [selectedDay, setSelectedDay] = useState<number | 'all' | 'rolex'>('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { currentUser } = useAuth();
  const { orgInfo } = useSettings();
  const queryClient = useQueryClient();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => supabaseService.events.get(eventId || ''),
    enabled: !!eventId,
    staleTime: 60000,
  });

  const membersQuery = useQuery({
    queryKey: ['members', lastUpdate.getTime()],
    queryFn: () => supabaseService.members.getAll(),
    staleTime: 0,
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

    console.log('[Leaderboard] Setting up realtime subscription');

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
          console.log('[Leaderboard] Score update received:', payload.eventType);
          setLastUpdate(new Date());
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
        },
        (payload) => {
          console.log('[Leaderboard] Member update received:', payload.eventType);
          setLastUpdate(new Date());
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_registrations',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('[Leaderboard] Registration update received:', payload.eventType);
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        console.log('[Leaderboard] Subscription status:', status);
      });

    return () => {
      console.log('[Leaderboard] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const handleRefresh = useCallback(() => {
    console.log('[Leaderboard] Manual refresh triggered');
    setLastUpdate(new Date());
  }, []);

  const leaderboard = useMemo<{ flightA: LeaderboardEntry[]; flightB: LeaderboardEntry[]; rolex: LeaderboardEntry[] }>(() => {
    const event = eventQuery.data;
    const members = membersQuery.data || [];
    const registrations = registrationsQuery.data || [];
    const scores = scoresQuery.data || [];

    console.log('[Leaderboard] Computing leaderboard:', {
      eventId,
      membersCount: members.length,
      registrationsCount: registrations.length,
      scoresCount: scores.length,
      selectedDay,
    });

    if (!event || members.length === 0 || registrations.length === 0) {
      console.log('[Leaderboard] Missing data:', { event: !!event, members: members.length, registrations: registrations.length });
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
      
      if (grossScore === 0 && selectedDay !== 'rolex') return;
      
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

      console.log('[Leaderboard] Player:', member.name, 'Flight:', flight, 'Scores count:', playerScores.length, 'Gross:', grossScore, 'Net:', netScore);

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

    console.log('[Leaderboard] All entries before filtering:', allEntries.length);
    console.log('[Leaderboard] Sample calculated flights:', allEntries.slice(0, 3).map(e => ({
      name: e.member.name,
      flight: e.flight,
      handicap: e.handicap
    })));

    let flightAEntries = allEntries.filter(e => e.flight === 'A');
    let flightBEntries = allEntries.filter(e => e.flight === 'B');
    const noFlightEntries = allEntries.filter(e => !e.flight || e.flight === '—');

    console.log('[Leaderboard] Flight A entries:', flightAEntries.length, 'Flight B entries:', flightBEntries.length, 'No flight:', noFlightEntries.length);

    if (noFlightEntries.length > 0) {
      console.log('[Leaderboard] Players without flight assignment found, putting them in Flight A');
      flightAEntries = [...flightAEntries, ...noFlightEntries];
    }

    flightAEntries.sort((a, b) => {
      if (a.netScore === b.netScore) return 0;
      return a.netScore - b.netScore;
    });
    flightBEntries.sort((a, b) => {
      if (a.netScore === b.netScore) return 0;
      return a.netScore - b.netScore;
    });

    const flightAWithPositions = flightAEntries.map((entry, index, arr) => {
      let position = index + 1;
      if (index > 0 && entry.netScore === arr[index - 1].netScore) {
        position = (arr[index - 1] as any)._tournamentPosition;
      }
      return { ...entry, position, _tournamentPosition: position };
    });

    const flightBWithPositions = flightBEntries.map((entry, index, arr) => {
      let position = index + 1;
      if (index > 0 && entry.netScore === arr[index - 1].netScore) {
        position = (arr[index - 1] as any)._tournamentPosition;
      }
      return { ...entry, position, _tournamentPosition: position };
    });

    const rolexEntries = [...allEntries]
      .sort((a, b) => a.netScore - b.netScore)
      .map((entry, index, arr) => {
        let position = index + 1;
        if (index > 0 && entry.netScore === arr[index - 1].netScore) {
          position = (arr[index - 1] as any)._rolexPosition;
        }
        return { ...entry, position, _rolexPosition: position };
      });

    return { flightA: flightAWithPositions, flightB: flightBWithPositions, rolex: rolexEntries };
  }, [eventQuery.data, membersQuery.data, registrationsQuery.data, scoresQuery.data, selectedDay, eventId]);

  const isLoading = eventQuery.isLoading || membersQuery.isLoading || registrationsQuery.isLoading || scoresQuery.isLoading;
  const isRefetching = scoresQuery.isFetching && !scoresQuery.isLoading;

  const event = eventQuery.data;
  const eventStatus = (event?.status === 'complete' || event?.status === 'completed') ? 'complete' : 
                      event?.status === 'locked' ? 'locked' : 
                      event?.status === 'active' ? 'active' : 'upcoming';
  const isLeaderboardLocked = eventStatus === 'locked';

  const handleDaySelect = useCallback((day: number | 'all' | 'rolex') => {
    setSelectedDay(day);
  }, []);

  const distributeMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !event) throw new Error('No event found');

      console.log('[Leaderboard] Starting points distribution');
      console.log('[Leaderboard] Settings:', orgInfo);

      const attendancePoints = Number(orgInfo?.rolexAttendancePoints || 10);
      const numberOfDays = event.numberOfDays || 1;

      const pointsByRank: { [rank: number]: number } = {};
      if (orgInfo?.rolexPlacementPoints) {
        try {
          orgInfo.rolexPlacementPoints.forEach((points, index) => {
            const rank = index + 1;
            const placementPoints = Number(points) || 0;
            pointsByRank[rank] = (attendancePoints + placementPoints) * numberOfDays;
          });
        } catch (error) {
          console.error('[Leaderboard] Error parsing points distribution:', error);
        }
      }

      console.log('[Leaderboard] Points by rank:', pointsByRank);
      console.log('[Leaderboard] Attendance points:', attendancePoints);
      console.log('[Leaderboard] Number of days:', numberOfDays);

      const rolexEntries = leaderboard.rolex;
      
      for (const entry of rolexEntries) {
        const pointsToAdd = pointsByRank[entry.position] || 0;
        const currentRolexPoints = entry.member.rolexPoints || 0;
        const newRolexPoints = currentRolexPoints + pointsToAdd;

        console.log(`[Leaderboard] ${entry.member.name}: rank ${entry.position}, adding ${pointsToAdd} points (${currentRolexPoints} -> ${newRolexPoints})`);

        await supabaseService.members.update(entry.member.id, {
          rolexPoints: newRolexPoints,
        });

        // Store in event_rolex_points table for historical records
        const placementPoints = Number(orgInfo?.rolexPlacementPoints?.[entry.position - 1] || 0);
        await supabase.from('event_rolex_points').upsert({
          event_id: eventId,
          member_id: entry.member.id,
          rank: entry.position,
          attendance_points: attendancePoints * numberOfDays,
          placement_points: placementPoints * numberOfDays,
          total_points: pointsToAdd,
          distributed_by: currentUser?.id,
        }, { onConflict: 'event_id,member_id' });
      }

      // Mark event as distributed
      await supabaseService.events.update(eventId, {
        rolexPointsDistributed: true,
        rolexPointsDistributedAt: new Date().toISOString(),
        rolexPointsDistributedBy: currentUser?.id,
      });

      console.log('[Leaderboard] ✅ Points distribution complete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      setLastUpdate(new Date());
      Alert.alert('Success', 'Rolex points have been distributed successfully!');
    },
    onError: (error) => {
      console.error('[Leaderboard] Distribution error:', error);
      Alert.alert('Error', 'Failed to distribute points. Please try again.');
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!eventId || !event) {
        console.error('[Leaderboard] Clear failed: No event found', { eventId, event });
        throw new Error('No event found');
      }

      console.log('[Leaderboard] ========== CLEARING POINTS ==========');
      console.log('[Leaderboard] Event ID:', eventId);

      // Fetch from event_rolex_points table
      const { data: existingDistribution, error: fetchError } = await supabase
        .from('event_rolex_points')
        .select('*')
        .eq('event_id', eventId);

      console.log('[Leaderboard] Fetch result:', { existingDistribution, fetchError });

      if (fetchError) {
        console.error('[Leaderboard] Error fetching distribution:', fetchError);
        throw fetchError;
      }

      if (!existingDistribution || existingDistribution.length === 0) {
        console.log('[Leaderboard] No distribution records found to clear');
        // Still update the event flag even if no records found
        await supabaseService.events.update(eventId, {
          rolexPointsDistributed: false,
          rolexPointsDistributedAt: null,
          rolexPointsDistributedBy: null,
        });
        console.log('[Leaderboard] Event flag cleared');
        return;
      }

      console.log('[Leaderboard] Found', existingDistribution.length, 'distribution records');
      
      for (const entry of existingDistribution) {
        console.log('[Leaderboard] Processing entry:', entry);
        
        const member = await supabaseService.members.get(entry.member_id);
        console.log('[Leaderboard] Member found:', member ? member.name : 'NOT FOUND');
        
        if (member) {
          const currentPoints = member.rolexPoints || 0;
          const pointsToRemove = entry.total_points || 0;
          const newPoints = Math.max(0, currentPoints - pointsToRemove);

          console.log(`[Leaderboard] ${member.name}: removing ${pointsToRemove} points (${currentPoints} -> ${newPoints})`);

          try {
            await supabaseService.members.update(member.id, {
              rolexPoints: newPoints,
            });
            console.log(`[Leaderboard] ✅ Updated ${member.name} rolexPoints to ${newPoints}`);
          } catch (updateError) {
            console.error(`[Leaderboard] ❌ Failed to update ${member.name}:`, updateError);
            throw updateError;
          }
        } else {
          console.warn('[Leaderboard] Member not found for id:', entry.member_id);
        }
      }

      // Delete from event_rolex_points table
      console.log('[Leaderboard] Deleting distribution records...');
      const { error: deleteError } = await supabase
        .from('event_rolex_points')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) {
        console.error('[Leaderboard] Error deleting distribution:', deleteError);
        throw deleteError;
      }
      console.log('[Leaderboard] ✅ Distribution records deleted');

      // Mark event as not distributed
      console.log('[Leaderboard] Updating event flag...');
      await supabaseService.events.update(eventId, {
        rolexPointsDistributed: false,
        rolexPointsDistributedAt: null,
        rolexPointsDistributedBy: null,
      });

      console.log('[Leaderboard] ========== POINTS CLEARED ==========');
    },
    onSuccess: () => {
      console.log('[Leaderboard] Clear mutation successful, invalidating queries...');
      // Invalidate all member queries (including those with timestamps)
      queryClient.invalidateQueries({ queryKey: ['members'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      // Force a new timestamp to trigger refetch
      const newTimestamp = new Date();
      setLastUpdate(newTimestamp);
      console.log('[Leaderboard] Queries invalidated, new timestamp:', newTimestamp.toISOString());
      Alert.alert('Success', 'Rolex points have been cleared successfully!');
    },
    onError: (error: any) => {
      console.error('[Leaderboard] Clear error:', error);
      console.error('[Leaderboard] Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', `Failed to clear points: ${error?.message || 'Unknown error'}`);
    },
  });

  const handleDistributePoints = () => {
    Alert.alert(
      'Distribute Points',
      'Are you sure you want to distribute Rolex points based on current rankings? This will add points to each player\'s total.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Distribute', 
          onPress: () => distributeMutation.mutate(),
          style: 'destructive'
        },
      ]
    );
  };

  const handleClearPoints = () => {
    Alert.alert(
      'Clear Points',
      'Are you sure you want to clear the distributed points for this event? This will subtract the previously awarded points.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: () => clearMutation.mutate(),
          style: 'destructive'
        },
      ]
    );
  };

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
            style={[styles.tabButton, styles.tabButtonLeft, selectedDay !== 'rolex' && styles.tabButtonActive]}
            onPress={() => handleDaySelect('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, selectedDay !== 'rolex' && styles.tabButtonTextActive]}>
              Tournament
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, styles.tabButtonRight, selectedDay === 'rolex' && styles.tabButtonActive]}
            onPress={() => handleDaySelect('rolex')}
            activeOpacity={0.7}
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

        {isLeaderboardLocked && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedBannerText}>⚠️ Leaderboard is temporarily locked by an admin</Text>
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
                <Award size={64} color="#999" />
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
                    styles.regularCard,
                    entry.position <= 3 && styles.leaderCard,
                    entry.position === 1 && { backgroundColor: '#FFFACD', borderLeftColor: '#FFD700', borderLeftWidth: 6 },
                    entry.position === 2 && { backgroundColor: '#F0F8FF', borderLeftColor: '#C0C0C0', borderLeftWidth: 6 },
                    entry.position === 3 && { backgroundColor: '#FFF8DC', borderLeftColor: '#CD7F32', borderLeftWidth: 6 },
                  ]}
                >
                  <View style={[
                    styles.positionBadge,
                    (entry.position === 1 || entry.position === 2 || entry.position === 3) && { backgroundColor: 'transparent' },
                  ]}>
                    {entry.position === 1 ? (
                      <Award size={56} color="#FFD700" strokeWidth={2.5} />
                    ) : entry.position === 2 ? (
                      <Award size={48} color="#C0C0C0" strokeWidth={2.5} />
                    ) : entry.position === 3 ? (
                      <Award size={48} color="#CD7F32" strokeWidth={2.5} />
                    ) : (
                      <Text style={styles.positionText}>#{entry.position}</Text>
                    )}
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{entry.member.name}</Text>
                    <Text style={styles.playerDetails}>
                      HDC: {entry.handicap}
                    </Text>
                    <Text style={styles.playerDetails}>
                      Rolex Flight: {entry.registration?.rolexFlight || entry.member.rolexFlight || entry.flight}
                    </Text>
                  </View>
                  <View style={styles.pointsContainer}>
                    <Text style={styles.pointsValue}>{formatScore(entry.netScore)}</Text>
                    <Text style={styles.pointsLabel}>net</Text>
                    <Text style={styles.pointsValue}>{entry.member.rolexPoints || 0}</Text>
                    <Text style={styles.pointsLabel}>rolex pts</Text>
                  </View>
                </View>
              ))
            )
          ) : leaderboard.flightA.length === 0 && leaderboard.flightB.length === 0 ? (
            <View style={styles.emptyState}>
              <Award size={64} color="#999" />
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
                    <Text style={styles.flightLabel}>FLIGHT A</Text>
                  </View>
                  {leaderboard.flightA.map((entry) => (
                    <View 
                      key={entry.member.id} 
                      style={[
                        styles.regularCard,
                        entry.position <= 3 && styles.leaderCard,
                        entry.position === 1 && { backgroundColor: '#FFFACD', borderLeftColor: '#FFD700', borderLeftWidth: 6 },
                        entry.position === 2 && { backgroundColor: '#F0F8FF', borderLeftColor: '#C0C0C0', borderLeftWidth: 6 },
                        entry.position === 3 && { backgroundColor: '#FFF8DC', borderLeftColor: '#CD7F32', borderLeftWidth: 6 },
                      ]}
                    >
                      <View style={[
                        styles.positionBadge,
                        (entry.position === 1 || entry.position === 2 || entry.position === 3) && { backgroundColor: 'transparent' },
                      ]}>
                        {entry.position === 1 ? (
                          <Award size={56} color="#FFD700" strokeWidth={2.5} />
                        ) : entry.position === 2 ? (
                          <Award size={48} color="#C0C0C0" strokeWidth={2.5} />
                        ) : entry.position === 3 ? (
                          <Award size={48} color="#CD7F32" strokeWidth={2.5} />
                        ) : (
                          <Text style={styles.positionText}>#{entry.position}</Text>
                        )}
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{entry.member.name}</Text>
                        <Text style={styles.playerDetails}>
                          HDC: {entry.handicap}
                        </Text>
                        <Text style={styles.playerDetails}>
                          Flight: {entry.flight}
                        </Text>
                        <Text style={styles.playerDetails}>
                          Rolex Flight: {entry.registration?.rolexFlight || entry.member.rolexFlight || entry.flight}
                        </Text>
                      </View>
                      <View style={styles.pointsContainer}>
                        <Text style={styles.pointsValue}>{formatScore(entry.netScore)}</Text>
                        <Text style={styles.pointsLabel}>net</Text>
                        <Text style={styles.pointsValue}>{formatScore(entry.grossScore)}</Text>
                        <Text style={styles.pointsLabel}>gross</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {leaderboard.flightB.length > 0 && (
                <>
                  <View style={styles.flightSeparator}>
                    <Text style={styles.flightLabel}>FLIGHT B</Text>
                  </View>
                  {leaderboard.flightB.map((entry) => (
                    <View 
                      key={entry.member.id} 
                      style={[
                        styles.regularCard,
                        entry.position <= 3 && styles.leaderCard,
                        entry.position === 1 && { backgroundColor: '#FFFACD', borderLeftColor: '#FFD700', borderLeftWidth: 6 },
                        entry.position === 2 && { backgroundColor: '#F0F8FF', borderLeftColor: '#C0C0C0', borderLeftWidth: 6 },
                        entry.position === 3 && { backgroundColor: '#FFF8DC', borderLeftColor: '#CD7F32', borderLeftWidth: 6 },
                      ]}
                    >
                      <View style={[
                        styles.positionBadge,
                        (entry.position === 1 || entry.position === 2 || entry.position === 3) && { backgroundColor: 'transparent' },
                      ]}>
                        {entry.position === 1 ? (
                          <Award size={56} color="#FFD700" strokeWidth={2.5} />
                        ) : entry.position === 2 ? (
                          <Award size={48} color="#C0C0C0" strokeWidth={2.5} />
                        ) : entry.position === 3 ? (
                          <Award size={48} color="#CD7F32" strokeWidth={2.5} />
                        ) : (
                          <Text style={styles.positionText}>#{entry.position}</Text>
                        )}
                      </View>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{entry.member.name}</Text>
                        <Text style={styles.playerDetails}>
                          HDC: {entry.handicap}
                        </Text>
                        <Text style={styles.playerDetails}>
                          Flight: {entry.flight}
                        </Text>
                        <Text style={styles.playerDetails}>
                          Rolex Flight: {entry.registration?.rolexFlight || entry.member.rolexFlight || entry.flight}
                        </Text>
                      </View>
                      <View style={styles.pointsContainer}>
                        <Text style={styles.pointsValue}>{formatScore(entry.netScore)}</Text>
                        <Text style={styles.pointsLabel}>net</Text>
                        <Text style={styles.pointsValue}>{formatScore(entry.grossScore)}</Text>
                        <Text style={styles.pointsLabel}>gross</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <EventFooter 
        showRolexButtons={selectedDay === 'rolex' && currentUser?.isAdmin}
        onDistributePoints={handleDistributePoints}
        onClearPoints={handleClearPoints}
        isDistributing={distributeMutation.isPending}
        isClearing={clearMutation.isPending}
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 58,
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
    backgroundColor: '#f5f5f5',
  },
  tabButton: {
    flex: 1,
    height: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 0,
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonLeft: {
    borderLeftWidth: 2,
    borderRightWidth: 1,
  },
  tabButtonRight: {
    borderLeftWidth: 1,
    borderRightWidth: 2,
  },
  tabButtonActive: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#666',
  },
  tabButtonTextActive: {
    color: '#fff',
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
  regularCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  leaderCard: {
    backgroundColor: '#FFFACD',
    borderColor: '#FFB347',
    borderWidth: 2,
    borderRadius: 12,
  },
  positionBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2196F3',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  leaderBadge: {
    backgroundColor: '#fff',
  },
  positionText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#D32F2F',
    marginBottom: 8,
  },
  playerDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#D32F2F',
    marginBottom: 2,
  },
  pointsContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFB300',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#999',
  },
  totalScoreLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#666',
    marginTop: 8,
    textAlign: 'center' as const,
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
  podiumCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  lockedBanner: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  lockedBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center' as const,
  },
});
