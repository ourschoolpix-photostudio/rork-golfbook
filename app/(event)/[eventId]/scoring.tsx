import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Alert } from '@/utils/alertPolyfill';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Star } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { EventFooter } from '@/components/EventFooter';
import { TeeHoleIndicator } from '@/components/TeeHoleIndicator';
import { EventScreenHeader } from '@/components/EventScreenHeader';
import { authService } from '@/utils/auth';
import { Member, User, Grouping, Event } from '@/types';
import { supabaseService } from '@/utils/supabaseService';
import { supabase } from '@/integrations/supabase/client';
import { getDisplayHandicap, getHandicapLabel } from '@/utils/handicapHelper';
import { useRealtimeScores, useRealtimeGroupings } from '@/utils/useRealtimeSubscription';
import { useOfflineMode } from '@/contexts/OfflineModeContext';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDayLocked, setIsDayLocked] = useState<boolean>(false);
  const [lastDayTap, setLastDayTap] = useState<{ day: number; time: number } | null>(null);
  
  // Local state for useCourseHandicap - updated instantly via realtime subscription (like AlertsContext pattern)
  const [useCourseHandicap, setUseCourseHandicap] = useState<boolean>(false);
  const hasInitializedCourseHandicap = useRef(false);
  const useCourseHandicapRef = useRef(useCourseHandicap);
  const queryClient = useQueryClient();
  
  // Keep ref in sync with state for logging in realtime callback
  useEffect(() => {
    useCourseHandicapRef.current = useCourseHandicap;
  }, [useCourseHandicap]);

  const { data: eventData, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => supabaseService.events.get(eventId || ''),
    enabled: !!eventId,
    retry: 2,
    staleTime: 0,
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
  
  // Direct realtime subscription for event changes (AlertsContext pattern for instant updates)
  useEffect(() => {
    if (!eventId) return;

    console.log('[scoring] 🔴 Setting up direct realtime subscription for event:', eventId);

    let eventChannel: RealtimeChannel | null = null;

    try {
      eventChannel = supabase
        .channel(`scoring-event-${eventId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events',
            filter: `id=eq.${eventId}`,
          },
          async (payload) => {
            try {
              console.log('[scoring] 🎯 Event change detected via direct subscription:', payload.eventType);
              
              // Immediately fetch fresh event data and update local state (AlertsContext pattern)
              const freshEvent = await supabaseService.events.get(eventId);
              if (freshEvent) {
                const newUseCourseHandicap = freshEvent.useCourseHandicap === true;
                console.log('[scoring] ✅ Immediately updating useCourseHandicap from', useCourseHandicapRef.current, 'to', newUseCourseHandicap);
                setUseCourseHandicap(newUseCourseHandicap);
                setEvent(freshEvent as Event);
                
                // Also update the query cache for consistency
                queryClient.setQueryData(['events', eventId], freshEvent);
              }
            } catch (error) {
              console.error('[scoring] Error handling event change:', error);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[scoring] ✅ Subscribed to event realtime channel');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.log('[scoring] Event realtime not available - using query refresh');
          }
        });
    } catch (error) {
      console.log('[scoring] Error setting up event subscription:', error);
    }

    return () => {
      try {
        if (eventChannel) {
          console.log('[scoring] 🔴 Unsubscribing from event channel');
          supabase.removeChannel(eventChannel);
        }
      } catch {
        // Silently handle cleanup errors
      }
    };
  }, [eventId, queryClient]);
  
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

  // Initialize useCourseHandicap from eventData when it first loads
  useEffect(() => {
    if (eventData && !hasInitializedCourseHandicap.current) {
      const initialValue = eventData.useCourseHandicap === true;
      console.log('[scoring] 🎯 Initializing useCourseHandicap from eventData:', initialValue);
      setUseCourseHandicap(initialValue);
      hasInitializedCourseHandicap.current = true;
    }
  }, [eventData]);
  
  // Also sync when eventData changes (for when returning to screen)
  useEffect(() => {
    if (eventData && hasInitializedCourseHandicap.current) {
      const newValue = eventData.useCourseHandicap === true;
      if (newValue !== useCourseHandicapRef.current) {
        console.log('[scoring] 🔄 Syncing useCourseHandicap from eventData:', newValue);
        setUseCourseHandicap(newValue);
      }
    }
  }, [eventData]);
  
  useEffect(() => {
    console.log('[scoring] 🎯 useCourseHandicap value:', useCourseHandicap);
  }, [useCourseHandicap]);

  // Subscribe to query cache changes for immediate toggle sync
  useEffect(() => {
    if (!eventId) return;
    
    const unsubscribe = queryClient.getQueryCache().subscribe((cacheEvent) => {
      if (cacheEvent?.query?.queryKey?.[0] === 'events' && cacheEvent?.query?.queryKey?.[1] === eventId) {
        const data = cacheEvent?.query?.state?.data as Event | undefined;
        if (data?.useCourseHandicap !== undefined && data.useCourseHandicap !== useCourseHandicapRef.current) {
          console.log('[scoring] 🔄 Query cache changed, updating useCourseHandicap:', data.useCourseHandicap);
          setUseCourseHandicap(data.useCourseHandicap);
        }
      }
    });
    
    return () => unsubscribe();
  }, [eventId, queryClient]);

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
      
      // Use local useCourseHandicap state which is updated immediately via realtime
      const useCourseHandicapForEvent = useCourseHandicapRef.current;
      console.log('[scoring] 🎯 Using course handicap mode from local state (ref):', useCourseHandicapForEvent);

      for (const grouping of dayGroupings) {
        if (grouping.slots.includes(userId)) {
          const groupMembers = grouping.slots
            .filter((id: string | null): id is string => id !== null)
            .map((id: string) => {
              const member = members.find((m: any) => m.id === id);
              if (!member) return null;
              
              const registration = registrations.find((r: any) => r.memberId === id);
              const effectiveHandicap = getDisplayHandicap(member, registration, golfEvent, useCourseHandicapForEvent, dayNumber);
              
              console.log(`[scoring] 🎯 Player ${member.name}: memberId=${id}, registration found=${!!registration}, base handicap=${member.handicap}, adjusted=${registration?.adjustedHandicap}, effective=${effectiveHandicap}, useCourseHandicap=${useCourseHandicapForEvent}`);
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
  }, [updateHoleBasedOnStartType, groupingsLoading, membersLoading, registrationsLoading]);

  const loadScoresFromLocalStorage = useCallback(async () => {
    if (!eventId) return null;
    try {
      const storageKey = `@golf_offline_scores_${eventId}_day${selectedDay}`;
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsedScores = JSON.parse(stored);
        console.log('[scoring] 📂 Loaded scores from local storage:', parsedScores);
        return parsedScores;
      }
    } catch (error) {
      console.error('[scoring] Error loading scores from local storage:', error);
    }
    return null;
  }, [eventId, selectedDay]);

  useEffect(() => {
    const loadScores = async () => {
      try {
        if (!eventId) return;
        
        if (shouldUseOfflineMode) {
          const localScores = await loadScoresFromLocalStorage();
          if (localScores) {
            console.log('[scoring] Loading from local storage (offline mode)');
            setHoleScores(localScores);
            return;
          }
        }
        
        if (scoresLoading || eventScores.length === 0) return;
        
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
  }, [eventId, selectedDay, scoresLoading, eventScores, shouldUseOfflineMode, loadScoresFromLocalStorage]);

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
    // Use local event state (updated immediately by realtime) or fall back to eventData
    const currentEvent = event || eventData;
    if (currentEvent && currentUser && eventId && !groupingsLoading && !membersLoading && !registrationsLoading && eventGroupings.length > 0) {
      console.log('[scoring] 🔄 Loading/reloading group. useCourseHandicap:', useCourseHandicap, 'day:', selectedDay, 'eventUseCourseHandicap:', currentEvent.useCourseHandicap);
      loadMyGroup(currentEvent as Event, currentUser.id, selectedDay, eventGroupings, allMembers, eventRegistrations);
    }
  }, [event, eventData, useCourseHandicap, currentUser, eventId, selectedDay, groupingsLoading, membersLoading, registrationsLoading, eventGroupings, allMembers, eventRegistrations, loadMyGroup]);



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

    const updatedScores = {
      ...holeScores,
      [playerId]: {
        ...(holeScores[playerId] || {}),
        [currentHole]: newScore,
      },
    };

    setHoleScores(updatedScores);

    if (shouldUseOfflineMode) {
      await saveScoresToLocalStorage(updatedScores);
    }

    console.log(`[scoring] Updated hole ${currentHole} score for player ${playerId}:`, newScore);
  };

  const handleSetPar = async (playerId: string) => {
    if (!eventId) return;

    const holePar = getHolePar();
    const currentScore = holeScores[playerId]?.[currentHole] || 0;

    let updatedScores;
    if (currentScore === holePar) {
      updatedScores = { ...holeScores };
      if (updatedScores[playerId]) {
        updatedScores[playerId] = { ...updatedScores[playerId] };
        delete updatedScores[playerId][currentHole];
      }
      setHoleScores(updatedScores);
      console.log(`[scoring] Reset score for hole ${currentHole}, player ${playerId}`);
    } else {
      updatedScores = {
        ...holeScores,
        [playerId]: {
          ...(holeScores[playerId] || {}),
          [currentHole]: holePar,
        },
      };
      setHoleScores(updatedScores);
      console.log(`[scoring] Set par for hole ${currentHole}, player ${playerId}:`, holePar);
    }

    if (shouldUseOfflineMode) {
      await saveScoresToLocalStorage(updatedScores);
    }
  };

  const saveScoresToLocalStorage = async (scores: { [playerId: string]: { [hole: number]: number } }) => {
    if (!eventId) return;
    try {
      const storageKey = `@golf_offline_scores_${eventId}_day${selectedDay}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(scores));
      console.log('[scoring] 💾 Saved scores to local storage');
    } catch (error) {
      console.error('[scoring] Error saving scores to local storage:', error);
    }
  };

  const getTotalScore = (playerId: string): number => {
    const playerScores = holeScores[playerId] || {};
    return Object.values(playerScores).reduce((sum, score) => sum + score, 0);
  };

  const hasAnyScoreChanges = (): boolean => {
    for (const playerId of Object.keys(holeScores)) {
      const playerScores = holeScores[playerId] || {};
      const totalScore = Object.values(playerScores).reduce((sum, score) => sum + score, 0);
      if (totalScore > 0) return true;
    }
    return false;
  };

  const isPlayerScoringComplete = (playerId: string): boolean => {
    const playerScores = holeScores[playerId] || {};
    const scoredHoles = Object.keys(playerScores).filter(hole => playerScores[Number(hole)] > 0);
    return scoredHoles.length === 18;
  };

  const handleSyncOfflineScores = async () => {
    if (!eventId || !currentUser) {
      console.log('[scoring] Missing eventId or currentUser for sync');
      return;
    }

    setIsSyncing(true);
    try {
      console.log('[scoring] 🔄 Starting offline scores sync for event:', eventId);
      
      let successCount = 0;
      let failCount = 0;
      const storageKeysToDelete: string[] = [];

      const allKeys = await AsyncStorage.getAllKeys();
      const scoreKeys = allKeys.filter(key => 
        key.startsWith(`@golf_offline_scores_${eventId}_`)
      );

      console.log('[scoring] Found', scoreKeys.length, 'offline score entries');

      for (const key of scoreKeys) {
        try {
          const dayMatch = key.match(/_day(\d+)$/);
          if (!dayMatch) continue;

          const day = parseInt(dayMatch[1], 10);
          const scoresJson = await AsyncStorage.getItem(key);
          
          if (!scoresJson) continue;

          const scores = JSON.parse(scoresJson);
          console.log('[scoring] Syncing scores for day', day, ':', Object.keys(scores).length, 'players');

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
              console.log('[scoring] ✅ Synced scores for member:', memberId, 'day:', day, 'total:', totalScore);
              successCount++;
            }
          }

          storageKeysToDelete.push(key);
        } catch (error) {
          console.error('[scoring] Failed to sync scores from key:', key, error);
          failCount++;
        }
      }

      for (const key of storageKeysToDelete) {
        await AsyncStorage.removeItem(key);
        console.log('[scoring] 🗑️ Cleared synced scores:', key);
      }

      queryClient.invalidateQueries({ queryKey: ['scores', eventId] });
      await refetchScores();
      
      console.log('[scoring] ✅ Sync complete:', successCount, 'player scores synced,', failCount, 'failed');
      
      if (failCount === 0 && successCount > 0) {
        Alert.alert('Sync Complete', `Successfully synced ${successCount} player score(s) to the server!`);
      } else if (successCount > 0) {
        Alert.alert('Sync Partially Complete', `${successCount} synced, ${failCount} failed`);
      } else {
        Alert.alert('No Scores to Sync', 'No offline scores found for this event.');
      }
    } catch (error) {
      console.error('[scoring] Sync error:', error);
      Alert.alert('Sync Failed', 'Unable to sync scores. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmitScores = async () => {
    if (!eventId || !currentUser) return;

    if (shouldUseOfflineMode) {
      await saveScoresToLocalStorage(holeScores);
      Alert.alert(
        'Scores Saved Locally',
        'Your scores have been saved locally. They will be synced to the server when you go back online and tap the Sync button.',
        [{ text: 'OK', onPress: () => handleNextHole() }]
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
          <EventScreenHeader title="SCORING" showEventPhoto={false} />
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
        <EventFooter 
        showPlaceholderButton={false}
        hideTopRowButtons={true}
      />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <EventScreenHeader title="SCORING" showEventPhoto={false} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#666' }}>Event not found</Text>
          </View>
        </SafeAreaView>
        <EventFooter 
        showPlaceholderButton={false}
        hideTopRowButtons={true}
      />
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
          <EventScreenHeader title="SCORING" event={event} />

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
        <EventFooter 
        showPlaceholderButton={false}
        hideTopRowButtons={true}
      />
      </>
    );
  }

  if (!canModifyScores) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <EventScreenHeader title="SCORING" event={event} />

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
        <EventFooter 
        showPlaceholderButton={false}
        hideTopRowButtons={true}
      />
      </>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <EventScreenHeader title="SCORING" event={event} />

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
            const handicap = getDisplayHandicap(player, player.registration, event, useCourseHandicap, selectedDay);
            
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

      </SafeAreaView>
      {/* Independent test button row - changes here won't affect other screens */}
      <View style={styles.testButtonRow}>
        {!shouldUseOfflineMode && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleSubmitScores}
            activeOpacity={0.8}
          >
            <Text style={styles.testButtonText}>Submit Scores</Text>
          </TouchableOpacity>
        )}
        {shouldUseOfflineMode && (
          <TouchableOpacity
            style={[
              styles.testButton,
              hasAnyScoreChanges() ? styles.syncButtonReady : styles.syncButtonDisabled
            ]}
            onPress={hasAnyScoreChanges() ? handleSyncOfflineScores : undefined}
            activeOpacity={hasAnyScoreChanges() ? 0.8 : 1}
            disabled={!hasAnyScoreChanges() || isSyncing}
          >
            <Text style={[
              styles.testButtonText,
              hasAnyScoreChanges() ? styles.syncButtonTextReady : styles.syncButtonTextDisabled
            ]}>
              {isSyncing ? 'Syncing...' : (hasAnyScoreChanges() ? 'Sync Scores When Internet Is Available' : 'Sync Not Necessary')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <EventFooter 
        showPlaceholderButton={true}
        onPlaceholderPress={shouldUseOfflineMode ? handleSyncOfflineScores : handleSubmitScores}
        placeholderButtonLabel={
          shouldUseOfflineMode 
            ? (isSyncing ? 'Syncing...' : (hasAnyScoreChanges() ? 'Sync When Internet Is Available' : 'No Changes to Sync'))
            : (isSubmitting ? 'Submitting...' : 'Submit Scores')
        }
        placeholderButtonDisabled={shouldUseOfflineMode ? (isSyncing || !hasAnyScoreChanges()) : isSubmitting}
        placeholderButtonSyncReady={shouldUseOfflineMode && hasAnyScoreChanges() && !isSyncing}
        hideTopRowButtons={true}
        hidePlaceholder2Button={true}
        hidePlaceholder3Button={true}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
    borderColor: '#FDB813',
    backgroundColor: '#800020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#FDB813',
    borderColor: '#800020',
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
    color: '#fff',
    textAlign: 'center',
  },
  dayButtonTextActive: {
    color: '#800020',
  },
  lockIcon: {
    marginLeft: 2,
  },
  scoreMeOnlyButton: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#800020',
    borderWidth: 1.5,
    borderColor: '#FDB813',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreMeOnlyButtonActive: {
    backgroundColor: '#FDB813',
    borderColor: '#800020',
  },
  scoreMeOnlyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  scoreMeOnlyTextActive: {
    color: '#800020',
  },
  testButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#5A0015',
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FDB813',
    borderWidth: 2,
    borderColor: '#800020',
  },
  testButtonText: {
    color: '#800020',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  syncButtonReady: {
    backgroundColor: '#2196F3',
    borderColor: '#1565C0',
  },
  syncButtonDisabled: {
    backgroundColor: '#9e9e9e',
    borderColor: '#757575',
  },
  syncButtonTextReady: {
    color: '#fff',
  },
  syncButtonTextDisabled: {
    color: '#e0e0e0',
  },
});
