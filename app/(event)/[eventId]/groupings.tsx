import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearScoresForEvent } from '@/utils/scorePeristence';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EventScreenHeader } from '@/components/EventScreenHeader';
import { authService } from '@/utils/auth';
import { Member, User, Grouping, Event } from '@/types';
import { calculateTournamentFlight, getDisplayHandicap, getHandicapLabel } from '@/utils/handicapHelper';
import GroupCard from '@/components/GroupCard';
import { DaySelector } from '@/components/DaySelector';
import { type LabelOverride } from '@/utils/groupingsHelper';
import { generateGroupLabel } from '@/utils/groupLabelHelper';
import { EventFooter } from '@/components/EventFooter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/utils/supabaseService';
import { truncateToTwoDecimals } from '@/utils/numberUtils';
import { useAuth } from '@/contexts/AuthContext';
import { canManageGroupings } from '@/utils/rolePermissions';
import { useRealtimeScores, useRealtimeGroupings, useRealtimeRegistrations, useRealtimeEvents } from '@/utils/useRealtimeSubscription';

interface Group {
  hole: number;
  slots: (Member | null)[];
}

export default function GroupingsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = eventId || '';

  const [user, setUser] = useState<User | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [doubleMode, setDoubleMode] = useState<boolean>(false);
  const [initialGroups, setInitialGroups] = useState<Group[]>([]);

  const handleRefresh = () => {
    console.log('[groupings] 🔄 Manual refresh triggered');
    refetchGroupings();
    refetchScores();
    refetchRegistrations();
    if (event && isInitialized) {
      triggerGroupRefresh();
    }
  };

  const handleDoubleModeToggle = async (enabled: boolean) => {
    console.log('[groupings] 🔄 handleDoubleModeToggle called with:', enabled);
    setDoubleMode(enabled);
    if (event) {
      const doubleModeKey = `doubleMode_${event.id}_day${activeDay}`;
      try {
        await AsyncStorage.setItem(doubleModeKey, enabled.toString());
        console.log('[groupings] ✅ Double mode', enabled ? 'enabled' : 'disabled', 'for day', activeDay);
        console.log('[groupings] ✅ Saved to key:', doubleModeKey);
      } catch (error) {
        console.error('[groupings] ❌ Error saving double mode:', error);
      }
    } else {
      console.error('[groupings] ❌ No event found when toggling double mode');
    }
  };

  const [showUnassigned] = useState<boolean>(true);
  const [selectedUngroupedIds, setSelectedUngroupedIds] = useState<Set<string>>(new Set());
  const [labelOverride, setLabelOverride] = useState<LabelOverride>('none');

  const [checkedPlayers, setCheckedPlayers] = useState<{ groupIdx: number; slotIdx: number; player: Member }[]>([]);
  const [checkedGroups, setCheckedGroups] = useState<Set<number>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [registrations, setRegistrations] = useState<Record<string, any>>({});
  const [lastTapTime, setLastTapTime] = useState<{ teeTime: number; shotgun: number }>({ teeTime: 0, shotgun: 0 });
  
  const queryClient = useQueryClient();
  const { members: allMembers } = useAuth();
  
  useRealtimeScores(id, !!id);
  useRealtimeGroupings(id, !!id);
  useRealtimeRegistrations(id, !!id);
  useRealtimeEvents(id, !!id);
  
  const triggerGroupRefresh = useCallback(() => {
    console.log('[groupings] 🔄 Triggering group refresh to re-enrich scores...');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['events', id],
    queryFn: () => supabaseService.events.get(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
  
  // Use eventData directly instead of local state for immediate updates
  const useCourseHandicap = eventData?.useCourseHandicap === true;
  
  const { data: eventGroupings = [], isLoading: groupingsLoading, refetch: refetchGroupings } = useQuery({
    queryKey: ['groupings', id],
    queryFn: () => supabaseService.groupings.getAll(id),
    enabled: !!id && !!eventData,
    staleTime: 1000 * 30,
    refetchOnMount: false,
  });
  
  const { data: eventScores = [], isLoading: scoresLoading, refetch: refetchScores } = useQuery({
    queryKey: ['scores', id],
    queryFn: () => supabaseService.scores.getAll(id),
    enabled: !!id && !!eventData,
    staleTime: 1000 * 30,
    refetchOnMount: false,
  });
  
  const { data: backendRegistrations = [], refetch: refetchRegistrations } = useQuery({
    queryKey: ['registrations', id],
    queryFn: () => supabaseService.registrations.getAll(id),
    enabled: !!id && !!eventData,
    staleTime: 1000 * 30,
    refetchOnMount: false,
  });
  
  const syncGroupingsMutation = useMutation({
    mutationFn: ({ eventId, groupings }: { eventId: string; groupings: any[] }) => 
      supabaseService.groupings.sync(eventId, groupings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupings', id] });
    },
  });
  
  const deleteScoresMutation = useMutation({
    mutationFn: ({ eventId }: { eventId: string }) => 
      supabaseService.scores.deleteAll(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scores', id] });
    },
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        console.log('[groupings] User loaded:', currentUser?.username, 'isAdmin:', currentUser?.isAdmin);
      } catch (error) {
        console.error('[groupings] Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user && allMembers.length > 0) {
      const member = allMembers.find((m: any) => m.id === user.id);
      setCurrentMember(member as Member || null);
      console.log('[groupings] Current member loaded:', member?.name, 'roles:', member?.boardMemberRoles);
    }
  }, [user, allMembers]);

  useEffect(() => {
    if (eventData) {
      setEvent(eventData as Event);
      console.log('[groupings] Event loaded from backend:', eventData.name);
    }
  }, [eventData]);

  useEffect(() => {
    if (allMembers && allMembers.length > 0) {
      setMembers(allMembers as Member[]);
      console.log('[groupings] Members loaded:', allMembers.length);
    }
  }, [allMembers]);

  useEffect(() => {
    if (!event || !allMembers || backendRegistrations.length === 0) return;
    
    console.log('[groupings] 🔄 Loading registrations from backend...');
    const regMap: Record<string, any> = {};
    
    backendRegistrations.forEach((reg: any) => {
      const member = allMembers.find((m: any) => m.id === reg.memberId);
      if (member) {
        regMap[member.name] = {
          id: reg.id,
          eventId: reg.eventId,
          playerName: member.name,
          playerPhone: reg.playerPhone,
          paymentStatus: reg.paymentStatus === 'paid' ? 'paid' : 'unpaid',
          paymentMethod: 'zelle',
          adjustedHandicap: reg.adjustedHandicap,
          numberOfGuests: reg.numberOfGuests || 0,
        };
      }
    });
    
    setRegistrations(regMap);
    console.log('[groupings] ✅ Loaded registrations from backend:', Object.keys(regMap).length);
    console.log('[groupings] 📊 Sample registrations:', Object.entries(regMap).slice(0, 3).map(([name, reg]: [string, any]) => ({
      name,
      adjustedHandicap: reg.adjustedHandicap,
    })));
  }, [event, allMembers, backendRegistrations]);

  // Track previous value to detect changes and trigger refresh
  const prevUseCourseHandicapRef = React.useRef<boolean | undefined>(undefined);
  
  useEffect(() => {
    if (prevUseCourseHandicapRef.current !== undefined && prevUseCourseHandicapRef.current !== useCourseHandicap) {
      console.log('[groupings] 🔄 Course handicap setting changed:', prevUseCourseHandicapRef.current, '->', useCourseHandicap);
      console.log('[groupings] 📊 Current event slope ratings:', {
        day1SlopeRating: eventData?.day1SlopeRating,
        day2SlopeRating: eventData?.day2SlopeRating,
        day3SlopeRating: eventData?.day3SlopeRating,
        activeDay,
        eventId: eventData?.id,
        eventName: eventData?.name,
      });
      
      if (isInitialized) {
        console.log('[groupings] 🔄 Triggering immediate UI refresh for handicap recalculation');
        triggerGroupRefresh();
      }
    }
    prevUseCourseHandicapRef.current = useCourseHandicap;
  }, [useCourseHandicap, eventData, activeDay, isInitialized, triggerGroupRefresh]);

  useFocusEffect(
    useCallback(() => {
      console.log('[groupings] 🔄 Screen focused - refreshing all data');
      if (id) {
        refetchGroupings();
        refetchScores();
        refetchRegistrations();
        if (event && isInitialized) {
          triggerGroupRefresh();
        }
      }
    }, [id, event, isInitialized, refetchGroupings, refetchScores, refetchRegistrations, triggerGroupRefresh])
  );

  const enrichSlotsWithScores = useCallback((slots: (Member | null)[]) => {
    if (!eventScores || eventScores.length === 0) return slots;
    
    return slots.map(player => {
      if (!player) return null;
      
      const playerScores = eventScores.filter((s: any) => s.memberId === player.id);
      const totalScore = playerScores.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0);
      
      if (totalScore > 0) {
        return { ...player, scoreTotal: totalScore };
      }
      return player;
    });
  }, [eventScores]);

  const loadGroupsFromStorage = useCallback(async () => {
    if (!event || members.length === 0) {
      console.log('[groupings] ⚠️ Cannot load groups - event or members not ready');
      return;
    }

    console.log('[groupings] 🔄 loadGroupsFromStorage triggered for day', activeDay);
    
    const doubleModeKey = `doubleMode_${event.id}_day${activeDay}`;
    const savedDoubleMode = await AsyncStorage.getItem(doubleModeKey);
    const isDoubleMode = savedDoubleMode === 'true';
    setDoubleMode(isDoubleMode);
    console.log('[groupings] Loaded double mode for day', activeDay, ':', isDoubleMode);
    
    const dayGroupings = eventGroupings.filter((g: any) => g.day === activeDay);
    console.log(`[groupings] Found ${dayGroupings.length} groupings from backend for day ${activeDay}`);
    
    let newGroups: Group[] = [];

    if (dayGroupings.length > 0) {
      console.log(`[groupings] 📥 Loading saved groupings from backend for day ${activeDay}`);
      const maxHole = Math.max(...dayGroupings.map((g: Grouping) => g.hole));
      
      const registeredPlayerIds = new Set(event.registeredPlayers || []);
      console.log(`[groupings] 🔍 Current registered players:`, registeredPlayerIds.size);
      
      for (let i = 1; i <= maxHole; i++) {
        const grouping = dayGroupings.find((g: Grouping) => g.hole === i);
        if (grouping) {
          const slots = grouping.slots.map((memberId: string | null) => {
            if (!memberId) return null;
            
            // Only include player if they're still registered
            if (!registeredPlayerIds.has(memberId)) {
              console.log(`[groupings] ⚠️ Player ${memberId} is in groupings but not registered - removing from group`);
              return null;
            }
            
            const member = members.find(m => m.id === memberId);
            return member || null;
          });
          newGroups.push({
            hole: i,
            slots: slots as (Member | null)[],
          });
        } else {
          newGroups.push({
            hole: i,
            slots: [null, null, null, null],
          });
        }
      }
      console.log(`[groupings] ✅ Loaded ${newGroups.length} groups from backend (filtered by registered players)`);
      
      // If no registered players, clear all groups
      if (registeredPlayerIds.size === 0) {
        console.log('[groupings] 🧹 No registered players - clearing all groups');
        newGroups = [];
      } else {
        // Calculate how many groups we actually need
        const requiredGroups = Math.ceil(registeredPlayerIds.size / 4);
        
        if (newGroups.length < requiredGroups) {
          // Need MORE groups
          const additionalGroupsNeeded = requiredGroups - newGroups.length;
          console.log(`[groupings] 📝 Need ${additionalGroupsNeeded} more groups for ${registeredPlayerIds.size} players`);
          for (let i = 0; i < additionalGroupsNeeded; i++) {
            newGroups.push({
              hole: newGroups.length + 1,
              slots: [null, null, null, null],
            });
          }
          console.log(`[groupings] ✅ Added ${additionalGroupsNeeded} additional groups. Total: ${newGroups.length}`);
        } else if (newGroups.length > requiredGroups) {
          // Need FEWER groups - trim excess empty groups from the end
          console.log(`[groupings] ✂️ Have ${newGroups.length} groups but only need ${requiredGroups} for ${registeredPlayerIds.size} players`);
          newGroups = newGroups.slice(0, requiredGroups);
          console.log(`[groupings] ✅ Trimmed to ${newGroups.length} groups`);
        }
      }
    } else {
      console.log('[groupings] 📝 No saved groupings found, creating initial groups based on registrations');
      const numGroups = Math.ceil((event.registeredPlayers || []).length / 4);
      for (let i = 0; i < numGroups; i++) {
        newGroups.push({
          hole: i + 1,
          slots: [null, null, null, null],
        });
      }
      console.log(`[groupings] Created ${numGroups} empty groups`);
    }

    console.log('[groupings] 📊 BEFORE enrichment - groups:', newGroups.map((g: any) => g.slots.map((s: any) => s ? { name: s.name, score: s.scoreTotal } : null)));
    
    const enrichedGroups = newGroups.map(group => ({
      ...group,
      slots: enrichSlotsWithScores(group.slots),
    }));
    
    console.log('[groupings] 📊 AFTER enrichment - checking if any scores loaded:', enrichedGroups.map((g: any) => g.slots.map((s: any) => s ? { name: s.name, score: s.scoreTotal } : null)));
    
    setGroups(enrichedGroups);
    setInitialGroups(JSON.parse(JSON.stringify(enrichedGroups)));
    setCheckedPlayers([]);
    setIsInitialized(true);
  }, [event, members, activeDay, eventGroupings, enrichSlotsWithScores]);

  useEffect(() => {
    console.log('[groupings] 📍 Initial load effect triggered');
    loadGroupsFromStorage();
  }, [loadGroupsFromStorage]);

  const [enrichedUngroupedPlayers, setEnrichedUngroupedPlayers] = useState<Member[]>([]);

  useEffect(() => {
    if (!isInitialized || refreshTrigger === 0) {
      console.log('[groupings] ⏭️ Skipping refresh - not initialized yet or refreshTrigger is 0');
      return;
    }

    console.log('[groupings] 🔄 Refresh triggered (count:', refreshTrigger, ') - reloading from storage');
    loadGroupsFromStorage();
  }, [refreshTrigger, isInitialized, loadGroupsFromStorage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const enrichUngrouped = () => {
        if (!event || members.length === 0) return;

        const assignedIds = new Set<string>();
        groups.forEach(group => {
          group.slots.forEach(slot => {
            if (slot) assignedIds.add(slot.id);
          });
        });

        const unassignedMembers = (event.registeredPlayers || [])
          .map(playerId => members.find(m => m.id === playerId))
          .filter((m): m is Member => m !== null && m !== undefined && !assignedIds.has(m.id))
          .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));

        try {
          const enriched = unassignedMembers.map(player => {
            const playerReg = registrations[player.name];
            const effectiveHandicap = getDisplayHandicap(player, playerReg, event || undefined, useCourseHandicap, activeDay);
            const playerScores = eventScores.filter((s: any) => s.memberId === player.id);
            const grandTotal = playerScores.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0);
            
            if (grandTotal > 0) {
              return { ...player, scoreTotal: grandTotal, effectiveHandicap };
            }
            return { ...player, effectiveHandicap };
          });

          setEnrichedUngroupedPlayers(enriched);
        } catch (error) {
          console.error('[groupings] Error enriching ungrouped players:', error);
          setEnrichedUngroupedPlayers(unassignedMembers);
        }
      };

      enrichUngrouped();
    }, 50);

    return () => clearTimeout(timer);
  }, [event, members, groups, eventScores, registrations, useCourseHandicap, activeDay]);

  const ungroupedPlayers = enrichedUngroupedPlayers;

  const hasGroupChanges = useMemo(() => {
    if (groups.length !== initialGroups.length) return true;
    return groups.some((group, idx) => {
      const initial = initialGroups[idx];
      if (group.hole !== initial.hole) return true;
      return group.slots.some((slot, slotIdx) => {
        const initialSlot = initial.slots[slotIdx];
        if (!slot && !initialSlot) return false;
        if (!slot || !initialSlot) return true;
        return slot.id !== initialSlot.id;
      });
    });
  }, [groups, initialGroups]);

  const handleSave = async () => {
    if (!event || !user) return;
    try {
      console.log('[groupings] 💾 Saving groupings - this will trigger real-time updates on other devices...');
      
      const groupingsToSave = groups.map(group => ({
        day: activeDay,
        hole: group.hole,
        slots: group.slots.map(slot => slot?.id || null),
      }));

      await syncGroupingsMutation.mutateAsync({
        eventId: event.id,
        groupings: groupingsToSave,
      });
      
      console.log('[groupings] ✅ Groupings saved to backend');
      console.log('[groupings] 🔄 Refetching groupings to ensure local state is updated...');
      await refetchGroupings();
      
      setInitialGroups(JSON.parse(JSON.stringify(groups)));

      console.log('[groupings] ✅ Groupings saved for day', activeDay, '- other devices will update automatically via realtime subscription');
    } catch (error) {
      console.error('[groupings] Error saving:', error);
      Alert.alert('Error', 'Failed to save groupings. Please try again.');
    }
  };

  const handleAddPlayersToGroup = (groupIndex: number) => {
    if (selectedUngroupedIds.size === 0) return;

    const playersToAdd = Array.from(selectedUngroupedIds)
      .map(id => enrichedUngroupedPlayers.find(p => p.id === id))
      .filter(Boolean) as Member[];

    console.log(`[groupings] Adding ${playersToAdd.length} players to group ${groupIndex + 1}:`, playersToAdd.map(p => ({ name: p.name, score: p.scoreTotal })));

    setGroups(prevGroups => {
      const newGroups = [...prevGroups];
      const group = newGroups[groupIndex];
      let slotIdx = 0;

      for (let i = 0; i < group.slots.length && slotIdx < playersToAdd.length; i++) {
        if (!group.slots[i]) {
          group.slots[i] = playersToAdd[slotIdx];
          slotIdx++;
        }
      }

      return newGroups;
    });
    
    setSelectedUngroupedIds(new Set());
  };

  const handleRemovePlayer = (groupIndex: number, slotIndex: number) => {
    setGroups(prevGroups => {
      const newGroups = [...prevGroups];
      const removedPlayer = newGroups[groupIndex].slots[slotIndex];
      newGroups[groupIndex].slots[slotIndex] = null;
      
      if (removedPlayer) {
        console.log(`[groupings] ✅ Player removed from group: ${removedPlayer.name}`);
        console.log(`[groupings] 💾 Score PERSISTED in AsyncStorage: ${removedPlayer.scoreTotal} (will reappear in Ungrouped section)`);
      }
      
      return newGroups;
    });

    setCheckedPlayers(prev =>
      prev.filter(
        cp => !(cp.groupIdx === groupIndex && cp.slotIdx === slotIndex)
      )
    );
  };

  const handleUnassignAll = () => {
    const newGroups = groups.map(group => ({
      ...group,
      slots: [null, null, null, null] as (Member | null)[],
    }));
    setGroups(newGroups);
    setCheckedPlayers([]);
  };

  const membersLoading = false;
  
  const handleLabelOverrideToggle = (type: 'teeTime' | 'shotgun') => {
    const now = Date.now();
    const lastTap = lastTapTime[type];
    const isDoubleTap = now - lastTap < 300;

    if (isDoubleTap && labelOverride === type) {
      console.log(`[groupings] Double-tap detected on ${type} - returning to normal sort`);
      setLabelOverride('none');
    } else {
      console.log(`[groupings] Setting label override to ${type}`);
      setLabelOverride(type);
    }

    setLastTapTime(prev => ({ ...prev, [type]: now }));
  };

  const handleSortByNetScore = () => {
    if (ungroupedPlayers.length === 0) {
      console.log('[groupings] ⚠️ No unassigned players!');
      return;
    }

    console.log('[groupings] 📊 NET SCORE button tapped! Active day:', activeDay);
    console.log('[groupings] Unassigned event players:', ungroupedPlayers.map(p => p.name));

    const sortedPlayers = [...ungroupedPlayers].sort((a, b) => {
      const playerRegA = registrations[a.name];
      const playerRegB = registrations[b.name];
      const handicapA = getDisplayHandicap(a, playerRegA, event || undefined, useCourseHandicap, activeDay);
      const handicapB = getDisplayHandicap(b, playerRegB, event || undefined, useCourseHandicap, activeDay);
      const netScoreA = (a.scoreTotal ?? 0) - handicapA;
      const netScoreB = (b.scoreTotal ?? 0) - handicapB;
      return netScoreA - netScoreB;
    });

    console.log('[groupings] 🔄 Sorted by net score:', sortedPlayers.map(p => {
      const playerReg = registrations[p.name];
      const handicap = getDisplayHandicap(p, playerReg, event || undefined, useCourseHandicap, activeDay);
      return { name: p.name, gross: p.scoreTotal || 0, handicap, net: (p.scoreTotal ?? 0) - handicap };
    }));

    const newGroups = JSON.parse(JSON.stringify(groups)) as Group[];
    let playerIdx = 0;

    for (let groupIdx = 0; groupIdx < newGroups.length && playerIdx < sortedPlayers.length; groupIdx++) {
      for (let slotIdx = 0; slotIdx < 4 && playerIdx < sortedPlayers.length; slotIdx++) {
        if (!newGroups[groupIdx].slots[slotIdx]) {
          newGroups[groupIdx].slots[slotIdx] = sortedPlayers[playerIdx];
          console.log(`[groupings] Assigning ${sortedPlayers[playerIdx].name} to Group ${groupIdx + 1}, Slot ${slotIdx + 1}`);
          playerIdx++;
        }
      }
    }

    setGroups(newGroups);
    console.log('[groupings] ✅ Unassigned event players auto-grouped by net score');
  };

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, updates }: { memberId: string; updates: Partial<Member> }) => 
      supabaseService.members.update(memberId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const handleUpdateMember = async (updatedMember: Member) => {
    try {
      if (!event) return;

      await updateMemberMutation.mutateAsync({ 
        memberId: updatedMember.id, 
        updates: updatedMember 
      });
      console.log('[groupings] ✅ Member updated and saved:', updatedMember.name, { 
        adjustedHandicap: updatedMember.adjustedHandicap,
        handicap: updatedMember.handicap 
      });
    } catch (error) {
      console.error('[groupings] Error saving member:', error);
    }
  };

  const handlePlayerCheckboxChange = (groupIdx: number, slotIdx: number, checked: boolean) => {
    if (checked) {
      const player = groups[groupIdx]?.slots[slotIdx];
      if (player) {
        setCheckedPlayers([...checkedPlayers, { groupIdx, slotIdx, player }]);
      }
    } else {
      setCheckedPlayers(checkedPlayers.filter(cp => !(cp.groupIdx === groupIdx && cp.slotIdx === slotIdx)));
    }
  };

  const handleGroupCheckboxChange = (groupIdx: number, checked: boolean) => {
    const newCheckedGroups = new Set(checkedGroups);
    if (checked) {
      newCheckedGroups.add(groupIdx);
    } else {
      newCheckedGroups.delete(groupIdx);
    }
    setCheckedGroups(newCheckedGroups);
  };

  const handleSwitchGroups = () => {
    const checkedGroupsArray = Array.from(checkedGroups).sort();
    if (checkedGroupsArray.length !== 2) return;

    const [groupIdx1, groupIdx2] = checkedGroupsArray;
    const newGroups = [...groups];

    const tempSlots = newGroups[groupIdx1].slots;
    newGroups[groupIdx1].slots = newGroups[groupIdx2].slots;
    newGroups[groupIdx2].slots = tempSlots;

    setGroups(newGroups);
    setCheckedGroups(new Set());
    console.log(`[groupings] Switched groups ${groupIdx1} and ${groupIdx2}`);
  };

  const handleAddCheckedPlayerToGroup = (groupIdx: number, slotIdx: number) => {
    if (checkedPlayers.length === 0) return;

    const checkedPlayer = checkedPlayers[0];
    const playerBeingMoved = checkedPlayer.player;

    console.log(`[groupings] ADD: Moving ${playerBeingMoved.name} (score: ${playerBeingMoved.scoreTotal}) from Group ${checkedPlayer.groupIdx + 1} Slot ${checkedPlayer.slotIdx} to Group ${groupIdx + 1} Slot ${slotIdx}`);

    setGroups(prevGroups => {
      const newGroups = [...prevGroups];
      newGroups[checkedPlayer.groupIdx].slots[checkedPlayer.slotIdx] = null;
      newGroups[groupIdx].slots[slotIdx] = playerBeingMoved;
      return newGroups;
    });
    
    setCheckedPlayers([]);
  };

  const handleSwitchCheckedPlayers = () => {
    if (checkedPlayers.length !== 2) return;

    const newGroups = [...groups];
    const player1 = checkedPlayers[0];
    const player2 = checkedPlayers[1];

    const p1Name = newGroups[player1.groupIdx].slots[player1.slotIdx]?.name;
    const p2Name = newGroups[player2.groupIdx].slots[player2.slotIdx]?.name;
    const p1Score = newGroups[player1.groupIdx].slots[player1.slotIdx]?.scoreTotal;
    const p2Score = newGroups[player2.groupIdx].slots[player2.slotIdx]?.scoreTotal;

    console.log(`[groupings] SWITCH: ${p1Name} (score: ${p1Score}) <-> ${p2Name} (score: ${p2Score})`);

    const temp = newGroups[player1.groupIdx].slots[player1.slotIdx];
    newGroups[player1.groupIdx].slots[player1.slotIdx] = newGroups[player2.groupIdx].slots[player2.slotIdx];
    newGroups[player2.groupIdx].slots[player2.slotIdx] = temp;

    setGroups(newGroups);
    setCheckedPlayers([]);
  };

  const handleGeneratePdf = async () => {
    if (!event || groups.length === 0) {
      Alert.alert('No Data', 'No groupings to generate PDF.');
      return;
    }

    setIsGeneratingPdf(true);
    console.log('[groupings] 📄 Generating groupings PDF...');

    try {
      const groupsHtml = groups.map((group, idx) => {
        const label = generateGroupLabel(idx, event, activeDay, labelOverride, doubleMode);
        const playerCount = group.slots.filter(s => s).length;

        const renderPlayerBox = (player: Member | null, slotIdx: number) => {
          if (!player) {
            return `
              <div style="background-color: #D0D0D0; border: 2px solid #333; border-radius: 4px; height: 60px; display: flex; align-items: center; justify-content: center; padding: 8px 6px; margin-bottom: 4px;">
                <span style="font-size: 9px; color: #333; font-weight: 500;">Empty</span>
              </div>
            `;
          }
          const playerReg = registrations[player.name];
          const handicap = getDisplayHandicap(player, playerReg, event, useCourseHandicap, activeDay);
          const flight = calculateTournamentFlight(player, Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, playerReg, event, useCourseHandicap, activeDay);
          return `
            <div style="background-color: #D0D0D0; border: 2px solid #333; border-radius: 4px; padding: 8px 10px; height: 60px; margin-bottom: 4px;">
              <div style="font-size: 9px; font-weight: 700; color: #000; margin-bottom: 4px;">${player.name}</div>
              <div style="font-size: 7px; color: #000; margin-bottom: 2px;">HDC: ${handicap}</div>
              <div style="font-size: 7px; color: #000;">Flight: ${flight || '—'}</div>
            </div>
          `;
        };

        return `
          <div style="border: 1px solid #999; margin-bottom: 8px; padding: 8px; background: #fff;">
            <div style="font-size: 9px; font-weight: 600; color: #1B5E20; margin-bottom: 6px;">${label} • ${playerCount} players</div>
            <div style="display: flex; gap: 6px;">
              <div style="flex: 1; display: flex; flex-direction: column;">
                <div style="background-color: #1B5E20; padding: 4px 6px; border-radius: 4px; margin-bottom: 4px; text-align: center;">
                  <span style="font-size: 8px; font-weight: 700; color: #fff;">CART 1</span>
                </div>
                ${renderPlayerBox(group.slots[0], 0)}
                ${renderPlayerBox(group.slots[1], 1)}
              </div>
              <div style="flex: 1; display: flex; flex-direction: column;">
                <div style="background-color: #1B5E20; padding: 4px 6px; border-radius: 4px; margin-bottom: 4px; text-align: center;">
                  <span style="font-size: 8px; font-weight: 700; color: #fff;">CART 2</span>
                </div>
                ${renderPlayerBox(group.slots[2], 2)}
                ${renderPlayerBox(group.slots[3], 3)}
              </div>
            </div>
          </div>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page {
                size: 2.5in auto;
                margin: 0.1in;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 4px;
                width: 2.3in;
                background: #f5f5f5;
              }
              .header {
                text-align: center;
                margin-bottom: 8px;
                padding-bottom: 6px;
                border-bottom: 1px solid #1B5E20;
              }
              .event-name {
                font-size: 11px;
                font-weight: 700;
                color: #1B5E20;
                margin-bottom: 2px;
              }
              .event-date {
                font-size: 8px;
                color: #666;
              }
              .day-label {
                font-size: 9px;
                font-weight: 600;
                color: #333;
                margin-top: 4px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="event-name">${event.name}</div>
              <div class="event-date">${event.location}</div>
              <div class="day-label">Day ${activeDay} Groupings${(event as any)[`day${activeDay}Course`] ? ` • ${(event as any)[`day${activeDay}Course`]}` : ''}</div>
            </div>
            ${groupsHtml}
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        console.log('[groupings] Opening print dialog for web...');
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        console.log('[groupings] PDF generated at:', uri);
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
        });
      }
      console.log('[groupings] ✅ PDF generated successfully');
    } catch (error) {
      console.error('[groupings] ❌ Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleResetScores = async () => {
    if (!event || !user) return;
    
    const adminMember = allMembers.find((m: any) => m.id === user.id && m.isAdmin);
    
    if (!adminMember || adminMember.pin !== pinInput) {
      Alert.alert('Error', 'Invalid admin PIN. Please try again.');
      return;
    }
    
    setShowPinModal(false);
    setPinInput('');
    
    try {
      console.log('[groupings] 🗑️ Resetting all scores for event:', event.id);
      
      await deleteScoresMutation.mutateAsync({ eventId: event.id });
      console.log('[groupings] ✅ Backend scores deleted');
      
      await clearScoresForEvent(event.id);
      console.log('[groupings] 🧹 Cleared all AsyncStorage score caches');
      
      await queryClient.invalidateQueries({ queryKey: ['scores', event.id] });
      console.log('[groupings] 🔄 Invalidated scores cache in React Query');
      
      await refetchScores();
      await refetchRegistrations();
      
      triggerGroupRefresh();
      
      Alert.alert('Success', 'All scores have been reset successfully.');
    } catch (error) {
      console.error('[groupings] Error resetting scores:', error);
      Alert.alert('Error', 'Failed to reset scores. Please try again.');
    }
  };

  const isLoadingData = eventLoading || membersLoading || groupingsLoading || scoresLoading || !event || !isInitialized;
  
  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <EventScreenHeader title="GROUPINGS" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <EventScreenHeader title="GROUPINGS" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666' }}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
      <EventScreenHeader
        title="GROUPINGS"
        event={event}
        actions={[
          {
            icon: 'refresh',
            label: 'Refresh',
            onPress: handleRefresh,
          },
          ...(canManageGroupings(currentMember) ? [{
            icon: 'pdf' as const,
            label: 'PDF',
            onPress: handleGeneratePdf,
            disabled: isGeneratingPdf,
          }] : []),
        ]}
      />

      <DaySelector
        numberOfDays={event.numberOfDays ?? 1}
        selectedDay={activeDay}
        onDaySelect={setActiveDay}
        doubleMode={doubleMode}
        onDoubleModeToggle={handleDoubleModeToggle}
        isAdmin={canManageGroupings(currentMember)}
      />

      {canManageGroupings(currentMember) && (
        <View style={styles.unifiedButtonsContainer}>
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterBtn, labelOverride === 'teeTime' && styles.filterBtnActive]}
              onPress={() => handleLabelOverrideToggle('teeTime')}
            >
              <Text style={[styles.filterBtnText, labelOverride === 'teeTime' && styles.filterBtnTextActive]}>
                TEE TIME
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterBtn, labelOverride === 'shotgun' && styles.filterBtnActive]}
              onPress={() => handleLabelOverrideToggle('shotgun')}
            >
              <Text style={[styles.filterBtnText, labelOverride === 'shotgun' && styles.filterBtnTextActive]}>
                SHOTGUN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.netScoreBtn}
              onPress={handleSortByNetScore}
            >
              <Text style={styles.netScoreBtnText}>
                NET SCORE
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.unassignAllBtnContainer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.unassignAllBtnAdmin}
                onPress={handleUnassignAll}
              >
                <Ionicons name="trash" size={16} color="#fff" />
                <Text style={styles.unassignAllBtnText}>UNASSIGN</Text>
              </TouchableOpacity>

              {(currentMember?.isAdmin || user?.isAdmin) && (
                <TouchableOpacity
                  style={styles.resetScoresBtn}
                  onPress={() => {
                    setShowPinModal(true);
                  }}
                >
                  <Ionicons name="refresh-circle" size={16} color="#fff" />
                  <Text style={styles.resetScoresBtnText}>RESET</Text>
                </TouchableOpacity>
              )}
            </View>

            {checkedGroups.size === 2 && (
              <TouchableOpacity
                style={styles.switchGroupsBtn}
                onPress={handleSwitchGroups}
              >
                <Text style={styles.switchGroupsBtnText}>SWITCH</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.switchSaveContainer}>
            {checkedPlayers.length === 2 && !hasGroupChanges && (
              <View style={styles.switchCardContainer}>
                <TouchableOpacity
                  style={styles.switchBtn}
                  onPress={handleSwitchCheckedPlayers}
                >
                  <Text style={styles.switchBtnText}>SWITCH</Text>
                </TouchableOpacity>
              </View>
            )}

            {hasGroupChanges && (
              <View style={styles.saveCardContainer}>
                <TouchableOpacity
                  style={styles.saveGroupingsBtn}
                  onPress={handleSave}
                >
                  <Text style={styles.saveGroupingsBtnText}>SAVE GROUPINGS</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.contentWrapper}>
        {canManageGroupings(currentMember) && showUnassigned && ungroupedPlayers.length > 0 && (
          <View style={styles.ungroupedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionCount}>{ungroupedPlayers.length}</Text>
              <Text style={styles.sectionTitle}>Ungrouped</Text>
            </View>

            <ScrollView style={styles.ungroupedList} showsVerticalScrollIndicator={false}>
              {ungroupedPlayers.map(player => {
                const isSelected = selectedUngroupedIds.has(player.id);
                const playerReg = registrations[player.name];
                const handicap = getDisplayHandicap(player, playerReg, event || undefined, useCourseHandicap, activeDay);
                const scoreNet = (player.scoreTotal ?? 0) - handicap;
                const flight = calculateTournamentFlight(player, Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, playerReg, event || undefined, useCourseHandicap, activeDay);
                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.playerCard, isSelected && styles.playerCardSelected]}
                    onPress={() => {
                      const newSelected = new Set(selectedUngroupedIds);
                      if (isSelected) {
                        newSelected.delete(player.id);
                      } else {
                        newSelected.add(player.id);
                      }
                      setSelectedUngroupedIds(newSelected);
                    }}
                  >
                    <Text style={[styles.playerName, isSelected && styles.playerNameSelected]}>{player.name}</Text>
                    <Text style={[styles.playerHdc, isSelected && styles.playerTextSelected]}>{getHandicapLabel(player, playerReg, useCourseHandicap, event || undefined, activeDay)} {handicap}</Text>
                    {flight && flight !== '—' && <Text style={[styles.playerFlight, isSelected && styles.playerTextSelected]}>Flight: {flight}</Text>}
                    <Text style={[styles.playerNetScore, isSelected && styles.playerNetScoreSelected]}>NET: {player.scoreTotal === undefined || player.scoreTotal === null ? '0.00' : truncateToTwoDecimals(scoreNet)}</Text>
                    {player.scoreTotal !== undefined && player.scoreTotal !== null && (
                      <Text style={[styles.playerScore, isSelected && styles.playerScoreSelected]}>Total: {player.scoreTotal}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.groupsSection}>
          {!canManageGroupings(currentMember) && groups.every(g => g.slots.every(s => s === null)) ? (
            <View style={styles.noGroupingsContainer}>
              <Ionicons name="people" size={64} color="#ccc" />
              <Text style={styles.noGroupingsTitle}>Groupings Not Formed</Text>
              <Text style={styles.noGroupingsSubtitle}>Come Back Later</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {groups.map((group, idx) => (
                <View key={group.hole} style={[styles.groupContainer, checkedGroups.has(idx) && styles.groupContainerSelected]}>
                  <GroupCard
                    key={group.hole}
                    groupNumber={group.hole}
                    label={event ? generateGroupLabel(idx, event, activeDay, labelOverride, doubleMode) : `Group ${group.hole}`}
                    playerCount={group.slots.filter(s => s).length}
                    slots={group.slots}
                    selectedCount={selectedUngroupedIds.size}
                    onAddPlayers={() => handleAddPlayersToGroup(idx)}
                    onRemovePlayer={(slotIdx) => handleRemovePlayer(idx, slotIdx)}
                    onUpdateScores={(updatedSlots) => {
                      const newGroups = [...groups];
                      newGroups[idx].slots = updatedSlots;
                      setGroups(newGroups);
                    }}
                    onUpdateMember={handleUpdateMember}
                    eventId={event.id}
                    numberOfDays={event.numberOfDays ?? 1}
                    checkedPlayers={checkedPlayers}
                    onPlayerCheckboxChange={handlePlayerCheckboxChange}
                    onAddCheckedPlayerToSlot={handleAddCheckedPlayerToGroup}
                    groupIdx={idx}
                    isAdmin={canManageGroupings(currentMember)}
                    checkedGroups={checkedGroups}
                    onGroupCheckboxChange={handleGroupCheckboxChange}
                    triggerGroupRefresh={triggerGroupRefresh}
                    activeDay={activeDay}
                    event={event}
                    registrations={registrations}
                    useCourseHandicap={useCourseHandicap}
                  />
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>

      </SafeAreaView>

      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPinModal(false);
          setPinInput('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pinModalContainer}>
            <Text style={styles.pinModalTitle}>Reset All Scores</Text>
            <Text style={styles.pinModalSubtitle}>Enter your admin PIN to confirm this action. This cannot be undone.</Text>
            
            <TextInput
              style={styles.pinInput}
              placeholder="Admin PIN"
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              autoFocus
            />
            
            <View style={styles.pinModalButtons}>
              <TouchableOpacity
                style={[styles.pinModalBtn, styles.pinModalCancelBtn]}
                onPress={() => {
                  setShowPinModal(false);
                  setPinInput('');
                }}
              >
                <Text style={styles.pinModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.pinModalBtn, styles.pinModalConfirmBtn]}
                onPress={handleResetScores}
              >
                <Text style={styles.pinModalConfirmText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <EventFooter />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  unifiedButtonsContainer: {
    backgroundColor: '#9E9E9E',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 2,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#800020',
    borderColor: '#800020',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#FFD54F',
    borderColor: '#800020',
  },
  filterBtnText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#fff',
  },
  filterBtnTextActive: {
    color: '#333',
  },
  netScoreBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#800020',
    borderColor: '#800020',
    alignItems: 'center',
  },
  netScoreBtnText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#fff',
  },
  groupContainer: {
    borderWidth: 1,
    borderColor: '#999999',
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  groupContainerSelected: {
    backgroundColor: '#FFE0B2',
  },
  saveGroupingsBtn: {
    paddingVertical: 10.5,
    borderRadius: 8,
    backgroundColor: '#4A90D9',
    borderWidth: 2,
    borderColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveGroupingsBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  ungroupedSection: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#999',
    marginTop: 4,
  },
  ungroupedList: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  playerCard: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9E9E9E',
    backgroundColor: '#9E9E9E',
  },
  playerCardSelected: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  playerName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  playerHdc: {
    fontSize: 11,
    color: '#fff',
    marginTop: 2,
  },
  playerFlight: {
    fontSize: 10,
    color: '#fff',
    marginTop: 4,
    fontWeight: '600' as const,
  },
  playerNetScore: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '700' as const,
    marginTop: 4,
  },
  playerNameSelected: {
    color: '#fff',
  },
  playerTextSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  playerNetScoreSelected: {
    color: '#fff',
  },
  playerScore: {
    fontSize: 11,
    color: '#1B5E20',
    fontWeight: '700' as const,
    marginTop: 4,
  },
  playerScoreSelected: {
    color: '#FFE082',
  },
  groupsSection: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  firstGroupHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  pdfBtn: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'absolute',
    right: 16,
  },
  pdfBtnText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  unassignAllBtnContainer: {
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unassignAllBtnAdmin: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#800020',
    gap: 8,
  },
  unassignAllBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  switchGroupsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFD54F',
    borderWidth: 2,
    borderColor: '#800020',
    marginTop: 8,
  },
  switchGroupsBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#333',
  },
  resetScoresBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#800020',
    gap: 8,
  },
  resetScoresBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#ccc',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  switchSaveContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 8,
    backgroundColor: '#9E9E9E',
  },
  switchCardContainer: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    padding: 8,
  },
  saveCardContainer: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    padding: 8,
  },
  switchBtn: {
    paddingVertical: 10.5,
    borderRadius: 8,
    backgroundColor: '#FFD54F',
    borderWidth: 2,
    borderColor: '#800020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#333',
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  pinModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  pinModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  pinModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pinModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinModalCancelBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pinModalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#666',
  },
  pinModalConfirmBtn: {
    backgroundColor: '#E91E63',
  },
  pinModalConfirmText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  noGroupingsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  noGroupingsTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#666',
    marginTop: 24,
    textAlign: 'center',
  },
  noGroupingsSubtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
