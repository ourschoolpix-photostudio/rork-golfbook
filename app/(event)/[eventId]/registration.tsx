import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Platform,
  Clipboard,
} from 'react-native';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';


import { Alert } from '@/utils/alertPolyfill';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RefreshCw } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabaseService } from '@/utils/supabaseService';
import { useRealtimeRegistrations, useRealtimeEvents } from '@/utils/useRealtimeSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { formatDateForDisplay, formatDateAsFullDay } from '@/utils/dateUtils';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { createPayPalPaymentLink } from '@/utils/paymentEmailService';

import { registrationCache } from '@/utils/registrationCache';
import { Member, Event } from '@/types';
import { EventPlayerModal } from '@/components/EventPlayerModal';
import { ZelleInvoiceModal } from '@/components/ZelleInvoiceModal';
import { PayPalInvoiceModal } from '@/components/PayPalInvoiceModal';
import { MembershipRenewalModal } from '@/components/MembershipRenewalModal';
import { EventDetailsModal } from '@/components/EventDetailsModal';
import { EventStatus } from '@/components/EventStatusButton';
import { calculateTournamentHandicap, addTournamentHandicapRecord } from '@/utils/tournamentHandicapHelper';
import { EventFooter } from '@/components/EventFooter';
import { AlertsModal } from '@/components/AlertsModal';
import { useAlerts } from '@/contexts/AlertsContext';
import { useFocusEffect } from 'expo-router';
import {
  getDisplayHandicap,
  hasAdjustedHandicap,
  calculateTournamentFlight,
  isUsingCourseHandicap,
} from '@/utils/handicapHelper';
import {
  canViewRegistration,
  canStartEvent,
  canRemoveAllPlayers,
  canTogglePaymentStatus,
  canAddPlayers,
} from '@/utils/rolePermissions';

