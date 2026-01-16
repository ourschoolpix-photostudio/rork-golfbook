import React, { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { Alert } from '@/utils/alertPolyfill';
import { useQuery, useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Star } from 'lucide-react-native';

import { EventFooter } from '@/components/EventFooter';
import { TeeHoleIndicator } from '@/components/TeeHoleIndicator';
import { authService } from '@/utils/auth';
import { Member, User, Grouping, Event } from '@/types';
import { supabaseService } from '@/utils/supabaseService';
import { getDisplayHandicap, getHandicapLabel } from '@/utils/handicapHelper';
import { useRealtimeScores, useRealtimeGroupings } from '@/utils/useRealtimeSubscription';
import { useOfflineMode } from '@/contexts/OfflineModeContext';

export default function ScoringScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [currentHole, setCurrentHole] = useState<number>(1);

  const [myGroup, setMyGroup] = useState<Member[]>([]);
  const [myGrouping, setMyGrouping] = useState<Grouping | null>(null);
  const [doubleMode, setDoubleMode] = useState<boolean>(false);
  const [holeScores, setHoleScores] = useState<{ [playerId: string]: { [hole: number]: number } }>({});
  const [scoreMeOnly, setScoreMeOnly] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [useCourseHandicap, setUseCourseHandicap] = useState<boolean>(false);
  const [isDayLocked, setIsDayLocked] = useState<boolean>(false);
  const [lastDayTap, setLastDayTap] = useState<{ day: number; time: number } | null>(null);

  const { data: eventData, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => supabaseService.events.get(eventId || ''),
    enabled: !!eventId,
    retry: 2,
    staleTime: 30000,
    refetchInterval: 30000,
  });
  const { data: allMembers = [], isLoading: membersLoading, error: membersError } = useQuery({
    queryKey: ['members'],
    queryFn: () => supabaseService.members.getAll(),
    retry: 2,
    staleTime: 60000,
  });
  const { data: eventRegistrations = [], isLoading: registrationsLoading, error: registrationsError } = useQuery({
    queryKey: ['registrations', eventId],
    queryFn: () => supabaseService.registrations.getAll(eventId || ''),
    enabled: !!eventId,
    retry: 2,
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const { data: eventGroupings = [], isLoading: groupingsLoading, error: groupingsError } = useQuery({
    queryKey: ['groupings', eventId],
    queryFn: () => supabaseService.groupings.getAll(eventId || ''),
    enabled: !!eventId,
    retry: 2,
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const { data: eventScores = [], isLoading: scoresLoading, refetch: refetchScores, error: scoresError } = useQuery({
    queryKey: ['scores', eventId],
    queryFn: () => supabaseService.scores.getAll(eventId || ''),
    enabled: !!eventId,
    retry: 2,
    staleTime: 10000,
    refetchInterval: 20000,
  });
  const { shouldUseOfflineMode } = useOfflineMode();
  
  useRealtimeScores(eventId || '', !!eventId);
  useRealtimeGroupings(eventId || '', !!eventId);
  
  const submitScoreMutation = useMutation({
    mutationFn: ({ eventId, memberId, day, holes, totalScore, submittedBy }: any) =>
      supabaseService.scores.submit(eventId, memberId, day, holes, totalScore, submittedBy),
  });

  const getHoleAtIndex = (leadingHole: number, groupIndex: number): number => {
    let hole = leadingHole - groupIndex;
    while (hole < 1) {
      hole += 18;
    }
    return hole;
  };

  const updateHoleBasedOnStartType = useCallback((golfEvent: Event, grouping: Grouping, dayNumber: number, isDoubleMode: boolean) => {
    const dayKey = `day${dayNumber}StartType` as keyof Event;
    const startType = golfEvent[dayKey] as string | undefined;
    
    console.log('[scoring] updateHoleBasedOnStartType - Day:', dayNumber, 'Start type:', startType, 'Double mode:', isDoubleMode);
    
    if (startType === 'tee time') {
      console.log('[scoring] Tee time start detected. Setting starting hole to 1');
      setCurrentHole(1);
    } else if (startType === 'shotgun') {
      const leadingHoleKey = `day${dayNumber}LeadingHole` as keyof Event;
      const leadingHole = golfEvent[leadingHoleKey] as string | undefined;
      
      if (leadingHole) {
        const leadingHoleNum = parseInt(leadingHole, 10);
        let groupIndex = grouping.hole - 1;
        
        if (isDoubleMode) {
          groupIndex = Math.floor(groupIndex / 2);
        }
        
        const actualHole = getHoleAtIndex(leadingHoleNum, groupIndex);
        console.log('[scoring] Shotgun start. Leading hole:', leadingHoleNum, 'Group index:', groupIndex, 'Double mode:', isDoubleMode, 'Actual starting hole:', actualHole);
        setCurrentHole(actualHole);
      } else {
        console.log('[scoring] Shotgun start detected. Setting starting hole to:', grouping.hole);
        setCurrentHole(grouping.hole);
      }
    } else {
      console.log('[scoring] Unknown start type, defaulting to hole 1');
      setCurrentHole(1);
    }
  }, []);

  useEffect(() => {
    const loadCourseHandicapSetting = async () => {
      if (eventId) {
        try {
          const key = `useCourseHandicap_${eventId}`;
          const value = await AsyncStorage.getItem(key);
          if (value !== null) {
            const shouldUseCourseHandicap = value === 'true';
            setUseCourseHandicap(prev => {
              if (prev !== shouldUseCourseHandicap) {
                console.log('[scoring] Loaded course handicap setting:', shouldUseCourseHandicap);
                return shouldUseCourseHandicap;
              }
              return prev;
            });
          }
        } catch (error) {
          console.error('[scoring] Error loading course handicap setting:', error);
        }
      }
    };
    
    loadCourseHandicapSetting();
    
    const interval = setInterval(() => {
      loadCourseHandicapSetting();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [eventId]);

  const loadMyGroup = useCallback(async (golfEvent: Event, userId: string, dayNumber: number, groupings: any[], members: any[], registrations: any[]) => {
    try {
      if (groupingsLoading || membersLoading || registrationsLoading) {
        console.log('[scoring] Waiting for data to load...');
        return;
      }

      if (groupings.length === 0) {
        console.log('[scoring] No groupings found');
        setMyGroup([]);
        setMyGrouping(null);
        return;
      }

      const isDoubleMode = false;
      setDoubleMode(isDoubleMode);
      console.log('[scoring] Double mode for this event/day:', isDoubleMode);

      const dayGroupings = groupings.filter((g: any) => g.day === dayNumber);

      for (const grouping of dayGroupings) {
        if (grouping.slots.includes(userId)) {
          const groupMembers = grouping.slots
            .filter((id: string | null): id is string => id !== null)
            .map((id: string) => {
              const member = members.find((m: any) => m.id === id);
              if (!member) return null;
              
              const registration = registrations.find((r: any) => r.memberId === id);
              const effectiveHandicap = getDisplayHandicap(member, registration, golfEvent, useCourseHandicap, dayNumber);
              
              console.log(`[scoring] 🎯 Player ${member.name}: memberId=${id}, registration found=${!!registration}, base handicap=${member.handicap}, adjusted=${registration?.adjustedHandicap}, effective=${effectiveHandicap}, useCourseHandicap=${useCourseHandicap}`);
              if (registration) {
                console.log(`[scoring] 📋 Registration details:`, JSON.stringify(registration));
              }
              
              return {
                ...member,
                effectiveHandicap,
                registration: registration || undefined,
              } as Member & { effectiveHandicap: number; registration?: any };
            })
            .filter((m: Member & { effectiveHandicap: number; registration?: any } | null): m is Member & { effectiveHandicap: number; registration?: any } => m !== null && typeof m.effectiveHandicap === 'number');
          
          console.log('[scoring] 🔍 Checking if players are still in registration...');
          console.log('[scoring] Registered players:', golfEvent.registeredPlayers || []);
          console.log('[scoring] Group members found:', groupMembers.map((m: Member & { effectiveHandicap: number; registration?: any }) => m ? { id: m.id, name: m.name } : null).filter(Boolean));
          
          const validGroupMembers = groupMembers.filter((member: Member & { effectiveHandicap: number; registration?: any }) => 
            member && (golfEvent.registeredPlayers || []).includes(member.id)
          );
          
          console.log('[scoring] Valid members (still registered):', validGroupMembers.map((m: Member & { effectiveHandicap: number; registration?: any }) => m?.name).filter(Boolean));
          
          if (validGroupMembers.length === 0) {
            console.log('[scoring] ⚠️ No valid players found in group - all have been removed from registration');
            setMyGroup([]);
            setMyGrouping(null);
            return;
          }
          
          setMyGroup(validGroupMembers as Member[]);
          setMyGrouping(grouping);
          console.log('[scoring] Found my group:', validGroupMembers.map((m: Member & { effectiveHandicap: number; registration?: any }) => m.name));
          console.log('[scoring] Group hole number:', grouping.hole);
          
          updateHoleBasedOnStartType(golfEvent, grouping, dayNumber, isDoubleMode);
          return;
        }
      }

      console.log('[scoring] User not found in any grouping');
      setMyGroup([]);
      setMyGrouping(null);
    } catch (error) {
      console.error('[scoring] Error loading my group:', error);
      setMyGroup([]);
      setMyGrouping(null);
    }
  }, [updateHoleBasedOnStartType, useCourseHandicap, groupingsLoading, membersLoading, registrationsLoading]);

  useEffect(() => {
    const loadScores = () => {
      try {
        if (!eventId || scoresLoading || eventScores.length === 0) return;
        
        const scoresMap: { [playerId: string]: { [hole: number]: number } } = {};

        const dayScores = eventScores.filter((s: any) => s.day === selectedDay);
        dayScores.forEach((score: any) => {
          const holes: { [hole: number]: number } = {};
          (score.holes || []).forEach((holeScore: number, index: number) => {
            if (holeScore > 0) {
              holes[index + 1] = holeScore;
            }
          });
          scoresMap[score.memberId] = holes;
        });

        setHoleScores(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(scoresMap);
          if (hasChanged) {
            console.log('[scoring] Loaded scores for day', selectedDay, ':', scoresMap);
            return scoresMap;
          }
          return prev;
        });
      } catch (error) {
        console.error('[scoring] Error loading scores:', error);
      }
    };
    
    loadScores();
  }, [eventId, selectedDay, scoresLoading, eventScores]);

  useEffect(() => {
    const loadUser = async () => {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (eventData) {
      setEvent(eventData as Event);
    }
  }, [eventData]);

  useEffect(() => {
    if (event && currentUser && eventId && !groupingsLoading && !membersLoading && !registrationsLoading && eventGroupings.length > 0) {
      console.log('[scoring] Loading group for day:', selectedDay);
      loadMyGroup(event, currentUser.id, selectedDay, eventGroupings, allMembers, eventRegistrations);
    }
  }, [event, currentUser, eventId, selectedDay, groupingsLoading, membersLoading, registrationsLoading, eventGroupings, allMembers, eventRegistrations, loadMyGroup]);

  useEffect(() => {
    if (event && currentUser && eventId && !groupingsLoading && !membersLoading && !registrationsLoading && eventGroupings.length > 0) {
      console.log('[scoring] useCourseHandicap changed, recalculating handicaps:', useCourseHandicap);
      loadMyGroup(event, currentUser.id, selectedDay, eventGroupings, allMembers, eventRegistrations);
    }
  }, [useCourseHandicap, event, currentUser, eventId, groupingsLoading, membersLoading, registrationsLoading, eventGroupings, allMembers, eventRegistrations, selectedDay, loadMyGroup]);



  const handlePreviousHole = () => {
    setCurrentHole(prev => {
      if (prev === 1) return 18;
      return prev - 1;
    });
  };

  const handleNextHole = () => {
    setCurrentHole(prev => {
      if (prev === 18) return 1;
      return prev + 1;
    });
  };

  const getHolePar = (): number => {
    if (!event) return 4;
    const dayKey = `day${selectedDay}HolePars` as keyof Event;
    const holePars = event[dayKey] as string[] | undefined;
    if (!holePars || !holePars[currentHole - 1]) return 4;
    return parseInt(holePars[currentHole - 1], 10) || 4;
  };

  const handleScoreChange = async (playerId: string, delta: number) => {
    if (!eventId) return;

    const holePar = getHolePar();
    const currentScore = holeScores[playerId]?.[currentHole] || 0;
    
    let newScore: number;
    if (currentScore === 0) {
      newScore = holePar + delta;
    } else {
      newScore = currentScore + delta;
    }
    newScore = Math.max(1, newScore);

    setHoleScores(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || {}),
        [currentHole]: newScore,
      },
    }));

    console.log(`[scoring] Updated hole ${currentHole} score for player ${playerId}:`, newScore);
  };

  const handleSetPar = async (playerId: string) => {
    if (!eventId) return;

    const holePar = getHolePar();
    const currentScore = holeScores[playerId]?.[currentHole] || 0;

    if (currentScore === holePar) {
      setHoleScores(prev => {
        const newScores = { ...prev };
        if (newScores[playerId]) {
          newScores[playerId] = { ...newScores[playerId] };
          delete newScores[playerId][currentHole];
        }
        return newScores;
      });

      console.log(`[scoring] Reset score for hole ${currentHole}, player ${playerId}`);
    } else {
      setHoleScores(prev => ({
        ...prev,
        [playerId]: {
          ...(prev[playerId] || {}),
          [currentHole]: holePar,
        },
      }));

      console.log(`[scoring] Set par for hole ${currentHole}, player ${playerId}:`, holePar);
    }
  };

  const getTotalScore = (playerId: string): number => {
    const playerScores = holeScores[playerId] || {};
    return Object.values(playerScores).reduce((sum, score) => sum + score, 0);
  };

  const isPlayerScoringComplete = (playerId: string): boolean => {
    const playerScores = holeScores[playerId] || {};
    const scoredHoles = Object.keys(playerScores).filter(hole => playerScores[Number(hole)] > 0);
    return scoredHoles.length === 18;
  };

  const handleSubmitScores = async () => {
    if (!eventId || !currentUser) return;

    if (shouldUseOfflineMode) {
      Alert.alert(
        'Offline Mode',
        'You are currently offline or in offline mode. Scores cannot be submitted. Please go online to submit scores.',
        [{ text: 'OK' }]
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const scoresSubmitted = [];
      const submissionPromises = [];
      
      for (const player of myGroup) {
        if (player && player.id) {
          const playerScores = holeScores[player.id] || {};
          const holesArray = Array(18).fill(null);
          
          Object.entries(playerScores).forEach(([hole, score]) => {
            const holeNum = parseInt(hole, 10);
            if (holeNum >= 1 && holeNum <= 18) {
              holesArray[holeNum - 1] = score;
            }
          });
          
          const totalScore = getTotalScore(player.id);
          
          if (totalScore > 0) {
            submissionPromises.push(
              submitScoreMutation.mutateAsync({
                eventId: eventId!,
                memberId: player.id,
                day: selectedDay,
                holes: holesArray,
                totalScore,
                submittedBy: currentUser.id,
              })
            );
            scoresSubmitted.push(player.name);
          }
        }
      }

      if (scoresSubmitted.length === 0) {
        Alert.alert('No Scores', 'Please enter at least one score before submitting.');
        setIsSubmitting(false);
        return;
      }

      await Promise.all(submissionPromises);
      console.log('[scoring] ✅ Submitted scores atomically for:', scoresSubmitted);
      
      await refetchScores();
      
      Alert.alert(
        'Success',
        `Scores submitted successfully for Day ${selectedDay}!\n\nLeaderboard will update automatically.`,
        [{ 
          text: 'OK',
          onPress: () => handleNextHole()
        }]
      );
    } catch (error) {
      console.error('[scoring] Error submitting scores:', error);
      Alert.alert('Error', 'Failed to submit scores. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlayerOrder = (): { player: Member; originalIndex: number }[] => {
    if (myGroup.length === 0 || !currentUser) return [];

    const currentUserIndex = myGroup.findIndex(m => m.id === currentUser.id);
    
    if (currentUserIndex === -1) {
      return myGroup.filter(Boolean).map((player, i) => ({ player, originalIndex: i }));
    }

    const orderedPlayers: { player: Member; originalIndex: number }[] = [];
    
    orderedPlayers.push({ player: myGroup[currentUserIndex], originalIndex: currentUserIndex });
    
    const cartPartnerIndex = currentUserIndex % 2 === 0 ? currentUserIndex + 1 : currentUserIndex - 1;
    if (myGroup[cartPartnerIndex]) {
      orderedPlayers.push({ player: myGroup[cartPartnerIndex], originalIndex: cartPartnerIndex });
    }
    
    for (let i = 0; i < myGroup.length; i++) {
      if (i !== currentUserIndex && i !== cartPartnerIndex && myGroup[i]) {
        orderedPlayers.push({ player: myGroup[i], originalIndex: i });
      }
    }
    
    return orderedPlayers.filter(item => item.player);
  };

  const playersInOrder = getPlayerOrder();

  const playerLabels = [
    'CART 1 - Driver',
    'CART 1 - Passenger',
    'CART 2 - Driver',
    'CART 2 - Passenger',
  ];

  const isLoading = eventLoading || membersLoading || registrationsLoading || groupingsLoading || scoresLoading;
  const hasErrors = eventError || membersError || registrationsError || groupingsError || scoresError;
  
  console.log('[scoring] 🔍 Loading states:', {
    eventLoading,
    membersLoading,
    registrationsLoading,
    groupingsLoading,
    scoresLoading,
    hasEventData: !!eventData,
    hasMembersData: allMembers.length,
    hasRegistrationsData: eventRegistrations.length,
    hasGroupingsData: eventGroupings.length,
    hasScoresData: eventScores.length,
    myGroupLength: myGroup.length,
  });
  
  if (hasErrors) {
    console.error('[scoring] ❌ Query errors:', {
      eventError,
      membersError,
      registrationsError,
      groupingsError,
      scoresError,
    });
  }
  
  if (isLoading) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>SCORING</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
            <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>Fetching event data</Text>
            {hasErrors && (
              <Text style={{ fontSize: 12, color: '#d32f2f', marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }}>
                Error loading data. Check console for details.
              </Text>
            )}
          </View>
        </SafeAreaView>
        <EventFooter />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>SCORING</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#666' }}>Event not found</Text>
          </View>
        </SafeAreaView>
        <EventFooter />
      </>
    );
  }

  const eventStatus = (event?.status === 'complete' || event?.status === 'completed') ? 'complete' : 
                      event?.status === 'locked' ? 'locked' : 
                      event?.status === 'active' ? 'active' : 'upcoming';

  const isAdmin = currentUser?.isAdmin ?? false;
  const canModifyScores = eventStatus === 'active' || (isAdmin && eventStatus !== 'complete');

  if (myGroup.length === 0) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>SCORING</Text>
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

          <View style={styles.emptyStateContainer}>
            <Ionicons name="people" size={64} color="#999" />
            <Text style={styles.emptyStateTitle}>Not Grouped</Text>
            <Text style={styles.emptyStateText}>
              You are not assigned to a group for this event.
            </Text>
            <Text style={styles.emptyStateText}>
              Please contact an admin to be assigned to a group.
            </Text>
          </View>
        </SafeAreaView>
        <EventFooter />
      </>
    );
  }

  if (!canModifyScores) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>SCORING</Text>
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

          <View style={styles.emptyStateContainer}>
            <Ionicons name="lock-closed" size={64} color="#999" />
            <Text style={styles.emptyStateTitle}>
              {eventStatus === 'upcoming' ? 'Scoring Not Started' : 
               eventStatus === 'locked' ? 'Scoring Locked' : 'Event Complete'}
            </Text>
            <Text style={styles.emptyStateText}>
              {eventStatus === 'upcoming' 
                ? 'Scoring is locked until the event starts. An admin must change the status to Active.'
                : eventStatus === 'locked'
                ? 'Scoring is temporarily locked by an admin. Check back soon.'
                : 'This event is complete and scores are finalized. No modifications allowed.'}
            </Text>
          </View>
        </SafeAreaView>
        <EventFooter />
      </>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SCORING</Text>
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

        <TeeHoleIndicator
          event={event}
          grouping={myGrouping}
          selectedDay={selectedDay}
          doubleMode={doubleMode}
        />

        <View style={styles.controlsRow}>
          {event.numberOfDays && event.numberOfDays > 1 && Array.from({ length: event.numberOfDays }, (_, i) => i + 1).map(day => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                selectedDay === day && styles.dayButtonActive,
                selectedDay === day && isDayLocked && styles.dayButtonLocked,
              ]}
              onPress={() => {
                const now = Date.now();
                
                if (selectedDay === day) {
                  if (lastDayTap && lastDayTap.day === day && now - lastDayTap.time < 500) {
                    setIsDayLocked(!isDayLocked);
                    Alert.alert(
                      isDayLocked ? 'Day Unlocked' : 'Day Locked',
                      isDayLocked
                        ? `Day ${day} is now unlocked. You can switch between days.`
                        : `Day ${day} is now locked. Double-tap again to unlock.`,
                      [{ text: 'OK' }]
                    );
                    setLastDayTap(null);
                  } else {
                    setLastDayTap({ day, time: now });
                  }
                } else {
                  if (isDayLocked) {
                    Alert.alert(
                      'Day Locked',
                      `Day ${selectedDay} is locked. Double-tap Day ${selectedDay} to unlock before switching.`,
                      [{ text: 'OK' }]
                    );
                  } else {
                    setSelectedDay(day);
                    setLastDayTap(null);
                  }
                }
              }}
            >
              <View style={styles.dayButtonContent}>
                <Text style={[styles.dayButtonText, selectedDay === day && styles.dayButtonTextActive]}>
                  Day {day}
                </Text>
                {selectedDay === day && isDayLocked && (
                  <Ionicons name="lock-closed" size={14} color="#fff" style={styles.lockIcon} />
                )}
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.scoreMeOnlyButton, scoreMeOnly && styles.scoreMeOnlyButtonActive]}
            onPress={() => setScoreMeOnly(!scoreMeOnly)}
          >
            <Text style={[styles.scoreMeOnlyText, scoreMeOnly && styles.scoreMeOnlyTextActive]}>
              {scoreMeOnly ? 'Score All' : 'Score Me Only'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.holeNavigator}>
          <TouchableOpacity style={styles.holeNavBtn} onPress={handlePreviousHole}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.holeIndicator}>
            <Text style={styles.holeLabel}>HOLE</Text>
            <Text style={styles.holeNumber}>{currentHole}</Text>
          </View>

          <TouchableOpacity style={styles.holeNavBtn} onPress={handleNextHole}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {playersInOrder
            .filter(({ player }) => !scoreMeOnly || player.id === currentUser?.id)
            .map(({ player, originalIndex }) => {
            if (!player) return null;

            const currentScore = holeScores[player.id]?.[currentHole] || 0;
            const totalScore = getTotalScore(player.id);
            const handicap = player.effectiveHandicap ?? player.handicap ?? 0;
            
            console.log(`[scoring] 🎯 DISPLAY - Player ${player.name}: effectiveHandicap=${player.effectiveHandicap}, baseHandicap=${player.handicap}, using=${handicap}, hasRegistration=${!!player.registration}`);
            if (player.registration?.adjustedHandicap) {
              console.log(`[scoring] ✅ Has adjusted handicap in registration:`, player.registration.adjustedHandicap);
            }
            
            const holePar = getHolePar();
            const hasScore = currentScore > 0;
            const scoreToPar = hasScore ? currentScore - holePar : 0;
            const isBirdie = scoreToPar === -1;
            const isEagle = scoreToPar === -2;

            const isScoringComplete = isPlayerScoringComplete(player.id);

            return (
              <View key={player.id} style={styles.playerCard}>
                <View style={styles.playerHeader}>
                  <View style={styles.playerInfo}>
                    <View style={styles.playerNameRow}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      {isScoringComplete && (
                        <View style={styles.completeBadge}>
                          <Text style={styles.completeBadgeText}>SCORING COMPLETE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.playerLabel}>{playerLabels[originalIndex]}</Text>
                    <Text style={styles.playerHandicap}>{getHandicapLabel(player, player.registration, useCourseHandicap, event, selectedDay)} {handicap}</Text>
                  </View>
                  <View style={styles.totalScoreBox}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalScore}>{totalScore}</Text>
                  </View>
                </View>

                <View style={styles.scoreControls}>
                  <TouchableOpacity
                    style={styles.minusButton}
                    onPress={() => handleScoreChange(player.id, -1)}
                  >
                    <Ionicons name="remove" size={28} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.scoreDisplay, isScoringComplete && styles.scoreDisplayComplete]}
                    onPress={() => handleSetPar(player.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.scoreValue, hasScore && styles.scoreValueActive]}>
                      {hasScore ? currentScore : holePar}
                    </Text>
                    {isBirdie && (
                      <View style={styles.badgeContainer}>
                        <Star size={20} color="#2196F3" fill="#2196F3" />
                      </View>
                    )}
                    {isEagle && (
                      <View style={styles.badgeContainer}>
                        <Star size={20} color="#d32f2f" fill="#d32f2f" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.plusButton}
                    onPress={() => handleScoreChange(player.id, 1)}
                  >
                    <Ionicons name="add" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.submitContainer}>
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmitScores}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'SUBMIT SCORES'}
            </Text>
            {!isSubmitting && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
          </TouchableOpacity>
        </View>
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
    paddingVertical: 16,
    paddingTop: 58,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
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
  holeNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ADD8E6',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  holeNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeIndicator: {
    alignItems: 'center',
  },
  holeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  holeNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1B5E20',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  completeBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  completeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  playerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  playerHandicap: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
  },
  totalScoreBox: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  totalScore: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B5E20',
  },
  scoreControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  minusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d32f2f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDisplay: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
    borderWidth: 2.5,
    borderColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  scoreDisplayComplete: {
    backgroundColor: '#ff9800',
    borderColor: '#ff9800',
  },
  scoreValue: {
    fontSize: 29,
    fontWeight: '700',
    color: '#ccc',
  },
  scoreValueActive: {
    color: '#2196F3',
  },
  badgeContainer: {
    position: 'absolute' as const,
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#1B5E20',
  },
  dayButtonLocked: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  dayButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1B5E20',
    textAlign: 'center',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  lockIcon: {
    marginLeft: 2,
  },
  scoreMeOnlyButton: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreMeOnlyButtonActive: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  scoreMeOnlyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  scoreMeOnlyTextActive: {
    color: '#fff',
  },
  submitContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDB813',
    paddingVertical: 16,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