export default function EventRegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { eventId, autoRegister } = useLocalSearchParams<{ eventId: string; autoRegister?: string }>();
  const { currentUser, members: allMembers, refreshMembers } = useAuth();
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { orgInfo } = useSettings();
  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Member[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlayerForEvent, setSelectedPlayerForEvent] = useState<Member | null>(null);
  const [eventPlayerModalVisible, setEventPlayerModalVisible] = useState(false);
  const [addCustomGuestModalVisible, setAddCustomGuestModalVisible] = useState(false);
  const [activeSort, setActiveSort] = useState<'all' | 'abc' | 'A' | 'B' | 'C' | 'L'>('all');
  const [registrations, setRegistrations] = useState<Record<string, any>>({});
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [membershipFilter, setMembershipFilter] = useState<'all' | 'active' | 'in-active'>('all');
  const [eventDetailsModalVisible, setEventDetailsModalVisible] = useState(false);
  const [selectedForBulkAdd, setSelectedForBulkAdd] = useState<Set<string>>(new Set());
  const [addCustomGuestName, setAddCustomGuestName] = useState('');
  const [addCustomGuestCount, setAddCustomGuestCount] = useState('');
  const [addCustomGuestNames, setAddCustomGuestNames] = useState('');
  const [addCustomGuestHandicap, setAddCustomGuestHandicap] = useState('');
  const [addCustomGuestIsSponsor, setAddCustomGuestIsSponsor] = useState(false);
  const [playerGuestCounts, setPlayerGuestCounts] = useState<Record<string, string>>({});
  const [playerGuestNames, setPlayerGuestNames] = useState<Record<string, string>>({});
  const [playerSponsorFlags, setPlayerSponsorFlags] = useState<Record<string, boolean>>({});
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] = useState(false);
  const [zelleInvoiceModalVisible, setZelleInvoiceModalVisible] = useState(false);
  const [paypalInvoiceModalVisible, setPaypalInvoiceModalVisible] = useState(false);
  const [useCourseHandicap, setUseCourseHandicap] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [membershipRenewalModalVisible, setMembershipRenewalModalVisible] = useState(false);
  const [memberForRenewal, setMemberForRenewal] = useState<Member | null>(null);
  const [pdfOptionsModalVisible, setPdfOptionsModalVisible] = useState(false);
  const [handicapConfirmModalVisible, setHandicapConfirmModalVisible] = useState(false);
  const [selectedPdfOption, setSelectedPdfOption] = useState<'checkin' | 'weelist' | 'text' | null>(null);
  const [textResultModalVisible, setTextResultModalVisible] = useState(false);
  const [textResultContent, setTextResultContent] = useState('');

  useEffect(() => {
    if (eventId) {
      console.log('[registration] 🔄 Prefetching groupings data for smooth navigation...');
      queryClient.prefetchQuery({
        queryKey: ['groupings', eventId],
        queryFn: () => supabaseService.groupings.getAll(eventId),
        staleTime: 1000 * 30,
      });
      queryClient.prefetchQuery({
        queryKey: ['scores', eventId],
        queryFn: () => supabaseService.scores.getAll(eventId),
        staleTime: 1000 * 30,
      });
      console.log('[registration] ✅ Prefetch initiated');
    }
  }, [eventId, queryClient]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [htmlViewerVisible, setHtmlViewerVisible] = useState(false);
  const [htmlViewerContent, setHtmlViewerContent] = useState('');
  const [htmlViewerTitle, setHtmlViewerTitle] = useState('');
  const [alertsModalVisible, setAlertsModalVisible] = useState<boolean>(false);
  const [criticalAlertShown, setCriticalAlertShown] = useState<boolean>(false);
  const { getCriticalUndismissedAlerts } = useAlerts();

  useFocusEffect(
    useCallback(() => {
      const criticalAlerts = getCriticalUndismissedAlerts();
      const eventSpecificCriticalAlerts = eventId ? criticalAlerts.filter(a => 
        (a.type === 'event' && a.eventId === eventId) || a.type === 'organizational'
      ) : [];
      
      if (eventSpecificCriticalAlerts.length > 0 && !criticalAlertShown) {
        setCriticalAlertShown(true);
        setTimeout(() => {
          setAlertsModalVisible(true);
        }, 500);
      }
    }, [eventId, getCriticalUndismissedAlerts, criticalAlertShown])
  );

  useRealtimeRegistrations(eventId || '', !!eventId);
  useRealtimeEvents(eventId || '', !!eventId);

  const scoresQuery = useQuery({
    queryKey: ['event-scores', eventId],
    queryFn: () => supabaseService.scores.getAll(eventId!),
    enabled: !!eventId,
  });

  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => supabaseService.events.getAll(),
  });

  const eventQuery = useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => {
      try {
        const data = await supabaseService.events.get(eventId!);
        return data;
      } catch (error) {
        console.error('[registration] ❌ Error fetching event:', error);
        throw error;
      }
    },
    enabled: !!eventId,
    retry: 2,
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });

  const registrationsQuery = useQuery({
    queryKey: ['registrations', eventId],
    queryFn: async () => {
      try {
        console.log('[registration] 🔄 Fetching registrations for event:', eventId);
        const data = await supabaseService.registrations.getAll(eventId!);
        console.log('[registration] ✅ Fetched registrations count:', data?.length || 0);
        return data;
      } catch (error) {
        console.error('[registration] ❌ Error fetching registrations:', error);
        throw error;
      }
    },
    enabled: !!eventId,
    retry: 2,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
  });

  const createMemberMutation = useMutation({
    mutationFn: (member: Member) => supabaseService.members.create(member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, updates }: { memberId: string; updates: any }) => 
      supabaseService.members.update(memberId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: ({ memberId }: { memberId: string }) => 
      supabaseService.members.delete(memberId),
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ eventId, updates }: { eventId: string; updates: any }) => 
      supabaseService.events.update(eventId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({ eventId, memberId, isSponsor }: { eventId: string; memberId: string; isSponsor?: boolean }) => 
      supabaseService.events.register(eventId, memberId, isSponsor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['registrations', eventId] });
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: ({ eventId, memberId }: { eventId: string; memberId: string }) => 
      supabaseService.events.unregister(eventId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['registrations', eventId] });
    },
  });

  const updateRegistrationMutation = useMutation({
    mutationFn: ({ registrationId, updates }: { registrationId: string; updates: any }) => 
      supabaseService.registrations.update(registrationId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['registrations', eventId] });
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ registrationId, updates }: { registrationId: string; updates: any }) => 
      supabaseService.registrations.update(registrationId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations', eventId] });
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('[registration] ❌ Error updating payment status:', errorMessage);
      Alert.alert('Error', `Failed to update payment status: ${errorMessage}`);
    },
  });

  const refreshEventData = async () => {
    await eventQuery.refetch();
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.cancelQueries({ queryKey: ['registrations', eventId] });
      await queryClient.cancelQueries({ queryKey: ['events', eventId] });
      
      queryClient.removeQueries({ queryKey: ['registrations', eventId] });
      queryClient.removeQueries({ queryKey: ['events', eventId] });
      
      const eventResult = await eventQuery.refetch();
      const registrationsResult = await registrationsQuery.refetch();
    } catch (error) {
      console.error('[registration] ❌ Error during manual refresh:', error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };



  const isProcessingRef = useRef(false);
  const lastProcessedKeyRef = useRef<string>('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isProcessingRef.current = false;
    };
  }, []);

  const processRegistrations = useCallback((regs: any[], membersData: Member[]) => {
    const registered: Member[] = [];
    const regMap: Record<string, any> = {};
    
    for (const reg of regs) {
      if (reg.isCustomGuest) {
        const customGuestMember: Member = {
          id: reg.id,
          name: reg.customGuestName || 'Unknown Guest',
          handicap: 0,
          membershipType: 'guest' as const,
          pin: '',
          isAdmin: false,
          ghin: undefined,
          email: undefined,
          phone: undefined,
          address: undefined,
          rolexPoints: 0,
          profilePhotoUrl: undefined,
          createdAt: new Date().toISOString(),
        };
        registered.push(customGuestMember);
        
        regMap[customGuestMember.name] = {
          id: reg.id,
          eventId: reg.eventId,
          playerName: customGuestMember.name,
          playerPhone: reg.playerPhone,
          paymentStatus: reg.paymentStatus === 'paid' ? 'paid' : 'unpaid',
          paymentMethod: 'zelle',
          adjustedHandicap: reg.adjustedHandicap,
          numberOfGuests: reg.numberOfGuests || 0,
          guestNames: reg.guestNames || null,
          isSponsor: reg.isSponsor || false,
          isCustomGuest: true,
          emailSent: reg.emailSent || false,
        };
      } else if (reg.memberId) {
        const member = membersData.find(m => m.id === reg.memberId);
        if (member) {
          registered.push(member);
          regMap[member.name] = {
            id: reg.id,
            eventId: reg.eventId,
            playerName: member.name,
            playerPhone: reg.playerPhone,
            paymentStatus: reg.paymentStatus === 'paid' ? 'paid' : 'unpaid',
            paymentMethod: 'zelle',
            adjustedHandicap: reg.adjustedHandicap,
            numberOfGuests: reg.numberOfGuests || 0,
            guestNames: reg.guestNames || null,
            isSponsor: reg.isSponsor || false,
            isCustomGuest: false,
            emailSent: reg.emailSent || false,
          };
        }
      }
    }
    
    return { registered, regMap };
  }, []);

  useEffect(() => {
    // Wait for both queries to complete before processing
    if (!eventQuery.data || registrationsQuery.isLoading || isProcessingRef.current) {
      console.log('[registration] Waiting for data:', {
        hasEventData: !!eventQuery.data,
        registrationsLoading: registrationsQuery.isLoading,
        isProcessing: isProcessingRef.current,
      });
      return;
    }
    
    const foundEvent = eventQuery.data;
    const regs = registrationsQuery.data || [];
    
    const dataKey = `${foundEvent.id}-${regs.length}-${regs.map(r => r.id).join(',')}-${foundEvent.registrationOpen}`;
    if (dataKey === lastProcessedKeyRef.current) {
      return;
    }
    
    if (!isMountedRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    lastProcessedKeyRef.current = dataKey;
    
    console.log('[registration] ✅ Processing data, regs count:', regs.length);
    
    setEvent(foundEvent);
    
    if (foundEvent.type === 'social') {
      setActiveSort('abc');
    }
    
    // Always process registrations (even if empty array)
    registrationCache.cacheRegistrations(foundEvent.id, regs).catch(err => {
      console.error('[registration] Cache error:', err);
    });
    
    const { registered, regMap } = processRegistrations(regs, allMembers);
    console.log('[registration] ✅ Processed players count:', registered.length);
    setSelectedPlayers(registered);
    setRegistrations(regMap);
    
    setTimeout(() => {
      if (isMountedRef.current) {
        isProcessingRef.current = false;
      }
    }, 100);
  }, [eventQuery.data, registrationsQuery.data, registrationsQuery.isLoading, allMembers, processRegistrations]);

  useEffect(() => {
    setMembers(allMembers);
  }, [allMembers]);

  useEffect(() => {
    if (eventDetailsModalVisible) {
      refreshEventData();
    }
  }, [eventDetailsModalVisible]);

  const loadCourseHandicapSetting = useCallback(async () => {
    if (eventId) {
      try {
        const key = `useCourseHandicap_${eventId}`;
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          const boolValue = value === 'true';
          setUseCourseHandicap(prev => {
            if (prev !== boolValue) {
              console.log('[registration] 🔄 Course handicap setting changed:', boolValue);
              return boolValue;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('[registration] Error loading course handicap setting:', error);
      }
    }
  }, [eventId]);

  useEffect(() => {
    loadCourseHandicapSetting();
  }, [loadCourseHandicapSetting]);

  // Poll for course handicap changes every 500ms to detect toggle changes from footer
  useEffect(() => {
    if (!eventId) return;
    
    const intervalId = setInterval(() => {
      loadCourseHandicapSetting();
    }, 500);
    
    return () => clearInterval(intervalId);
  }, [eventId, loadCourseHandicapSetting]);

  const autoRegisterProcessedRef = React.useRef(false);

  useEffect(() => {
    // Reset the ref when eventId changes (new navigation)
    autoRegisterProcessedRef.current = false;
  }, [eventId]);

  useEffect(() => {
    console.log('[registration] Auto-register effect check:', {
      autoRegister,
      hasEvent: !!event,
      hasCurrentUser: !!currentUser,
      eventQueryLoading: eventQuery.isLoading,
      registrationsQueryLoading: registrationsQuery.isLoading,
      registrationsDataDefined: registrationsQuery.data !== undefined,
      alreadyProcessed: autoRegisterProcessedRef.current,
    });

    if (
      autoRegister === 'true' && 
      event && 
      currentUser &&
      !eventQuery.isLoading && 
      !registrationsQuery.isLoading &&
      registrationsQuery.data !== undefined &&
      !autoRegisterProcessedRef.current
    ) {
      // Mark as processed immediately to prevent re-triggering
      autoRegisterProcessedRef.current = true;
      
      // Check directly against registration data, not selectedPlayers (which may not be populated yet)
      const regs = registrationsQuery.data || [];
      const isAlreadyRegistered = regs.some((r: any) => r.memberId === currentUser.id);
      
      console.log('[registration] Auto-register check:', {
        autoRegister,
        eventId: event?.id,
        currentUserId: currentUser?.id,
        registrationsCount: regs.length,
        isAlreadyRegistered,
      });
      
      if (!isAlreadyRegistered) {
        console.log('[registration] Auto-triggering payment modal from autoRegister param');
        // Clear the autoRegister param to prevent re-triggering on re-render
        router.setParams({ autoRegister: undefined });
        // Open modal after a brief delay to ensure UI is ready
        setTimeout(() => {
          console.log('[registration] Opening payment method modal now');
          setPaymentMethodModalVisible(true);
        }, 300);
      } else {
        console.log('[registration] User already registered, not auto-triggering');
        router.setParams({ autoRegister: undefined });
      }
    }
  }, [autoRegister, event, currentUser, eventQuery.isLoading, registrationsQuery.isLoading, registrationsQuery.data, router]);

  const handleHomePress = () => {
    router.push('/(tabs)');
  };

  const handleAddPlayer = async (player: Member) => {
    if (!selectedPlayers.find((p) => p.id === player.id)) {
      if (!event) return;

      try {
        await registerMutation.mutateAsync({
          eventId: event.id,
          memberId: player.id,
        });

        const updated = [...selectedPlayers, player];
        setSelectedPlayers(updated);
      } catch (error) {
        console.error('Error creating registration record:', error);
        Alert.alert('Error', 'Failed to add player. Please try again.');
        return;
      }
    }
  };

  const normalizeGuestNames = (guestNamesInput: string | undefined, guestCount: number): string | null => {
    if (!guestCount || guestCount === 0) return null;
    
    if (!guestNamesInput || guestNamesInput.trim() === '') {
      return Array(guestCount).fill('Unknown Guest').join('\n');
    }
    
    const names = guestNamesInput.split('\n').map(n => n.trim()).filter(n => n !== '');
    const missingCount = guestCount - names.length;
    
    if (missingCount > 0) {
      const unknownGuests = Array(missingCount).fill('Unknown Guest');
      return [...names, ...unknownGuests].join('\n');
    }
    
    return names.slice(0, guestCount).join('\n');
  };

  const handleBulkAddPlayers = async () => {
    if (selectedForBulkAdd.size === 0) {
      Alert.alert('No Players Selected', 'Please select at least one player to add.');
      return;
    }

    if (!event) {
      console.error('No event found');
      Alert.alert('Error', 'No event found');
      return;
    }

    try {
      const playersToAdd = members.filter((m) => selectedForBulkAdd.has(m.id));

      let updated = [...selectedPlayers];
      let newRegs: Record<string, any> = { ...registrations };
      let addedCount = 0;
      let failedPlayers: string[] = [];

      for (const player of playersToAdd) {
        if (updated.find((p) => p.id === player.id)) {
          continue;
        }

        try {
          const guestCount = event.type === 'social' ? parseInt(playerGuestCounts[player.id] || '0', 10) : undefined;
          const guestNamesValue = event.type === 'social' ? normalizeGuestNames(playerGuestNames[player.id], guestCount || 0) : undefined;
          const isSponsor = playerSponsorFlags[player.id] || false;
          
          await registerMutation.mutateAsync({
            eventId: event.id,
            memberId: player.id,
            isSponsor,
          });
          
          if (guestCount && guestCount > 0) {
            const backendRegs = await registrationsQuery.refetch();
            const playerReg = backendRegs.data?.find((r: any) => r.memberId === player.id);
            if (playerReg) {
              await updateRegistrationMutation.mutateAsync({
                registrationId: playerReg.id,
                updates: { 
                  numberOfGuests: guestCount,
                  guestNames: guestNamesValue,
                  isSponsor,
                },
              });
            }
          }

          updated = [...updated, player];
          addedCount++;
        } catch (regError) {
          console.error('✗ Failed to create registration for', player.name, ':', regError);
          failedPlayers.push(player.name);
        }
      }

      if (addedCount > 0) {
        setSelectedPlayers(updated);
        await registrationsQuery.refetch();
      }
      setSelectedForBulkAdd(new Set());
      setPlayerGuestCounts({});
      setPlayerGuestNames({});
      setPlayerSponsorFlags({});
      setModalVisible(false);

      if (failedPlayers.length > 0) {
        Alert.alert(
          'Warning',
          `Failed to add: ${failedPlayers.join(', ')}`
        );
      }
    } catch (error) {
      console.error('Fatal error in handleBulkAddPlayers:', error);
      Alert.alert('Error', 'Failed to add players. Please check console.');
    }
  };

  const groupingsQuery = useQuery({
    queryKey: ['groupings', eventId],
    queryFn: () => supabaseService.groupings.getAll(eventId!),
    enabled: !!eventId,
  });

  const syncGroupingsMutation = useMutation({
    mutationFn: ({ eventId, groupings }: { eventId: string; groupings: any[]; syncedBy?: string }) => 
      supabaseService.groupings.sync(eventId, groupings),
  });

  const handleRemovePlayer = async (playerId: string) => {
    const playerToRemove = selectedPlayers.find((p) => p.id === playerId);
    const playerReg = registrations[playerToRemove?.name || ''];
    const isCustomGuest = playerReg?.isCustomGuest || false;
    
    if (event && currentUser) {
      const eventGroupings = groupingsQuery.data || [];
      const playerInGroupings = eventGroupings.filter((g: any) => g.slots.includes(playerId));
      
      if (playerInGroupings.length > 0) {
        
        const updatedGroupings = eventGroupings.map((g: any) => {
          if (g.slots.includes(playerId)) {
            return {
              ...g,
              slots: g.slots.map((id: string | null) => id === playerId ? null : id),
            };
          }
          return g;
        });
        
        try {
          await syncGroupingsMutation.mutateAsync({
            eventId: event.id,
            groupings: updatedGroupings,
            syncedBy: currentUser.id,
          });
        } catch (error) {
          console.error('[registration] ❌ Error removing player from groupings:', error);
          Alert.alert('Warning', 'Failed to remove player from groupings, but will continue with unregistration.');
        }
      }
    }
    
    const updated = selectedPlayers.filter((p) => p.id !== playerId);
    setSelectedPlayers(updated);
    
    if (event) {
      await unregisterMutation.mutateAsync({
        eventId: event.id,
        memberId: playerId,
      });
    }

    if (playerToRemove) {
      const playerReg = registrations[playerToRemove.name];
      
      if (isCustomGuest && playerReg) {
        try {
          await supabase
            .from('event_registrations')
            .delete()
            .eq('id', playerReg.id);
        } catch (error) {
          console.error('[registration] ❌ Error deleting custom guest registration:', error);
        }
      }
      
      const newRegistrations = { ...registrations };
      delete newRegistrations[playerToRemove.name];
      setRegistrations(newRegistrations);
    }
  };

  const handleRemoveAllPlayers = async () => {
    if (event) {
      try {
        for (const player of selectedPlayers) {
          await unregisterMutation.mutateAsync({
            eventId: event.id,
            memberId: player.id,
          });
        }
        setSelectedPlayers([]);
        await registrationsQuery.refetch();
        setRegistrations({});
      } catch (error) {
        console.error('Error removing all players:', error);
      }
    }
  };

  const handlePaymentToggle = async (playerName: string, playerReg: any) => {
    if (!playerReg) {
      console.error('[registration] ❌ No registration found for player:', playerName);
      Alert.alert('Error', 'Registration not found');
      return;
    }
    
    const currentStatus = playerReg.paymentStatus;
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const backendStatus = newStatus === 'unpaid' ? 'pending' : newStatus;
    
    try {
      const updates: any = { paymentStatus: backendStatus };
      
      if (currentStatus === 'unpaid' && newStatus === 'paid') {
        updates.emailSent = false;
      }
      
      await updatePaymentStatusMutation.mutateAsync({
        registrationId: playerReg.id,
        updates,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('[registration] ❌ Payment toggle failed:', errorMessage);
      Alert.alert('Error', `Payment toggle failed: ${errorMessage}`);
    }
  };

  const handleAddCustomGuest = async () => {
    if (!addCustomGuestName.trim() || !event) {
      Alert.alert('Error', 'Please enter guest name');
      return;
    }

    if (event.type === 'tournament' && !addCustomGuestHandicap.trim()) {
      Alert.alert('Error', 'Please enter handicap for tournament');
      return;
    }

    const guestCount = addCustomGuestCount.trim() === '' ? 0 : parseInt(addCustomGuestCount, 10);
    const guestNamesValue = normalizeGuestNames(addCustomGuestNames, guestCount);
    const handicapValue = addCustomGuestHandicap.trim() !== '' ? addCustomGuestHandicap.trim() : null;

    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          member_id: null,
          is_custom_guest: true,
          custom_guest_name: addCustomGuestName.trim(),
          status: 'registered',
          payment_status: 'pending',
          number_of_guests: event.type === 'social' ? (guestCount || 0) : 0,
          guest_names: event.type === 'social' ? (guestNamesValue || null) : null,
          adjusted_handicap: handicapValue,
          is_sponsor: addCustomGuestIsSponsor,
          registered_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('[registration] ❌ Error creating custom guest registration:', error);
        throw new Error(`Failed to create registration: ${error.message}`);
      }
      
      await registrationsQuery.refetch();
      
      setAddCustomGuestName('');
      setAddCustomGuestCount('');
      setAddCustomGuestNames('');
      setAddCustomGuestHandicap('');
      setAddCustomGuestIsSponsor(false);
      setAddCustomGuestModalVisible(false);
    } catch (error) {
      console.error('[registration] ❌ Error adding custom guest:', error);
      if (error instanceof Error) {
        console.error('[registration] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to add guest: ${errorMessage}`);
    }
  };

  const handleRegisterCurrentUser = () => {
    if (!currentUser || !event) return;
    setEventDetailsModalVisible(false);
    setTimeout(() => {
      setPaymentMethodModalVisible(true);
    }, 100);
  };

  const handleZelleRegistration = async (ghin: string, email: string, phone: string, numberOfGuests?: number, guestNames?: string, paymentStatus?: 'paid' | 'pending') => {
    if (!currentUser || !event) return;

    const currentUserMember = members.find(
      (m) => m.id === currentUser.id && m.pin === currentUser.pin
    );

    if (!currentUserMember) {
      throw new Error('Member profile not found');
    }

    try {
      await updateMemberMutation.mutateAsync({
        memberId: currentUserMember.id,
        updates: {
          ghin,
          email,
          phone,
        },
      });

      await registerMutation.mutateAsync({
        eventId: event.id,
        memberId: currentUserMember.id,
      });
      
      const backendRegs = await registrationsQuery.refetch();
      const userReg = backendRegs.data?.find((r: any) => r.memberId === currentUserMember.id);
      
      if (userReg) {
        const updates: any = {};
        
        if (numberOfGuests && numberOfGuests > 0) {
          updates.numberOfGuests = numberOfGuests;
          updates.guestNames = normalizeGuestNames(guestNames, numberOfGuests);
        }
        
        if (paymentStatus === 'paid') {
          updates.paymentStatus = 'paid';
        }
        
        if (Object.keys(updates).length > 0) {
          await updateRegistrationMutation.mutateAsync({
            registrationId: userReg.id,
            updates,
          });
        }
      }
      
      if (paymentStatus !== 'paid' && paymentStatus !== undefined) {
        try {
          const paymentMethodText = paymentStatus === 'pending' ? 'Zelle' : 'PayPal';
          await addNotification({
            eventId: event.id,
            type: 'registration',
            title: 'New Registration',
            message: `${currentUserMember.name} registered for ${event.name} via ${paymentMethodText}`,
            metadata: {
              eventName: event.name,
              playerName: currentUserMember.name,
              playerPhone: phone || currentUserMember.phone || null,
              paymentMethod: paymentStatus === 'pending' ? 'zelle' : 'paypal',
            },
          });
        } catch (notifError) {
          console.error('[Registration] ⚠️ Warning: Failed to add notification:', notifError);
        }
      }

      const updated = [...selectedPlayers, currentUserMember];
      setSelectedPlayers(updated);
      
      await registrationsQuery.refetch();

      setZelleInvoiceModalVisible(false);
      setPaypalInvoiceModalVisible(false);
    } catch (error) {
      console.error('[Registration] ❌ ERROR during registration:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error) {
        console.error('[Registration] Error message:', error.message);
        console.error('[Registration] Error stack:', error.stack);
      }
      Alert.alert('Registration Error', `Failed to register: ${errorMessage}`);
      throw error;
    }
  };

  const handlePaymentMethodSelected = async (paymentMethod: 'zelle' | 'paypal') => {
    setPaymentMethodModalVisible(false);
    
    if (paymentMethod === 'zelle') {
      setZelleInvoiceModalVisible(true);
    } else if (paymentMethod === 'paypal') {
      setPaypalInvoiceModalVisible(true);
    }
  };

  const handleGenerateList = async (includeHandicaps: boolean) => {
    setHandicapConfirmModalVisible(false);
    
    console.log('[registration] handleGenerateList called:', {
      includeHandicaps,
      selectedPdfOption,
      eventName: event?.name,
      selectedPlayersCount: selectedPlayers.length,
    });
    
    if (!event) {
      console.error('[registration] No event found');
      Alert.alert('Error', 'No event data available');
      setSelectedPdfOption(null);
      return;
    }
    
    if (selectedPlayers.length === 0) {
      console.error('[registration] No players to generate list for');
      Alert.alert('Error', 'No players registered for this event');
      setSelectedPdfOption(null);
      return;
    }

    const sortedPlayers = [...selectedPlayers].sort((a, b) => a.name.localeCompare(b.name));
    const paidPlayers = sortedPlayers.filter(p => registrations[p.name]?.paymentStatus === 'paid');
    const unpaidPlayers = sortedPlayers.filter(p => registrations[p.name]?.paymentStatus !== 'paid');
    
    console.log('[registration] Players sorted:', {
      total: sortedPlayers.length,
      paid: paidPlayers.length,
      unpaid: unpaidPlayers.length,
    });

    if (selectedPdfOption === 'text') {
      console.log('[registration] Generating Text List...');
      const textContent = generateTextList(sortedPlayers, includeHandicaps);
      console.log('[registration] Text generated, length:', textContent.length);
      setTextResultContent(textContent);
      setTextResultModalVisible(true);
      setSelectedPdfOption(null);
      return;
    }

    setIsGeneratingPdf(true);

    try {
      if (selectedPdfOption === 'checkin') {
        console.log('[registration] Generating Check In List PDF...');
        await generateAndSharePdf('checkin', paidPlayers, unpaidPlayers, sortedPlayers, includeHandicaps);
      } else if (selectedPdfOption === 'weelist') {
        console.log('[registration] Generating Wee List PDF...');
        await generateAndSharePdf('weelist', paidPlayers, unpaidPlayers, sortedPlayers, includeHandicaps);
      } else {
        console.error('[registration] Unknown option:', selectedPdfOption);
        Alert.alert('Error', 'Unknown list type selected');
      }
      
      console.log('[registration] List generation completed successfully');
    } catch (error) {
      console.error('[registration] Error generating list:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Failed to generate list: ${errorMessage}`);
    } finally {
      setIsGeneratingPdf(false);
    }
    
    setSelectedPdfOption(null);
  };

  const handleCopyTextToClipboard = () => {
    Clipboard.setString(textResultContent);
    Alert.alert('Copied', 'Player list copied to clipboard');
    setTextResultModalVisible(false);
    setTextResultContent('');
  };

  const handleSaveTextAsPdf = async () => {
    const eventName = event?.name || 'Event';
    const eventDate = event?.date ? formatDateForDisplay(event.date) : '';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }
            h1 { color: #1B5E20; font-size: 24px; margin-bottom: 4px; }
            .date { color: #666; font-size: 14px; margin-bottom: 20px; }
            .divider { border-top: 1px solid #ccc; margin: 16px 0; }
            pre { font-family: monospace; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>${eventName}</h1>
          <div class="date">${eventDate}</div>
          <div class="divider"></div>
          <pre>${textResultContent}</pre>
        </body>
      </html>
    `;
    
    try {
      if (Platform.OS === 'web') {
        console.log('[registration] Opening print dialog for web (text list)...');
        await Print.printAsync({ html: htmlContent });
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        console.log('[registration] PDF generated at:', uri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `${eventName} - Player List`,
          });
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        }
      }
      
      setTextResultModalVisible(false);
      setTextResultContent('');
    } catch (error) {
      console.error('[registration] Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  const handleEmailTextList = async () => {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Email Not Available', 'Please configure an email account on your device.');
      return;
    }
    
    const eventName = event?.name || 'Event';
    const eventDate = event?.date ? formatDateForDisplay(event.date) : '';
    const subject = `${eventName} - Player List`;
    
    const htmlBody = `
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <h2 style="color: #1B5E20; margin-bottom: 4px;">${eventName}</h2>
  <p style="color: #666; margin-top: 0;">${eventDate}</p>
  <hr style="border: none; border-top: 1px solid #ccc;">
  <pre style="font-family: monospace; font-size: 14px; line-height: 1.6;">${textResultContent}</pre>
</body>
</html>
    `;
    
    try {
      await MailComposer.composeAsync({
        subject,
        body: htmlBody,
        isHtml: true,
      });
      setTextResultModalVisible(false);
      setTextResultContent('');
    } catch (error) {
      console.error('[registration] Error sending email:', error);
      Alert.alert('Error', 'Failed to open email composer');
    }
  };

  const handleSaveHtmlAsPdf = async () => {
    const eventName = event?.name || 'Event';
    const eventDate = event?.date ? formatDateForDisplay(event.date) : '';
    
    let data: any = {};
    try {
      data = JSON.parse(htmlViewerContent);
    } catch (e) {
      console.error('Failed to parse HTML content:', e);
    }
    
    let playersHtml = '';
    
    if (data.type === 'checkin') {
      playersHtml += `
        <div style="margin-bottom: 20px;">
          <div style="background: #E8F5E9; padding: 8px 12px; border-radius: 6px; display: inline-block; margin-bottom: 12px;">
            <span style="color: #1B5E20; font-weight: 700;">✓ PAID (${data.paid?.length || 0})</span>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.paid?.map((player: any) => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 4px; width: 30px; color: #999;">${player.index}.</td>
                <td style="padding: 8px 4px;">${player.name}</td>
                ${data.includeHandicaps ? `<td style="padding: 8px 4px; text-align: right; color: #1976D2;">${player.handicap}</td>` : ''}
                <td style="padding: 8px 4px; width: 30px; text-align: center;">☐</td>
              </tr>
            `).join('') || ''}
          </table>
        </div>
        <div>
          <div style="background: #FFEBEE; padding: 8px 12px; border-radius: 6px; display: inline-block; margin-bottom: 12px;">
            <span style="color: #C62828; font-weight: 700;">✗ UNPAID (${data.unpaid?.length || 0})</span>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.unpaid?.map((player: any) => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 4px; width: 30px; color: #999;">${player.index}.</td>
                <td style="padding: 8px 4px;">${player.name}</td>
                ${data.includeHandicaps ? `<td style="padding: 8px 4px; text-align: right; color: #1976D2;">${player.handicap}</td>` : ''}
                <td style="padding: 8px 4px; width: 30px; text-align: center;">☐</td>
              </tr>
            `).join('') || ''}
          </table>
        </div>
        <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #ccc; text-align: center; color: #666;">
          Total: ${(data.paid?.length || 0) + (data.unpaid?.length || 0)} players
        </div>
      `;
    } else if (data.type === 'weelist') {
      playersHtml += `
        <div style="display: flex; flex-direction: column;">
          ${data.players?.map((player: any) => `
            <div style="padding: 6px 0; border-bottom: 1px solid #eee;">
              <span style="font-size: 16px; color: #1a1a1a;">${player.index}. ${player.name}${data.includeHandicaps ? ` <span style="color: #1976D2; font-weight: 600;">(${player.handicap})</span>` : ''}</span>
            </div>
          `).join('') || ''}
        </div>
        <div style="margin-top: 16px; padding-top: 8px; border-top: 2px solid #1B5E20; text-align: center; color: #666; font-size: 14px; font-weight: 600;">
          Total: ${data.players?.length || 0} players
        </div>
      `;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }
            h1 { color: #1B5E20; font-size: 24px; margin-bottom: 4px; text-align: center; }
            .date { color: #666; font-size: 14px; margin-bottom: 20px; text-align: center; }
            .divider { border-top: 1px solid #ccc; margin: 16px 0; }
          </style>
        </head>
        <body>
          <h1>${eventName}</h1>
          <div class="date">${eventDate}</div>
          <div class="divider"></div>
          ${playersHtml}
        </body>
      </html>
    `;
    
    try {
      if (Platform.OS === 'web') {
        console.log('[registration] Opening print dialog for web (HTML list)...');
        await Print.printAsync({ html: htmlContent });
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        console.log('[registration] PDF generated at:', uri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `${eventName} - ${htmlViewerTitle}`,
          });
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        }
      }
      
      setHtmlViewerVisible(false);
      setHtmlViewerContent('');
    } catch (error) {
      console.error('[registration] Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  const handleEmailHtmlList = async () => {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Email Not Available', 'Please configure an email account on your device.');
      return;
    }
    
    const eventName = event?.name || 'Event';
    const eventDate = event?.date ? formatDateForDisplay(event.date) : '';
    const subject = `${eventName} - ${htmlViewerTitle}`;
    
    let data: any = {};
    try {
      data = JSON.parse(htmlViewerContent);
    } catch (e) {
      console.error('Failed to parse HTML content:', e);
    }
    
    let playersHtml = '';
    
    if (data.type === 'checkin') {
      playersHtml += `
        <div style="margin-bottom: 20px;">
          <div style="background: #E8F5E9; padding: 8px 12px; border-radius: 6px; display: inline-block; margin-bottom: 12px;">
            <span style="color: #1B5E20; font-weight: 700;">✓ PAID (${data.paid?.length || 0})</span>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.paid?.map((player: any) => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 4px; width: 30px; color: #999;">${player.index}.</td>
                <td style="padding: 8px 4px;">${player.name}</td>
                ${data.includeHandicaps ? `<td style="padding: 8px 4px; text-align: right; color: #1976D2;">${player.handicap}</td>` : ''}
              </tr>
            `).join('') || ''}
          </table>
        </div>
        <div>
          <div style="background: #FFEBEE; padding: 8px 12px; border-radius: 6px; display: inline-block; margin-bottom: 12px;">
            <span style="color: #C62828; font-weight: 700;">✗ UNPAID (${data.unpaid?.length || 0})</span>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.unpaid?.map((player: any) => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 4px; width: 30px; color: #999;">${player.index}.</td>
                <td style="padding: 8px 4px;">${player.name}</td>
                ${data.includeHandicaps ? `<td style="padding: 8px 4px; text-align: right; color: #1976D2;">${player.handicap}</td>` : ''}
              </tr>
            `).join('') || ''}
          </table>
        </div>
        <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #ccc; text-align: center; color: #666;">
          Total: ${(data.paid?.length || 0) + (data.unpaid?.length || 0)} players
        </div>
      `;
    } else if (data.type === 'weelist') {
      playersHtml += `
        <div style="display: flex; flex-direction: column;">
          ${data.players?.map((player: any) => `
            <div style="padding: 6px 0; border-bottom: 1px solid #eee;">
              <span style="font-size: 16px; color: #1a1a1a;">${player.index}. ${player.name}${data.includeHandicaps ? ` <span style="color: #1976D2; font-weight: 600;">(${player.handicap})</span>` : ''}</span>
            </div>
          `).join('') || ''}
        </div>
        <div style="margin-top: 16px; padding-top: 8px; border-top: 2px solid #1B5E20; text-align: center; color: #666; font-size: 14px; font-weight: 600;">
          Total: ${data.players?.length || 0} players
        </div>
      `;
    }
    
    const htmlBody = `
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <h2 style="color: #1B5E20; margin-bottom: 4px; text-align: center;">${eventName}</h2>
  <p style="color: #666; margin-top: 0; text-align: center;">${eventDate}</p>
  <hr style="border: none; border-top: 1px solid #ccc;">
  ${playersHtml}
</body>
</html>
    `;
    
    try {
      await MailComposer.composeAsync({
        subject,
        body: htmlBody,
        isHtml: true,
      });
      setHtmlViewerVisible(false);
      setHtmlViewerContent('');
    } catch (error) {
      console.error('[registration] Error sending email:', error);
      Alert.alert('Error', 'Failed to open email composer');
    }
  };

  const generateCheckInHtml = (paidPlayers: Member[], unpaidPlayers: Member[], includeHandicaps: boolean): string => {
    const generatePlayerItems = (players: Member[]) => {
      return players.map((player, index) => {
        const playerReg = registrations[player.name];
        const handicap = playerReg?.adjustedHandicap ?? player.handicap ?? 0;
        return { name: player.name, handicap, index: index + 1 };
      });
    };

    return JSON.stringify({
      type: 'checkin',
      paid: generatePlayerItems(paidPlayers),
      unpaid: generatePlayerItems(unpaidPlayers),
      includeHandicaps,
    });
  };

  const generateWeeListHtml = (players: Member[], includeHandicaps: boolean): string => {
    const playerItems = players.map((player, index) => {
      const playerReg = registrations[player.name];
      const handicap = playerReg?.adjustedHandicap ?? player.handicap ?? 0;
      return { name: player.name, handicap, index: index + 1 };
    });

    return JSON.stringify({
      type: 'weelist',
      players: playerItems,
      includeHandicaps,
    });
  };

  const generateAndSharePdf = async (
    type: 'checkin' | 'weelist',
    paidPlayers: Member[],
    unpaidPlayers: Member[],
    allPlayers: Member[],
    includeHandicaps: boolean
  ) => {
    const eventName = event?.name || 'Event';
    const eventDate = event?.date ? formatDateForDisplay(event.date) : '';
    
    let playersHtml = '';
    
    if (type === 'checkin') {
      const sortedAllPlayers = [...allPlayers].sort((a, b) => a.name.localeCompare(b.name));
      
      const generatePlayerRows = (players: Member[]) => {
        return players.map((player, index) => {
          const playerReg = registrations[player.name];
          const handicap = playerReg?.adjustedHandicap ?? player.handicap ?? 0;
          const isPaid = playerReg?.paymentStatus === 'paid';
          const unpaidLabel = !isPaid ? '<span style="color: #DC2626; font-weight: 600; font-size: 12px;">UNPAID</span>' : '';
          
          return `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 4px; width: 30px; color: #333; font-weight: 600;">${index + 1}.</td>
              <td style="padding: 8px 4px;">${player.name}</td>
              ${includeHandicaps ? `<td style="padding: 8px 4px; text-align: right; color: #1976D2;">${handicap}</td>` : ''}
              <td style="padding: 8px 4px; width: 80px; text-align: right;">${unpaidLabel}</td>
              <td style="padding: 8px 4px; width: 30px; text-align: center;">☐</td>
            </tr>
          `;
        }).join('');
      };
      
      playersHtml = `
        <div>
          <table style="width: 100%; border-collapse: collapse;">
            ${generatePlayerRows(sortedAllPlayers)}
          </table>
        </div>
        <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #ccc; text-align: center; color: #666;">
          Total: ${allPlayers.length} players
        </div>
      `;
    } else if (type === 'weelist') {
      const playerItems = allPlayers.map((player, index) => {
        const playerReg = registrations[player.name];
        const handicap = playerReg?.adjustedHandicap ?? player.handicap ?? 0;
        return `
          <div style="padding: 6px 0; border-bottom: 1px solid #eee;">
            <span style="font-size: 16px; color: #1a1a1a;">${index + 1}. ${player.name}${includeHandicaps ? ` <span style="color: #1976D2; font-weight: 600;">(${handicap})</span>` : ''}</span>
          </div>
        `;
      }).join('');
      
      playersHtml = `
        <div>
          ${playerItems}
        </div>
        <div style="margin-top: 16px; padding-top: 8px; border-top: 2px solid #1B5E20; text-align: center; color: #666; font-size: 14px; font-weight: 600;">
          Total: ${allPlayers.length} players
        </div>
      `;
    }
    
    const pageWidth = type === 'weelist' ? '2.5in' : '8.5in';
    const pageHeight = type === 'weelist' ? 'auto' : '11in';
    const pagePadding = type === 'weelist' ? '16px 12px' : '40px';
    const titleSize = type === 'weelist' ? '18px' : '24px';
    const dateSize = type === 'weelist' ? '12px' : '14px';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: ${pageWidth} ${pageHeight}; margin: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              padding: ${pagePadding};
              margin: 0;
              width: ${pageWidth};
              box-sizing: border-box;
            }
            h1 { color: #1B5E20; font-size: ${titleSize}; margin-bottom: 4px; text-align: center; font-weight: 700; }
            .date { color: #666; font-size: ${dateSize}; margin-bottom: 16px; text-align: center; }
            .divider { border-top: 2px solid #1B5E20; margin: 12px 0; }
          </style>
        </head>
        <body>
          <h1>${eventName}</h1>
          <div class="date">${eventDate}</div>
          <div class="divider"></div>
          ${playersHtml}
        </body>
      </html>
    `;
    
    const listTitle = type === 'checkin' ? 'Check In List' : 'Web List';
    
    try {
      if (Platform.OS === 'web') {
        console.log('[registration] Opening print dialog for web...');
        await Print.printAsync({ html: htmlContent });
        console.log('[registration] Print dialog opened successfully');
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        console.log('[registration] PDF generated at:', uri);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `${eventName} - ${listTitle}`,
          });
          console.log('[registration] Share sheet opened successfully');
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        }
      }
    } catch (error) {
      console.error('[registration] Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  const generateTextList = (players: Member[], includeHandicaps: boolean): string => {
    const eventName = event?.name || 'Event';
    const eventDate = event?.date ? formatDateForDisplay(event.date) : '';
    
    let text = `${eventName}\n${eventDate}\n${'─'.repeat(30)}\n\n`;
    
    players.forEach((player, index) => {
      const playerReg = registrations[player.name];
      const handicap = playerReg?.adjustedHandicap ?? player.handicap ?? 0;
      const handicapText = includeHandicaps ? ` (${handicap})` : '';
      text += `${index + 1}. ${player.name}${handicapText}\n`;
    });
    
    text += `\n${'─'.repeat(30)}\nTotal: ${players.length} players`;
    
    return text;
  };
  const isCurrentUserRegistered = () => {
    if (!currentUser) return false;
    return selectedPlayers.some((p) => p.id === currentUser.id && p.pin === currentUser.pin);
  };

  const getPaymentDeadline = (eventDate: string) => {
    if (!eventDate) return 'N/A';
    const date = new Date(eventDate);
    const deadlineDate = new Date(date);
    deadlineDate.setDate(deadlineDate.getDate() - 10);
    return deadlineDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const generatePlayerInvoiceHtml = (player: Member, playerReg: any, paypalApprovalUrl: string, paypalAmountWithFee: number): string => {
    if (!event || !orgInfo) return '';
    
    const entryFee = Number(event.entryFee) || 0;
    const guestCount = playerReg?.numberOfGuests || 0;
    const totalPeople = 1 + guestCount;
    const totalAmount = entryFee * totalPeople;
    
    const zellePhone = formatPhoneNumber(orgInfo.zellePhone || '5714811006');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .header p {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      color: #1a1a1a;
      margin-bottom: 24px;
    }
    .event-card {
      background-color: #f8f9fa;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid #e0e0e0;
    }
    .event-card h2 {
      color: #1B5E20;
      font-size: 22px;
      margin: 0 0 16px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e8e8e8;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #666;
      font-weight: 600;
      font-size: 15px;
    }
    .detail-value {
      color: #1a1a1a;
      font-weight: 600;
      font-size: 15px;
      text-align: right;
    }
    .amount-box {
      background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
      border: 2px solid #1B5E20;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      text-align: center;
    }
    .amount-label {
      color: #2E7D32;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .amount-value {
      color: #1B5E20;
      font-size: 42px;
      font-weight: 700;
    }
    .payment-section {
      margin-bottom: 24px;
    }
    .payment-section h3 {
      color: #333;
      font-size: 18px;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #1B5E20;
    }
    .zelle-box {
      background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%);
      border: 2px solid #6B21A8;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin-bottom: 16px;
    }
    .zelle-label {
      color: #6B21A8;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .zelle-number {
      color: #6B21A8;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .paypal-box {
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      border: 2px solid #D97706;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .paypal-label {
      color: #92400E;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .paypal-amount {
      color: #D97706;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .paypal-note {
      color: #92400E;
      font-size: 13px;
      margin-bottom: 12px;
    }
    .paypal-button {
      display: inline-block;
      background: #0070BA;
      color: white;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
    }
    .deadline-box {
      background-color: #FEE2E2;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .deadline-box p {
      color: #DC2626;
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 32px 24px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .thank-you {
      color: #1B5E20;
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .footer-text {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>REGISTRATION INVOICE</h1>
      <p>${orgInfo.name || 'Golf Club'}</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hello <strong>${player.name}</strong>,</p>
      
      <div class="event-card">
        <h2>${event.name}</h2>
        <div class="detail-row">
          <span class="detail-label">Venue</span>
          <span class="detail-value">${event.venue || event.location}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formatDateAsFullDay(event.date, event.numberOfDays, 1)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Registrant</span>
          <span class="detail-value">${player.name}${guestCount > 0 ? ` + ${guestCount} guest${guestCount > 1 ? 's' : ''}` : ''}</span>
        </div>
      </div>
      
      <div class="amount-box">
        <p class="amount-label">Total Amount Due</p>
        <p class="amount-value">${totalAmount.toFixed(2)}</p>
      </div>
      
      <div class="payment-section">
        <h3>Payment Options</h3>
        
        <div class="zelle-box">
          <p class="zelle-label">PAY VIA ZELLE</p>
          <p class="zelle-number">${zellePhone}</p>
        </div>
        
        <div class="paypal-box">
          <p class="paypal-label">PAY VIA PAYPAL</p>
          <p class="paypal-amount">${paypalAmountWithFee.toFixed(2)}</p>
          <p class="paypal-note">(Includes processing fee)</p>
          <a href="${paypalApprovalUrl}" class="paypal-button">PAY WITH PAYPAL</a>
        </div>
      </div>
      
      <div class="deadline-box">
        <p>⏰ Payment must be received by <strong>${getPaymentDeadline(event.date)}</strong></p>
        <p style="margin-top: 8px; font-weight: normal;">Your registration will be removed if payment is not received by the deadline.</p>
      </div>
    </div>
    
    <div class="footer">
      <p class="thank-you">Thank You for Registering!</p>
      <p class="footer-text">We look forward to seeing you at the event.<br>If you have any questions, please contact us.</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handleSendPlayerInvoice = async (player: Member, playerReg: any) => {
    if (!player.email) {
      Alert.alert('No Email', 'This player does not have an email address on file.');
      return;
    }

    if (!event) {
      Alert.alert('Error', 'Event information not available.');
      return;
    }

    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Email Not Available', 'Please configure an email account on your device.');
      return;
    }

    try {
      console.log('[registration] Creating PayPal payment link for player invoice...');
      
      const guestCount = playerReg?.numberOfGuests || 0;
      const totalPeople = 1 + guestCount;
      const entryFee = Number(event.entryFee);
      const totalAmount = entryFee * totalPeople;

      const paypalLink = await createPayPalPaymentLink({
        amount: totalAmount,
        eventName: event.name,
        eventId: event.id,
        playerEmail: player.email,
        itemDescription: `${event.name} Registration`,
        dueDate: getPaymentDeadline(event.date),
        includeProcessingFee: true,
      });

      console.log('[registration] PayPal link created successfully');
      console.log('[registration] Approval URL:', paypalLink.approvalUrl);

      const htmlContent = generatePlayerInvoiceHtml(player, playerReg, paypalLink.approvalUrl, paypalLink.amountWithFee);
      const subject = `Registration Invoice - ${event.name}`;

      const result = await MailComposer.composeAsync({
        recipients: [player.email],
        subject,
        body: htmlContent,
        isHtml: true,
      });

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        if (playerReg?.id) {
          await updateRegistrationMutation.mutateAsync({
            registrationId: playerReg.id,
            updates: { emailSent: true },
          });
          await registrationsQuery.refetch();
        }
        Alert.alert('Success', `Invoice sent to ${player.email}`);
      }
    } catch (error) {
      console.error('[registration] Error sending invoice email:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to send email. Please try again.';
      Alert.alert('Error', errorMsg);
    }
  };

  const handlePlayerCardPress = async (player: Member) => {
    if (canViewRegistration(currentUser)) {
      await registrationsQuery.refetch();
      
      // Prioritize selectedPlayers (local state) as it has the most recent updates
      // then fall back to allMembers (from AuthContext)
      const freshFromSelected = selectedPlayers.find(m => m.id === player.id);
      const freshFromMembers = allMembers.find(m => m.id === player.id);
      const freshPlayer = freshFromSelected || freshFromMembers || player;
      
      console.log('[registration] Opening modal for player:', freshPlayer.name, 'membershipType:', freshPlayer.membershipType);
      setSelectedPlayerForEvent(freshPlayer);
      setEventPlayerModalVisible(true);
    }
  };

  const handleSavePlayerChanges = async (updatedPlayer: Member, adjustedHandicap: string | null | undefined, numberOfGuests?: number, guestNames?: string, isSponsor?: boolean) => {
    try {
      console.log('[registration] Saving player changes:', updatedPlayer.name, 'membershipType:', updatedPlayer.membershipType);
      
      await updateMemberMutation.mutateAsync({
        memberId: updatedPlayer.id,
        updates: {
          handicap: updatedPlayer.handicap,
          membershipType: updatedPlayer.membershipType,
        },
      });
      
      // Immediately update local selectedPlayers state with the new membershipType
      setSelectedPlayers(prev => prev.map(p => 
        p.id === updatedPlayer.id 
          ? { ...p, handicap: updatedPlayer.handicap, membershipType: updatedPlayer.membershipType }
          : p
      ));
      
      let playerReg = registrations[updatedPlayer.name];
      
      if (!playerReg) {
        await registrationsQuery.refetch();
        const backendRegs = registrationsQuery.data || [];
        playerReg = backendRegs.find((r: any) => r.memberId === updatedPlayer.id);
      }
      
      if (playerReg) {
        await updateRegistrationMutation.mutateAsync({
          registrationId: playerReg.id,
          updates: {
            adjustedHandicap,
            numberOfGuests,
            guestNames: guestNames || null,
            isSponsor,
          },
        });
      } else {
        console.error('[registration] ❌ Registration not found for player:', updatedPlayer.name, 'memberId:', updatedPlayer.id);
        Alert.alert('Error', 'Registration not found. Please try removing and re-adding the player.');
        throw new Error('Registration not found');
      }
      
      // Refresh AuthContext members to ensure membershipType change persists across navigation
      console.log('[registration] 🔄 Refreshing AuthContext members...');
      await refreshMembers();
      
      await eventQuery.refetch();
      await registrationsQuery.refetch();
      
      console.log('[registration] ✓ Player changes saved successfully');
    } catch (error) {
      console.error('[registration] ❌ Error updating player:', error);
      Alert.alert('Error', `Failed to update player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const getPlayersFlights = useMemo((): Record<string, Member[]> => {
    const flights: Record<string, Member[]> = { A: [], B: [], C: [], L: [] };

    selectedPlayers.forEach((player) => {
      const playerReg = registrations[player.name];
      const flight = calculateTournamentFlight(player, Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, playerReg, event || undefined, useCourseHandicap, 1);
      if (flight in flights) {
        flights[flight].push(player);
      }
    });

    Object.keys(flights).forEach((flight) => {
      flights[flight].sort((a, b) => a.name.localeCompare(b.name));
    });

    return flights;
  }, [selectedPlayers, event?.flightACutoff, event?.flightBCutoff, registrations, useCourseHandicap, event]);

  const getDisplayedPlayers = useMemo((): Member[] => {
    let players: Member[] = [];
    if (activeSort === 'all') {
      const flights = getPlayersFlights;
      players = [...flights.A, ...flights.B, ...flights.C, ...flights.L];
    } else if (activeSort === 'abc') {
      players = [...selectedPlayers].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const flights = getPlayersFlights;
      players = flights[activeSort] || [];
    }

    if (paymentFilter === 'paid') {
      players = players.filter((p) => registrations[p.name]?.paymentStatus === 'paid');
    } else if (paymentFilter === 'unpaid') {
      players = players.filter((p) => registrations[p.name]?.paymentStatus === 'unpaid');
    }

    if (membershipFilter === 'active') {
      players = players.filter((p) => p.membershipType === 'active');
    } else if (membershipFilter === 'in-active') {
      players = players.filter((p) => p.membershipType === 'in-active');
    }

    return players;
  }, [activeSort, selectedPlayers, getPlayersFlights, paymentFilter, registrations, membershipFilter]);

  const getAvailableFlights = useMemo((): string[] => {
    const available: string[] = [];
    if (getPlayersFlights.A.length > 0) available.push('A');
    if (getPlayersFlights.B.length > 0) available.push('B');
    if (getPlayersFlights.C.length > 0) available.push('C');
    if (getPlayersFlights.L.length > 0) available.push('L');
    return available;
  }, [getPlayersFlights]);

  const getFlightCounts = useMemo(() => {
    const flights: Record<string, number> = { A: 0, B: 0, C: 0, L: 0 };
    selectedPlayers.forEach((player) => {
      const playerReg = registrations[player.name];
      const flight = calculateTournamentFlight(player, Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, playerReg, event || undefined, useCourseHandicap, 1);
      if (flight in flights) {
        flights[flight]++;
      }
    });
    return flights;
  }, [selectedPlayers, event?.flightACutoff, event?.flightBCutoff, registrations, useCourseHandicap, event]);

  const getFlightCountsString = useMemo(() => {
    const counts: string[] = [];
    if (getFlightCounts.A > 0) counts.push(`A: ${getFlightCounts.A}`);
    if (getFlightCounts.B > 0) counts.push(`B: ${getFlightCounts.B}`);
    if (getFlightCounts.C > 0) counts.push(`C: ${getFlightCounts.C}`);
    if (getFlightCounts.L > 0) counts.push(`L: ${getFlightCounts.L}`);
    return counts.length > 0 ? ` - ${counts.join(', ')}` : '';
  }, [getFlightCounts]);

  const getPlayersWithSeparators = useMemo(() => {
    let players = getDisplayedPlayers;
    
    if (event?.type === 'social') {
      players = [...players].sort((a, b) => {
        const aReg = registrations[a.name];
        const bReg = registrations[b.name];
        const aIsSponsor = aReg?.isSponsor || false;
        const bIsSponsor = bReg?.isSponsor || false;
        
        if (aIsSponsor && !bIsSponsor) return -1;
        if (!aIsSponsor && bIsSponsor) return 1;
        return a.name.localeCompare(b.name);
      });
      return players.map((player) => ({ type: 'player', data: player }));
    }
    
    if (activeSort !== 'all') {
      return players.map((player) => ({ type: 'player', data: player }));
    }
    const result: any[] = [];
    let currentFlight: string | null = null;

    players.forEach((player) => {
      const playerReg = registrations[player.name];
      const playerFlight = calculateTournamentFlight(player, Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, playerReg, event || undefined, useCourseHandicap, 1);
      if (playerFlight !== currentFlight) {
        currentFlight = playerFlight;
        result.push({ type: 'separator', flight: playerFlight });
      }
      result.push({ type: 'player', data: player });
    });

    return result;
  }, [getDisplayedPlayers, activeSort, event?.flightACutoff, event?.flightBCutoff, event?.type, useCourseHandicap, registrations]);

  const getTotalGuestCount = useMemo(() => {
    return Object.values(registrations).reduce((total, reg) => {
      return total + (reg.numberOfGuests || 0);
    }, 0);
  }, [registrations]);

  const getTotalPeopleCount = useMemo(() => {
    const regs = registrationsQuery.data || [];
    
    const nonSponsorMemberCount = regs.filter(reg => 
      !reg.isCustomGuest && !reg.isSponsor
    ).length;
    
    const nonSponsorCustomGuestCount = regs.filter(reg => 
      reg.isCustomGuest && !reg.isSponsor
    ).length;
    
    const additionalGuestCount = regs
      .filter(reg => !reg.isSponsor)
      .reduce((total, reg) => total + (reg.numberOfGuests || 0), 0);
    
    return nonSponsorMemberCount + nonSponsorCustomGuestCount + additionalGuestCount;
  }, [registrationsQuery.data]);

  const getTotalPaidAmount = useMemo(() => {
    if (!event?.entryFee) return 0;
    const entryFee = Number(event.entryFee) || 0;
    return Object.values(registrations)
      .filter((reg) => reg.paymentStatus === 'paid')
      .reduce((total, reg) => {
        const guestCount = reg.numberOfGuests || 0;
        const totalPeople = 1 + guestCount;
        return total + (entryFee * totalPeople);
      }, 0);
  }, [registrations, event?.entryFee]);

  const isLoadingData = eventQuery.isLoading || 
    registrationsQuery.isLoading || 
    (!!eventQuery.data && !registrationsQuery.data && registrationsQuery.fetchStatus !== 'idle');

  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>REGISTRATION</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B5E20" />
          <Text style={styles.loadingText}>Loading event data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (eventQuery.isError) {
    const errorMessage = eventQuery.error instanceof Error ? eventQuery.error.message : 'Failed to load event data';
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>REGISTRATION</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error Loading Event</Text>
          <Text style={styles.errorText}>
            {errorMessage}
          </Text>
          <Text style={[styles.errorText, { fontSize: 12, marginTop: 8, color: '#999' }]}>
            Event ID: {eventId}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              eventQuery.refetch();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: '#666', marginTop: 12 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>REGISTRATION</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Event Not Found</Text>
          <Text style={styles.errorText}>The event you&apos;re looking for could not be found.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
      <AlertsModal
        visible={alertsModalVisible}
        onClose={() => {
          setAlertsModalVisible(false);
          setCriticalAlertShown(false);
        }}
        eventId={eventId as string}
      />
      <View style={styles.header}>
        <View style={styles.headerButtonsRow}>
          {event && currentUser?.isAdmin && (
            <TouchableOpacity
              style={[
                styles.headerActionButton,
                event.registrationOpen ? styles.headerActionButtonOpen : styles.headerActionButtonClosed,
              ]}
              onPress={async () => {
                const newValue = !event.registrationOpen;
                await updateEventMutation.mutateAsync({
                  eventId: event.id,
                  updates: { registrationOpen: newValue },
                });
                setEvent({ ...event, registrationOpen: newValue });
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={event.registrationOpen ? "lock-open" : "lock-closed"} 
                size={16} 
                color="#333" 
              />
              <Text style={styles.headerActionButtonText}>{event.registrationOpen ? 'Close' : 'Open'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={handleManualRefresh} 
            style={styles.headerActionButton}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            <RefreshCw 
              size={16} 
              color="#333" 
              style={isRefreshing ? styles.refreshing : undefined}
            />
            <Text style={styles.headerActionButtonText}>Refresh</Text>
          </TouchableOpacity>
          {currentUser?.isAdmin && (
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => setPdfOptionsModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={16} color="#333" />
              <Text style={styles.headerActionButtonText}>PDF</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerTitle}>REGISTRATION</Text>
      </View>

      {event && !event.registrationOpen && (
        <View style={styles.registrationClosedBanner}>
          <Ionicons name="information-circle" size={20} color="#C62828" />
          <Text style={styles.registrationClosedText}>
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const eventDate = new Date(event.date);
              eventDate.setHours(0, 0, 0, 0);
              if (today < eventDate) {
                return 'Registration is not open yet';
              } else {
                return 'This event is closed';
              }
            })()}
          </Text>
        </View>
      )}

      {event && event.photoUrl && (
        <View style={styles.eventPhotoContainer}>
          <Image source={{ uri: event.photoUrl }} style={styles.eventPhoto} />
          <Text style={styles.eventNameOverlay}>{event.name}</Text>
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => setEventDetailsModalVisible(true)}
          >
            <Text style={styles.viewDetailsButtonText}>View Details</Text>
          </TouchableOpacity>
          <View style={styles.bottomInfoOverlay}>
            <Text style={styles.eventLocationOverlay}>{event.location}</Text>
            <Text style={styles.eventDateOverlay}>
              {formatDateForDisplay(event.date)}
              {event.endDate && event.endDate !== event.date ? `-${formatDateForDisplay(event.endDate)}` : ''}
            </Text>
          </View>
          <View style={styles.entryFeeBadge}>
            <Text style={styles.entryFeeLabel}>Entry Fee</Text>
            <Text style={styles.entryFeeAmount}>${event.entryFee}</Text>
          </View>
        </View>
      )}

      {event && (
        <View style={styles.eventCard}>
        </View>
      )}

      {selectedPlayers.length > 0 && event?.type !== 'social' && (
        <View style={styles.sortButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    activeSort === 'all' && styles.sortButtonActive,
                    { flex: 1 },
                  ]}
                  onPress={() => setActiveSort('all')}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      activeSort === 'all' && styles.sortButtonTextActive,
                    ]}
                  >
                    All Flights
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    activeSort === 'abc' && styles.sortButtonActive,
                    { flex: 1 },
                  ]}
                  onPress={() => setActiveSort('abc')}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      activeSort === 'abc' && styles.sortButtonTextActive,
                    ]}
                  >
                    ABC
                  </Text>
                </TouchableOpacity>
        </View>
      )}

      {canViewRegistration(currentUser) && (
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[
              styles.statBox,
              paymentFilter === 'paid' && styles.statBoxActive,
            ]}
            onPress={() =>
              setPaymentFilter(paymentFilter === 'paid' ? 'all' : 'paid')
            }
          >
            <Text style={styles.statLabel}>Paid</Text>
            <Text
              style={[
                styles.statCount,
                paymentFilter === 'paid' && styles.statCountActive,
              ]}
            >
              {event?.type === 'social' 
                ? Object.values(registrations)
                    .filter((reg) => reg.paymentStatus === 'paid' && !reg.isSponsor)
                    .reduce((total, reg) => total + 1 + (reg.numberOfGuests || 0), 0)
                : Object.values(registrations).filter(
                    (reg) => reg.paymentStatus === 'paid' && !reg.isSponsor
                  ).length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.statBox,
              paymentFilter === 'unpaid' && styles.statBoxActive,
            ]}
            onPress={() =>
              setPaymentFilter(paymentFilter === 'unpaid' ? 'all' : 'unpaid')
            }
          >
            <Text style={styles.statLabel}>Unpaid</Text>
            <Text
              style={[
                styles.statCount,
                paymentFilter === 'unpaid' && styles.statCountActive,
              ]}
            >
              {event?.type === 'social' 
                ? Object.values(registrations)
                    .filter((reg) => reg.paymentStatus === 'unpaid' && !reg.isSponsor)
                    .reduce((total, reg) => total + 1 + (reg.numberOfGuests || 0), 0)
                : Object.values(registrations).filter(
                    (reg) => reg.paymentStatus === 'unpaid' && !reg.isSponsor
                  ).length}
            </Text>
          </TouchableOpacity>
          {event?.type !== 'social' && (
            <>
              <TouchableOpacity
                style={[
                  styles.statBox,
                  activeSort === 'A' && styles.statBoxActive,
                ]}
                onPress={() => setActiveSort('A')}
              >
                <Text style={styles.statLabel}>Flight A</Text>
                <Text style={styles.statCount}>{getFlightCounts.A}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statBox,
                  activeSort === 'B' && styles.statBoxActive,
                ]}
                onPress={() => setActiveSort('B')}
              >
                <Text style={styles.statLabel}>Flight B</Text>
                <Text style={styles.statCount}>{getFlightCounts.B}</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[
              styles.statBox,
              membershipFilter === 'active' && styles.statBoxActive,
              { backgroundColor: '#2E7D32' },
            ]}
            onPress={() =>
              setMembershipFilter(membershipFilter === 'active' ? 'all' : 'active')
            }
          >
            <Text style={styles.statLabel}>Active</Text>
            <Text style={styles.statCount}>
              {selectedPlayers.filter((p) => p.membershipType === 'active').length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.statBox,
              membershipFilter === 'in-active' && styles.statBoxActive,
              { backgroundColor: '#C62828' },
            ]}
            onPress={() =>
              setMembershipFilter(membershipFilter === 'in-active' ? 'all' : 'in-active')
            }
          >
            <Text style={styles.statLabel}>In-active</Text>
            <Text style={styles.statCount}>
              {selectedPlayers.filter((p) => p.membershipType === 'in-active').length}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {event && canAddPlayers(currentUser) && (
        <View style={styles.statusButtonSection}>
          <TouchableOpacity
            style={styles.addButtonInRow}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.buttonInRowText}>Add Member</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButtonInRow, { backgroundColor: '#9C27B0' }]}
            onPress={() => setAddCustomGuestModalVisible(true)}
          >
            <Text style={styles.buttonInRowText}>Add Guest</Text>
          </TouchableOpacity>
          {canRemoveAllPlayers(currentUser) && (
            <TouchableOpacity
              style={styles.removeButtonInRow}
              onPress={handleRemoveAllPlayers}
            >
              <Text style={styles.buttonInRowText}>Remove All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.playersTitleContainer}>
        <View style={styles.playersTitleRow}>
          <Text style={styles.playersTitle}>
            {event?.type === 'social' ? `ATTENDEES (${getTotalPeopleCount})` : `REGISTERED PLAYERS (${getDisplayedPlayers.length})`}
          </Text>
          {event && canViewRegistration(currentUser) && (
            <Text style={styles.totalAmount}>
              ${getTotalPaidAmount}
            </Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {event && (
          <View>
            <View style={styles.playersContainer}>
              {selectedPlayers.length === 0 ? (
                <Text style={styles.emptyText}>
                  No players registered yet.
                  {canViewRegistration(currentUser)
                    ? ' Tap "Add Player" to register.'
                    : ' Tap "Register For This Event" to join.'}
                </Text>
              ) : (
                getPlayersWithSeparators.map((item) => {
                  if (item.type === 'separator') {
                    const flightCount = getFlightCounts[item.flight] || 0;
                    return (
                      <View key={`separator-${item.flight}`} style={styles.flightSeparator}>
                        <Text style={styles.flightSeparatorText}>Flight {item.flight} ({flightCount})</Text>
                      </View>
                    );
                  }

                  const player = item.data;
                  const playerReg = registrations[player.name];
                  const isPaid = playerReg?.paymentStatus === 'paid';
                  const isSocialEvent = event?.type === 'social';
                  const guestCount = playerReg?.numberOfGuests || 0;
                  const guestNames = playerReg?.guestNames || null;

                  return (
                    <View
                      key={player.id}
                      style={styles.playerCard}
                    >
                      <TouchableOpacity
                        onPress={() => handlePlayerCardPress(player)}
                        activeOpacity={0.7}
                        style={{ zIndex: 1 }}
                      >
                      <View style={styles.topRow}>
                        <View style={styles.playerInfo}>
                          <Text style={styles.playerName}>{player.name}</Text>
                          {isSocialEvent && guestCount > 0 && (
                            <>
                              <Text style={styles.guestCountText}>
                                +{guestCount} guest{guestCount !== 1 ? 's' : ''}
                              </Text>
                              {guestNames && (
                                <Text style={styles.guestNamesText}>
                                  {guestNames}
                                </Text>
                              )}
                            </>
                          )}
                          {!isSocialEvent && (
                            <Text style={styles.flightText}>
                              Flight: {calculateTournamentFlight(player, Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, playerReg, event || undefined, useCourseHandicap, 1)}
                            </Text>
                          )}
                        </View>

                        {!isSocialEvent && (() => {
                          const isAdjusted = hasAdjustedHandicap(player, playerReg);
                          const isCourse = isUsingCourseHandicap(useCourseHandicap, event || undefined, 1);
                          const label = isAdjusted ? 'ADJH:' : isCourse ? 'CRSE:' : 'HDC:';
                          const showHighlight = isAdjusted || isCourse;
                          const backgroundColor = isAdjusted ? '#FF9500' : isCourse ? '#2196F3' : undefined;
                          
                          return (
                            <View
                              style={[
                                styles.hdcRow,
                                showHighlight && { backgroundColor },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.hdcLabel,
                                  showHighlight && (isAdjusted ? styles.hdcLabelAdjusted : styles.hdcLabelCourse),
                                ]}
                              >
                                {label}
                              </Text>
                              <View style={[
                                styles.handicapBadge,
                                isCourse && !isAdjusted && styles.handicapBadgeCourse,
                              ]}>
                                <Text
                                  style={[
                                    styles.handicapText,
                                    isAdjusted && styles.handicapTextAdjusted,
                                    isCourse && !isAdjusted && styles.handicapTextCourse,
                                  ]}
                                >
                                  {getDisplayHandicap(player, playerReg, event || undefined, useCourseHandicap, 1)}
                                </Text>
                              </View>
                              {isAdjusted && (
                                <View style={styles.trueHandicapBox}>
                                  <Text style={styles.trueHandicapText}>
                                    {player.handicap}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                      </TouchableOpacity>

                      <View style={styles.bottomRow}>
                        <View style={styles.badgesWrapper}>
                          <TouchableOpacity
                            style={[
                              styles.paymentBadge,
                              isPaid ? styles.paymentBadgePaid : styles.paymentBadgeUnpaid,
                            ]}
                            onPress={() => {
                              if (canTogglePaymentStatus(currentUser) && playerReg) {
                                handlePaymentToggle(player.name, playerReg);
                              }
                            }}
                            disabled={!canTogglePaymentStatus(currentUser) || !playerReg}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.paymentBadgeText,
                                isPaid ? styles.paymentBadgeTextPaid : styles.paymentBadgeTextUnpaid,
                              ]}
                            >
                              {isPaid ? 'Paid' : 'Unpaid'}
                            </Text>
                          </TouchableOpacity>

                          {playerReg?.isSponsor ? (
                            <View style={[styles.membershipBadge, styles.membershipBadgeSponsor]}>
                              <Text style={[styles.membershipText, styles.membershipTextSponsor]}>
                                Sponsor
                              </Text>
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.membershipBadge,
                                player.membershipType === 'active' && styles.membershipBadgeActive,
                                player.membershipType === 'in-active' && styles.membershipBadgeInactive,
                                player.membershipType === 'guest' && styles.membershipBadgeGuest,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.membershipText,
                                  player.membershipType === 'active' && styles.membershipTextActive,
                                  player.membershipType === 'in-active' && styles.membershipTextInactive,
                                  player.membershipType === 'guest' && styles.membershipTextGuest,
                                ]}
                              >
                                {player.membershipType === 'active' ? 'Active' : player.membershipType === 'in-active' ? 'In-active' : 'Guest'}
                              </Text>
                            </View>
                          )}
                        </View>

                      </View>

                      {canViewRegistration(currentUser) && (
                        <View style={styles.bottomActionsRow}>
                          <TouchableOpacity
                            style={styles.emailInvoiceButtonBottom}
                            onPress={() => handleSendPlayerInvoice(player, playerReg)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="mail-outline" size={16} color="#007AFF" />
                            <View style={[
                              styles.emailStatusDot,
                              playerReg?.emailSent ? styles.emailStatusDotSent : styles.emailStatusDotPending,
                            ]} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removePlayerButtonInline}
                            onPress={() => {
                              handleRemovePlayer(player.id);
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="close" size={12} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <EventDetailsModal
        visible={eventDetailsModalVisible}
        event={event}
        onClose={() => setEventDetailsModalVisible(false)}
        onRegister={handleRegisterCurrentUser}
        currentUserId={currentUser?.id}
        registeredPlayerIds={event?.registeredPlayers || []}
      />

      <EventPlayerModal
        visible={eventPlayerModalVisible}
        player={selectedPlayerForEvent}
        registration={selectedPlayerForEvent ? registrations[selectedPlayerForEvent.name] : null}
        tournamentFlight={
          selectedPlayerForEvent ? calculateTournamentFlight(selectedPlayerForEvent, Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, selectedPlayerForEvent ? registrations[selectedPlayerForEvent.name] : undefined) : '—'
        }
        event={event}
        onClose={async () => {
          await loadCourseHandicapSetting();
          await registrationsQuery.refetch();
          setEventPlayerModalVisible(false);
          setSelectedPlayerForEvent(null);
        }}
        onSave={handleSavePlayerChanges}
        onMembershipRenewalRequired={(member) => {
          console.log('[registration] Membership renewal required for:', member.name);
          setEventPlayerModalVisible(false);
          setSelectedPlayerForEvent(null);
          setTimeout(() => {
            setMemberForRenewal(member);
            setMembershipRenewalModalVisible(true);
            console.log('[registration] MembershipRenewalModal should now be visible');
          }, 100);
        }}
      />

      {memberForRenewal && (
        <MembershipRenewalModal
          visible={membershipRenewalModalVisible}
          member={memberForRenewal}
          onClose={async () => {
            console.log('[registration] MembershipRenewalModal closed');
            setMembershipRenewalModalVisible(false);
            setMemberForRenewal(null);
            await refreshMembers();
            await registrationsQuery.refetch();
          }}
        />
      )}

      {addCustomGuestModalVisible && (
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {
            Keyboard.dismiss();
            setAddCustomGuestModalVisible(false);
            setAddCustomGuestName('');
            setAddCustomGuestCount('');
            setAddCustomGuestNames('');
            setAddCustomGuestHandicap('');
            setAddCustomGuestIsSponsor(false);
          }}>
            <View style={styles.centeredModalWrapper}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.addGuestModal}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add Custom Guest</Text>
                    <TouchableOpacity onPress={() => {
                      Keyboard.dismiss();
                      setAddCustomGuestModalVisible(false);
                      setAddCustomGuestName('');
                      setAddCustomGuestCount('');
                      setAddCustomGuestNames('');
                      setAddCustomGuestHandicap('');
                      setAddCustomGuestIsSponsor(false);
                    }}>
                      <Ionicons name="close" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    style={styles.modalContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Guest Name</Text>
                      <TextInput
                        style={styles.textInput}
                        value={addCustomGuestName}
                        onChangeText={setAddCustomGuestName}
                        placeholder="Enter guest name"
                        autoCapitalize="words"
                      />
                    </View>

                    {event?.type === 'tournament' ? (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Handicap</Text>
                        <TextInput
                          style={styles.textInput}
                          value={addCustomGuestHandicap}
                          onChangeText={setAddCustomGuestHandicap}
                          placeholder="Enter handicap"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    ) : (
                      <>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Number of Additional Guests</Text>
                          <TextInput
                            style={styles.textInput}
                            value={addCustomGuestCount}
                            onChangeText={setAddCustomGuestCount}
                            placeholder="0"
                            keyboardType="number-pad"
                          />
                        </View>

                        {parseInt(addCustomGuestCount, 10) > 0 && (
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                              Guest Name{parseInt(addCustomGuestCount, 10) > 1 ? 's' : ''}
                            </Text>
                            <TextInput
                              style={[styles.textInput, styles.textInputMultiline]}
                              value={addCustomGuestNames}
                              onChangeText={setAddCustomGuestNames}
                              placeholder={parseInt(addCustomGuestCount, 10) > 1 ? "Enter guest names (one per line)" : "Enter guest name"}
                              multiline
                              numberOfLines={Math.min(parseInt(addCustomGuestCount, 10) || 1, 4)}
                            />
                          </View>
                        )}
                      </>
                    )}

                    <TouchableOpacity
                      style={styles.sponsorToggleRow}
                      onPress={() => setAddCustomGuestIsSponsor(!addCustomGuestIsSponsor)}
                    >
                      <View style={[styles.sponsorCheckbox, addCustomGuestIsSponsor && styles.sponsorCheckboxActive]}>
                        {addCustomGuestIsSponsor && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                      <Text style={styles.sponsorLabel}>Sponsor</Text>
                    </TouchableOpacity>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.bulkAddButton, { backgroundColor: '#9C27B0' }]}
                      onPress={handleAddCustomGuest}
                    >
                      <Ionicons name="add-circle" size={18} color="#fff" />
                      <Text style={styles.bulkAddButtonText}>Add Guest</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}

      {modalVisible && (
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {
            setModalVisible(false);
            setSelectedForBulkAdd(new Set());
            setPlayerGuestCounts({});
            setPlayerGuestNames({});
            setPlayerSponsorFlags({});
          }}>
            <View style={styles.centeredModalWrapper}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.addPlayerModalContainer}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      Select Players ({members.filter((m) => !selectedPlayers.find((p) => p.id === m.id) && !(m.membershipType === 'guest' && m.id.startsWith('guest_'))).length})
                    </Text>
                    <TouchableOpacity onPress={() => {
                      setModalVisible(false);
                      setSelectedForBulkAdd(new Set());
                      setPlayerGuestCounts({});
                      setPlayerGuestNames({});
                      setPlayerSponsorFlags({});
                    }}>
                      <Ionicons name="close" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                  </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {Array.from(new Set(members.map(m => m.id)))
                .map(id => members.find(m => m.id === id))
                .filter((m): m is Member => m !== undefined)
                .filter((m) => !selectedPlayers.find((p) => p.id === m.id) && !(m.membershipType === 'guest' && m.id.startsWith('guest_')))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((member) => (
                  <View key={`member-${member.id}`}>
                    <TouchableOpacity
                      style={styles.memberCard}
                      onPress={() => {
                        const newSelected = new Set(selectedForBulkAdd);
                        if (newSelected.has(member.id)) {
                          newSelected.delete(member.id);
                        } else {
                          newSelected.add(member.id);
                        }
                        setSelectedForBulkAdd(newSelected);
                      }}
                    >
                      <View style={styles.checkboxContainer}>
                        <View style={[styles.checkbox, selectedForBulkAdd.has(member.id) && styles.checkboxSelected]}>
                          {selectedForBulkAdd.has(member.id) && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.name}</Text>
                      </View>
                      <View
                        style={styles.handicapBadge}
                      >
                        <Text
                          style={styles.handicapText}
                        >
                          {member.handicap ?? 0}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {selectedForBulkAdd.has(member.id) && (
                      <>
                        {event?.type === 'social' && (
                          <>
                            <View style={styles.guestCountInputContainer}>
                              <Text style={styles.guestCountLabel}>Number of Guests:</Text>
                              <TextInput
                                style={styles.guestCountInput}
                                value={playerGuestCounts[member.id] || ''}
                                onChangeText={(text) => {
                                  setPlayerGuestCounts({
                                    ...playerGuestCounts,
                                    [member.id]: text,
                                  });
                                }}
                                keyboardType="number-pad"
                                placeholder="0"
                              />
                            </View>

                            {parseInt(playerGuestCounts[member.id], 10) > 0 && (
                              <View style={styles.guestCountInputContainer}>
                                <Text style={styles.guestCountLabel}>
                                  Guest Name{parseInt(playerGuestCounts[member.id], 10) > 1 ? 's' : ''}:
                                </Text>
                                <TextInput
                                  style={[styles.guestCountInput, styles.textInputMultiline]}
                                  value={playerGuestNames[member.id] || ''}
                                  onChangeText={(text) => {
                                    setPlayerGuestNames({
                                      ...playerGuestNames,
                                      [member.id]: text,
                                    });
                                  }}
                                  placeholder={parseInt(playerGuestCounts[member.id], 10) > 1 ? "Enter guest names (one per line)" : "Enter guest name"}
                                  multiline
                                  numberOfLines={Math.min(parseInt(playerGuestCounts[member.id], 10) || 1, 4)}
                                />
                              </View>
                            )}
                          </>
                        )}
                        
                        <TouchableOpacity
                          style={styles.sponsorToggleRow}
                          onPress={() => {
                            setPlayerSponsorFlags({
                              ...playerSponsorFlags,
                              [member.id]: !playerSponsorFlags[member.id],
                            });
                          }}
                        >
                          <View style={[styles.sponsorCheckbox, playerSponsorFlags[member.id] && styles.sponsorCheckboxActive]}>
                            {playerSponsorFlags[member.id] && (
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            )}
                          </View>
                          <Text style={styles.sponsorLabel}>Sponsor</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.bulkAddButton,
                  selectedForBulkAdd.size === 0 && styles.bulkAddButtonDisabled,
                ]}
                onPress={handleBulkAddPlayers}
                disabled={selectedForBulkAdd.size === 0}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.bulkAddButtonText}>
                  Add {selectedForBulkAdd.size > 0 ? `(${selectedForBulkAdd.size})` : ''} Players
                </Text>
              </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}

      <ZelleInvoiceModal
        visible={zelleInvoiceModalVisible}
        event={event}
        currentUser={currentUser}
        onClose={() => setZelleInvoiceModalVisible(false)}
        onRegister={handleZelleRegistration}
      />

      <PayPalInvoiceModal
        visible={paypalInvoiceModalVisible}
        event={event}
        currentUser={currentUser}
        onClose={() => setPaypalInvoiceModalVisible(false)}
        onRegister={handleZelleRegistration}
      />

      {pdfOptionsModalVisible && (
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModal}>
            <View style={styles.pdfModalHeader}>
              <Text style={styles.pdfModalTitle}>Generate List</Text>
              <TouchableOpacity onPress={() => setPdfOptionsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.pdfModalContent}>
              <TouchableOpacity
                style={styles.pdfOptionButton}
                onPress={() => {
                  setSelectedPdfOption('checkin');
                  setPdfOptionsModalVisible(false);
                  setHandicapConfirmModalVisible(true);
                }}
              >
                <Ionicons name="checkbox-outline" size={24} color="#1B5E20" />
                <View style={styles.pdfOptionTextContainer}>
                  <Text style={styles.pdfOptionButtonText}>Check In</Text>
                  <Text style={styles.pdfOptionDescription}>Full list sorted by paid/unpaid</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pdfOptionButton}
                onPress={() => {
                  setSelectedPdfOption('weelist');
                  setPdfOptionsModalVisible(false);
                  setHandicapConfirmModalVisible(true);
                }}
              >
                <Ionicons name="list-outline" size={24} color="#1976D2" />
                <View style={styles.pdfOptionTextContainer}>
                  <Text style={styles.pdfOptionButtonText}>Web List</Text>
                  <Text style={styles.pdfOptionDescription}>2.5&quot; wide single column for website</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pdfOptionButton}
                onPress={() => {
                  setSelectedPdfOption('text');
                  setPdfOptionsModalVisible(false);
                  setHandicapConfirmModalVisible(true);
                }}
              >
                <Ionicons name="text-outline" size={24} color="#9C27B0" />
                <View style={styles.pdfOptionTextContainer}>
                  <Text style={styles.pdfOptionButtonText}>Text</Text>
                  <Text style={styles.pdfOptionDescription}>Plain text listing</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {handicapConfirmModalVisible && (
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModal}>
            <View style={styles.pdfModalHeader}>
              <Text style={styles.pdfModalTitle}>Include Handicaps?</Text>
              <TouchableOpacity onPress={() => {
                setHandicapConfirmModalVisible(false);
                setSelectedPdfOption(null);
              }}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.pdfModalContent}>
              <TouchableOpacity
                style={[styles.handicapChoiceButton, { backgroundColor: '#1B5E20' }]}
                onPress={() => handleGenerateList(true)}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                )}
                <Text style={styles.handicapChoiceButtonText}>Yes, Include Handicaps</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.handicapChoiceButton, { backgroundColor: '#666' }]}
                onPress={() => handleGenerateList(false)}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="close-circle" size={24} color="#fff" />
                )}
                <Text style={styles.handicapChoiceButtonText}>No, Names Only</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {textResultModalVisible && (
        <View style={styles.pdfModalOverlay}>
          <View style={styles.textResultModal}>
            <View style={styles.pdfModalHeader}>
              <Text style={styles.pdfModalTitle}>Player List</Text>
              <TouchableOpacity onPress={() => {
                setTextResultModalVisible(false);
                setTextResultContent('');
              }}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.textResultContent} showsVerticalScrollIndicator={true}>
              <Text style={styles.textResultText}>{textResultContent}</Text>
            </ScrollView>

            <View style={styles.textResultFooter}>
              <View style={styles.footerButtonsRow}>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyTextToClipboard}
                >
                  <Ionicons name="copy-outline" size={20} color="#fff" />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveTextAsPdf}
                >
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.emailButton}
                  onPress={handleEmailTextList}
                >
                  <Ionicons name="mail-outline" size={20} color="#fff" />
                  <Text style={styles.emailButtonText}>Email</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {htmlViewerVisible && (() => {
        let data: any = {};
        try {
          data = JSON.parse(htmlViewerContent);
        } catch (e) {
          console.error('Failed to parse HTML content:', e);
        }
        
        const eventName = event?.name || 'Event';
        const eventDate = event?.date ? formatDateForDisplay(event.date) : '';
        
        return (
          <View style={styles.htmlViewerOverlay}>
            <View style={styles.htmlViewerModal}>
              <View style={styles.htmlViewerHeader}>
                <Text style={styles.htmlViewerTitle}>{htmlViewerTitle}</Text>
                <TouchableOpacity onPress={() => {
                  setHtmlViewerVisible(false);
                  setHtmlViewerContent('');
                }}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.htmlViewerContent} showsVerticalScrollIndicator={true}>
                <View style={styles.htmlEventHeader}>
                  <Text style={styles.htmlEventName}>{eventName}</Text>
                  <Text style={styles.htmlEventDate}>{eventDate}</Text>
                </View>
                
                {data.type === 'checkin' && (
                  <>
                    <View style={styles.htmlSectionHeader}>
                      <View style={[styles.htmlSectionBadge, { backgroundColor: '#E8F5E9' }]}>
                        <Ionicons name="checkmark-circle" size={16} color="#1B5E20" />
                        <Text style={[styles.htmlSectionTitle, { color: '#1B5E20' }]}>PAID ({data.paid?.length || 0})</Text>
                      </View>
                    </View>
                    {data.paid?.map((player: any) => (
                      <View key={`paid-${player.index}`} style={styles.htmlPlayerRow}>
                        <Text style={styles.htmlPlayerIndex}>{player.index}.</Text>
                        <Text style={styles.htmlPlayerName}>{player.name}</Text>
                        {data.includeHandicaps && (
                          <View style={styles.htmlHandicapBadge}>
                            <Text style={styles.htmlHandicapText}>{player.handicap}</Text>
                          </View>
                        )}
                        <View style={styles.htmlCheckbox}>
                          <Text style={styles.htmlCheckboxText}>☐</Text>
                        </View>
                      </View>
                    ))}
                    
                    <View style={[styles.htmlSectionHeader, { marginTop: 16 }]}>
                      <View style={[styles.htmlSectionBadge, { backgroundColor: '#FFEBEE' }]}>
                        <Ionicons name="close-circle" size={16} color="#C62828" />
                        <Text style={[styles.htmlSectionTitle, { color: '#C62828' }]}>UNPAID ({data.unpaid?.length || 0})</Text>
                      </View>
                    </View>
                    {data.unpaid?.map((player: any) => (
                      <View key={`unpaid-${player.index}`} style={styles.htmlPlayerRow}>
                        <Text style={styles.htmlPlayerIndex}>{player.index}.</Text>
                        <Text style={styles.htmlPlayerName}>{player.name}</Text>
                        {data.includeHandicaps && (
                          <View style={styles.htmlHandicapBadge}>
                            <Text style={styles.htmlHandicapText}>{player.handicap}</Text>
                          </View>
                        )}
                        <View style={styles.htmlCheckbox}>
                          <Text style={styles.htmlCheckboxText}>☐</Text>
                        </View>
                      </View>
                    ))}
                    
                    <View style={styles.htmlTotalRow}>
                      <Text style={styles.htmlTotalText}>Total: {(data.paid?.length || 0) + (data.unpaid?.length || 0)} players</Text>
                    </View>
                  </>
                )}
                
                {data.type === 'weelist' && (
                  <>
                    <View style={styles.htmlWeeListContainer}>
                      {data.players?.map((player: any) => (
                        <View key={`wee-${player.index}`} style={styles.htmlWeeListItem}>
                          <Text style={styles.htmlWeeListText}>
                            {player.index}. {player.name}{data.includeHandicaps ? ` (${player.handicap})` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.htmlTotalRow}>
                      <Text style={styles.htmlTotalText}>Total: {data.players?.length || 0} players</Text>
                    </View>
                  </>
                )}
              </ScrollView>
              
              <View style={styles.htmlViewerFooter}>
                <View style={styles.footerButtonsRow}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveHtmlAsPdf}
                  >
                    <Ionicons name="share-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.emailButton}
                    onPress={handleEmailHtmlList}
                  >
                    <Ionicons name="mail-outline" size={20} color="#fff" />
                    <Text style={styles.emailButtonText}>Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        );
      })()}

      {paymentMethodModalVisible && (
        <View style={styles.paymentModalOverlay}>
          <View style={styles.paymentModal}>
            <View style={styles.paymentModalHeader}>
              <Text style={styles.paymentModalTitle}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setPaymentMethodModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentModalContent}>
              <TouchableOpacity
                style={styles.paymentMethodButton}
                onPress={() => handlePaymentMethodSelected('zelle')}
              >
                <Text style={styles.paymentMethodButtonText}>Zelle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paymentMethodButton}
                onPress={() => handlePaymentMethodSelected('paypal')}
              >
                <Text style={styles.paymentMethodButtonText}>PayPal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.registerButton,
          (isCurrentUserRegistered() || !event?.registrationOpen) && styles.registerButtonInactive,
        ]}
        onPress={handleRegisterCurrentUser}
        disabled={isCurrentUserRegistered() || !event?.registrationOpen}
      >
        <Text style={[
          styles.registerButtonText,
          (isCurrentUserRegistered() || !event?.registrationOpen) && styles.registerButtonTextInactive,
        ]}>
          {isCurrentUserRegistered() 
            ? "You're Registered For This Event" 
            : !event?.registrationOpen
              ? 'Registration Closed'
              : 'Register For This Event'}
        </Text>
      </TouchableOpacity>
      </SafeAreaView>
      <EventFooter 
        showStartButton={!!event && canStartEvent(currentUser)}
        eventStatus={(event?.status as EventStatus) || 'upcoming'}
        onStatusChange={async (newStatus) => {
          if (event) {
            await updateEventMutation.mutateAsync({
              eventId: event.id,
              updates: { status: newStatus },
            });
            setEvent({ ...event, status: newStatus });
            
            if (newStatus === 'complete') {
              
              const numberOfDays = event.numberOfDays || 1;
              const allRegs = registrationsQuery.data || [];
              const allScores = scoresQuery.data || [];
              
              for (const reg of allRegs) {
                if (!reg.memberId) continue;
                
                const member = allMembers.find((m: Member) => m.id === reg.memberId);
                if (!member) continue;
                
                const playerScores = allScores.filter((s: any) => s.memberId === reg.memberId);
                
                let totalGrossScore = 0;
                let totalPar = 0;
                let completedDays = 0;
                
                for (let day = 1; day <= numberOfDays; day++) {
                  const dayScore = playerScores.find((s: any) => s.day === day);
                  if (dayScore) {
                    totalGrossScore += dayScore.totalScore || 0;
                    completedDays++;
                    
                    const parKey = `day${day}Par` as keyof typeof event;
                    const dayPar = event[parKey];
                    if (dayPar) {
                      totalPar += parseInt(dayPar as string, 10);
                    }
                  }
                }
                
                if (totalGrossScore > 0 && completedDays === numberOfDays && totalPar > 0) {
                  const tournamentHandicap = calculateTournamentHandicap(totalGrossScore, totalPar, numberOfDays);
                  
                  const newRecord = {
                    eventId: event.id,
                    eventName: event.name,
                    score: totalGrossScore,
                    par: totalPar,
                    handicap: tournamentHandicap,
                    date: event.date,
                  };
                  
                  const existingRecords = member.tournamentHandicaps || [];
                  const updatedRecords = addTournamentHandicapRecord(existingRecords, newRecord);
                  
                  try {
                    await updateMemberMutation.mutateAsync({
                      memberId: member.id,
                      updates: { tournamentHandicaps: updatedRecords },
                    });
                  } catch (error) {
                    console.error(`[Registration] Failed to update tournament handicap for ${member.name}:`, error);
                  }
                }
              }
            }
          }
        }}
        isAdmin={currentUser?.isAdmin || false}
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 6.75,
    gap: 10,
  },
  headerButtonsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  headerActionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFD54F',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  headerActionButtonOpen: {
    backgroundColor: '#FFD54F',
  },
  headerActionButtonClosed: {
    backgroundColor: '#FFD54F',
  },
  headerActionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#333',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  refreshing: {
    opacity: 0.5,
  },
  registrationToggleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 10,
  },
  registrationToggleLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
  },
  registrationToggleButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  registrationToggleOpen: {
    backgroundColor: '#2E7D32',
  },
  registrationToggleClosed: {
    backgroundColor: '#C62828',
  },
  registrationToggleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  registrationClosedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFEBEE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
  },
  registrationClosedText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#C62828',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
  },
  statusButtonSection: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addButtonInRow: {
    flex: 1,
    backgroundColor: '#1B5E20',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonInRow: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInRowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  eventStatusButtonWrapper: {
    flex: 1,
  },
  addButtonAbsolute: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  removeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  removeAllButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
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
  viewDetailsButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  viewDetailsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  entryFeeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
    zIndex: 10,
  },
  entryFeeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
  },
  entryFeeAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
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
  eventCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderBottomWidth: 0,
    borderBottomColor: '#f0f0f0',
    height: 0,
  },
  cardRow2: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  eventLocation: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  eventDate: {
    fontSize: 12,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 2,
    gap: 6,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statBoxActive: {
    backgroundColor: '#1e40af',
    elevation: 4,
    shadowOpacity: 0.15,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 1,
    opacity: 0.9,
    textAlign: 'center',
  },
  statCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  statCountActive: {
    color: '#fff',
  },
  playersContainer: {
    padding: 16,
  },
  playersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  playerCard: {
    flexDirection: 'column',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#666666',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
    zIndex: 1,
  },
  playerInfo: {
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  badgesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
    flex: 1,
  },

  badgesColumn: {
    gap: 4,
    alignItems: 'flex-end',
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  flightText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  guestCountText: {
    fontSize: 12,
    color: '#9C27B0',
    marginTop: 2,
    fontWeight: '600',
  },
  guestNamesText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic' as const,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
    paddingTop: 10,
  },
  hdcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hdcRowAdjusted: {
    backgroundColor: '#FF9500',
  },
  hdcRowCourse: {
    backgroundColor: '#2196F3',
  },
  hdcLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  hdcLabelAdjusted: {
    color: '#000',
  },
  hdcLabelCourse: {
    color: '#fff',
  },
  membershipBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  membershipBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  membershipBadgeInactive: {
    backgroundColor: '#FFEBEE',
  },
  membershipBadgeGuest: {
    backgroundColor: '#F3E5F5',
  },
  membershipBadgeSponsor: {
    backgroundColor: '#FFF3E0',
  },
  membershipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  membershipTextActive: {
    color: '#2E7D32',
  },
  membershipTextInactive: {
    color: '#C62828',
  },
  membershipTextGuest: {
    color: '#6A1B9A',
  },
  membershipTextSponsor: {
    color: '#FF9500',
  },
  flightSeparator: {
    backgroundColor: '#9E9E9E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  flightSeparatorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  handicapBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  handicapText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  handicapTextAdjusted: {
    color: '#000',
  },
  handicapBadgeCourse: {
    backgroundColor: '#1976D2',
  },
  handicapTextCourse: {
    color: '#fff',
  },
  trueHandicapBox: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 4,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trueHandicapText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sortButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 8,
    marginTop: -1,
    backgroundColor: '#fff',
  },
  playersTitleContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  playersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
  },
  cardButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B5E20',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  removeButton: {
    backgroundColor: '#EF4444',
  },
  cardButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    zIndex: 10,
    elevation: 10,
  },
  paymentBadgePaid: {
    backgroundColor: '#1B5E20',
    borderWidth: 1,
    borderColor: '#1B5E20',
  },
  paymentBadgeUnpaid: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentBadgeTextPaid: {
    color: '#fff',
  },
  paymentBadgeTextUnpaid: {
    color: '#FF3B30',
  },
  removePlayerButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 50,
  },
  bottomActionsRow: {
    position: 'absolute' as const,
    bottom: 8,
    right: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    zIndex: 50,
    elevation: 50,
  },
  emailInvoiceButtonBottom: {
    position: 'relative' as const,
    width: 28,
    height: 28,
    backgroundColor: '#E3F2FD',
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  removePlayerButtonInline: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emailInvoiceButton: {
    position: 'relative' as const,
    padding: 8,
    marginLeft: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emailStatusDot: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  emailStatusDotPending: {
    backgroundColor: '#FF3B30',
  },
  emailStatusDotSent: {
    backgroundColor: '#34C759',
  },
  sortButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  sortButtonActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1976D2',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    paddingVertical: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredModalWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  addGuestModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  addPlayerModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalOverlayInner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    maxHeight: 400,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  bulkAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  bulkAddButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  bulkAddButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  registerButton: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  registerButtonTextInactive: {
    color: '#666',
  },
  registerButtonInactive: {
    backgroundColor: '#FFF9C4',
    opacity: 1,
  },
  guestCountInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3E5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  guestCountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6A1B9A',
    marginBottom: 4,
  },
  guestCountInput: {
    borderWidth: 1,
    borderColor: '#9C27B0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  sponsorToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF3E0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  sponsorCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  sponsorCheckboxActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  sponsorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
  },
  paymentModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  paymentModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  paymentModalContent: {
    padding: 20,
    gap: 12,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    backgroundColor: '#1B5E20',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 8,
  },
  paymentMethodButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  pdfModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pdfModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pdfModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pdfModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  pdfModalContent: {
    padding: 16,
    gap: 12,
  },
  pdfOptionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pdfOptionTextContainer: {
    flex: 1,
  },
  pdfOptionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  pdfOptionDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  handicapChoiceButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  handicapChoiceButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  textResultModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 450,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  textResultContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 400,
  },
  textResultText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
    lineHeight: 22,
  },
  textResultFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center',
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  htmlViewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  htmlViewerModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '92%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  htmlViewerHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#1B5E20',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  htmlViewerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  htmlViewerContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  htmlEventHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  htmlEventName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1B5E20',
    textAlign: 'center',
  },
  htmlEventDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  htmlSectionHeader: {
    marginBottom: 8,
  },
  htmlSectionBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  htmlSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  htmlPlayerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    marginBottom: 2,
    borderRadius: 6,
  },
  htmlPlayerIndex: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#999',
    width: 28,
  },
  htmlPlayerName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1a1a1a',
    flex: 1,
  },
  htmlHandicapBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  htmlHandicapText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1976D2',
  },
  htmlCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  htmlCheckboxText: {
    fontSize: 16,
    color: '#ccc',
  },
  htmlTotalRow: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  htmlTotalText: {
    fontSize: 12,
    color: '#999',
  },
  htmlWeeListContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  htmlWeeListItem: {
    width: '50%',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  htmlWeeListText: {
    fontSize: 12,
    color: '#333',
  },
  footerButtonsRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  emailButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  htmlViewerFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});
