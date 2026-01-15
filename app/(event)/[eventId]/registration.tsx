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
} from 'react-native';
import { Alert } from '@/utils/alertPolyfill';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabaseService } from '@/utils/supabaseService';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useSettings } from '@/contexts/SettingsContext';
import { formatDateForDisplay } from '@/utils/dateUtils';

import { registrationCache } from '@/utils/registrationCache';
import { generateRegistrationPDF, generateRegistrationText, generateCheckInPDF, generateInvoicePDF } from '@/utils/pdfGenerator';
import * as Clipboard from 'expo-clipboard';
import { Member, Event } from '@/types';
import { EventPlayerModal } from '@/components/EventPlayerModal';
import { ZelleInvoiceModal } from '@/components/ZelleInvoiceModal';
import { PayPalInvoiceModal } from '@/components/PayPalInvoiceModal';
import { MembershipRenewalModal } from '@/components/MembershipRenewalModal';
import { EventDetailsModal } from '@/components/EventDetailsModal';
import { EventStatus } from '@/components/EventStatusButton';
import { calculateTournamentHandicap, addTournamentHandicapRecord } from '@/utils/tournamentHandicapHelper';
import { EventFooter } from '@/components/EventFooter';
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [outputFormatModalVisible, setOutputFormatModalVisible] = useState(false);
  const [textPreviewModalVisible, setTextPreviewModalVisible] = useState(false);
  const [generatedTextContent, setGeneratedTextContent] = useState<string>('');
  const [includeHandicapForPDF, setIncludeHandicapForPDF] = useState<boolean>(false);
  const [generatingInvoiceForPlayer, setGeneratingInvoiceForPlayer] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [membershipRenewalModalVisible, setMembershipRenewalModalVisible] = useState(false);
  const [memberForRenewal, setMemberForRenewal] = useState<Member | null>(null);

  const queryClient = useQueryClient();

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
  });

  const registrationsQuery = useQuery({
    queryKey: ['registrations', eventId],
    queryFn: async () => {
      try {
        const data = await supabaseService.registrations.getAll(eventId!);
        return data;
      } catch (error) {
        console.error('[registration] ❌ Error fetching registrations:', error);
        throw error;
      }
    },
    enabled: !!eventId && !!eventQuery.data,
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
    if (!eventQuery.data || isProcessingRef.current) {
      return;
    }
    
    const foundEvent = eventQuery.data;
    const regs = registrationsQuery.data || [];
    
    const dataKey = `${foundEvent.id}-${regs.length}-${regs.map(r => r.id).join(',')}`;
    if (dataKey === lastProcessedKeyRef.current) {
      return;
    }
    
    if (!isMountedRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    lastProcessedKeyRef.current = dataKey;
    
    console.log('[registration] Processing data, regs count:', regs.length);
    
    setEvent(foundEvent);
    
    if (foundEvent.type === 'social') {
      setActiveSort('abc');
    }
    
    if (registrationsQuery.data) {
      registrationCache.cacheRegistrations(foundEvent.id, regs).catch(err => {
        console.error('[registration] Cache error:', err);
      });
      
      const { registered, regMap } = processRegistrations(regs, allMembers);
      setSelectedPlayers(registered);
      setRegistrations(regMap);
    }
    
    setTimeout(() => {
      if (isMountedRef.current) {
        isProcessingRef.current = false;
      }
    }, 100);
  }, [eventQuery.data, registrationsQuery.data, allMembers, processRegistrations]);

  useEffect(() => {
    setMembers(allMembers);
  }, [allMembers]);

  useEffect(() => {
    if (eventDetailsModalVisible) {
      refreshEventData();
    }
  }, [eventDetailsModalVisible]);

  useEffect(() => {
    const loadCourseHandicapSetting = async () => {
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
    };
    loadCourseHandicapSetting();
  }, [eventId]);

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
  const isCurrentUserRegistered = () => {
    if (!currentUser) return false;
    return selectedPlayers.some((p) => p.id === currentUser.id && p.pin === currentUser.pin);
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

  const handleGeneratePDF = async () => {
    if (!event || !currentUser?.isAdmin) {
      return;
    }

    if (event.type === 'tournament') {
      Alert.alert(
        'Include Handicap?',
        'Would you like to include handicap in the list?',
        [
          {
            text: 'No',
            onPress: () => {
              setIncludeHandicapForPDF(false);
              setOutputFormatModalVisible(true);
            },
          },
          {
            text: 'Yes',
            onPress: () => {
              setIncludeHandicapForPDF(true);
              setOutputFormatModalVisible(true);
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      setIncludeHandicapForPDF(false);
      setOutputFormatModalVisible(true);
    }
  };

  const handleOutputFormatSelected = async (format: 'pdf' | 'text' | 'checkin') => {
    console.log('[registration] 🎯 handleOutputFormatSelected called with format:', format);
    setOutputFormatModalVisible(false);
    const regs = registrationsQuery.data || [];
    console.log('[registration] 📊 Registrations count:', regs.length);
    console.log('[registration] 👥 Members count:', allMembers.length);

    if (format === 'checkin') {
      setIsGeneratingPDF(true);
      try {
        console.log('[registration] 🚀 Starting check-in PDF generation...');
        if (event) {
          await generateCheckInPDF({
            registrations: regs,
            members: allMembers,
            event,
          }, orgInfo.logoUrl);
          console.log('[registration] ✅ Check-in PDF generated successfully');
        } else {
          console.log('[registration] ❌ No event found');
          Alert.alert('Error', 'Event not found');
        }
      } catch (error) {
        console.error('[registration] ❌ Check-in PDF generation error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        Alert.alert('Error', `Failed to generate check-in PDF: ${errorMsg}`);
      } finally {
        setIsGeneratingPDF(false);
      }
    } else if (format === 'pdf') {
      setIsGeneratingPDF(true);
      try {
        console.log('[registration] 🚀 Starting registration PDF generation...');
        if (event) {
          await generateRegistrationPDF(
            {
              registrations: regs,
              members: allMembers,
              event,
            },
            includeHandicapForPDF
          );
          console.log('[registration] ✅ Registration PDF generated successfully');
        } else {
          console.log('[registration] ❌ No event found');
          Alert.alert('Error', 'Event not found');
        }
      } catch (error) {
        console.error('[registration] ❌ PDF generation error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        Alert.alert('Error', `Failed to generate PDF: ${errorMsg}`);
      } finally {
        setIsGeneratingPDF(false);
      }
    } else {
      setIsGeneratingPDF(true);
      try {
        console.log('[registration] 🚀 Starting text generation...');
        if (event) {
          const textContent = await generateRegistrationText(
            {
              registrations: regs,
              members: allMembers,
              event,
            },
            includeHandicapForPDF
          );
          setGeneratedTextContent(textContent);
          console.log('[registration] ✅ Text generated successfully');
        } else {
          console.log('[registration] ❌ No event found');
          Alert.alert('Error', 'Event not found');
        }
        setTextPreviewModalVisible(true);
      } catch (error) {
        console.error('[registration] ❌ Text generation error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        Alert.alert('Error', `Failed to generate text: ${errorMsg}`);
      } finally {
        setIsGeneratingPDF(false);
      }
    }
  };

  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(generatedTextContent);
      Alert.alert('Success', 'Text copied to clipboard!');
      setTextPreviewModalVisible(false);
    } catch (error) {
      console.error('[registration] ❌ Copy error:', error);
      Alert.alert('Error', 'Failed to copy text to clipboard.');
    }
  };

  const handleEmailInvoice = async (player: Member, playerReg: any) => {
    if (!currentUser?.isAdmin) {
      return;
    }
    
    console.log('[registration] 📧 Starting invoice generation for:', player.name);
    setGeneratingInvoiceForPlayer(player.id);
    
    if (!event) {
      console.error('[registration] ❌ No event found');
      Alert.alert('Error', 'Event not found');
      setGeneratingInvoiceForPlayer(null);
      return;
    }

    const shouldOpenEmail = !!player.email;
    
    console.log('[registration] 📧 Player email:', player.email);
    console.log('[registration] 📧 Should open email:', shouldOpenEmail);
    
    if (!shouldOpenEmail) {
      Alert.alert(
        'No Email Address', 
        `${player.name} does not have an email address on file. The invoice PDF will be created and you can share it manually.`,
        [{ text: 'OK' }]
      );
    }

    console.log('[registration] 📧 Calling generateInvoicePDF...');
    const result = await generateInvoicePDF(
      {
        registration: playerReg,
        member: player,
        event,
        orgInfo,
      },
      shouldOpenEmail
    );
    console.log('[registration] ✅ generateInvoicePDF completed, result:', result);
    
    if (result.status === 'failed') {
      console.error('[registration] ❌ Invoice generation failed:', result.error);
      Alert.alert('Error', result.error || 'Failed to open email');
      setGeneratingInvoiceForPlayer(null);
      return;
    }
    
    if (result.status === 'cancelled') {
      console.log('[registration] ⚠️ Email was cancelled by user');
      setGeneratingInvoiceForPlayer(null);
      return;
    }
    
    if ((result.status === 'sent' || result.status === 'saved' || result.status === 'pdf_shared') && playerReg?.id) {
      console.log('[registration] 📧 Updating emailSent flag for registration:', playerReg.id);
      try {
        await updateRegistrationMutation.mutateAsync({
          registrationId: playerReg.id,
          updates: { emailSent: true },
        });
        console.log('[registration] ✅ emailSent flag updated successfully');
      } catch (updateError) {
        console.error('[registration] ⚠️ Failed to update emailSent flag:', updateError);
      }
    }

    console.log('[registration] ✅ Invoice generation process completed successfully');
    setGeneratingInvoiceForPlayer(null);
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

  if (eventQuery.isLoading || registrationsQuery.isLoading) {
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleManualRefresh}
          disabled={isRefreshing}
        >
          <Ionicons 
            name={isRefreshing ? "hourglass-outline" : "refresh-outline"} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>REGISTRATION</Text>
        </View>
        {currentUser?.isAdmin && event && selectedPlayers.length > 0 ? (
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={handleGeneratePDF}
            disabled={isGeneratingPDF}
          >
            <Ionicons 
              name={isGeneratingPDF ? "hourglass-outline" : "document-text-outline"} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.pdfButtonText}>PDF</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pdfButton} />
        )}
      </View>

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
                        
                        {currentUser?.isAdmin && playerReg && (
                          <View style={styles.emailButtonContainer}>
                            <View style={[
                              styles.emailNotificationDot,
                              playerReg.emailSent && styles.emailSentDot,
                            ]} />
                            <TouchableOpacity
                              style={styles.emailInvoiceButton}
                              onPress={() => handleEmailInvoice(player, playerReg)}
                              disabled={generatingInvoiceForPlayer === player.id}
                              activeOpacity={0.7}
                            >
                              {generatingInvoiceForPlayer === player.id ? (
                                <ActivityIndicator size="small" color="#007AFF" />
                              ) : (
                                <Ionicons 
                                  name="mail-outline" 
                                  size={18} 
                                  color="#007AFF" 
                                />
                              )}
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {canViewRegistration(currentUser) && (
                        <TouchableOpacity
                          style={styles.removePlayerButton}
                          onPress={() => {
                            handleRemovePlayer(player.id);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close" size={12} color="#fff" />
                        </TouchableOpacity>
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

      {outputFormatModalVisible && (
        <View style={styles.paymentModalOverlay}>
          <View style={styles.paymentModal}>
            <View style={styles.paymentModalHeader}>
              <Text style={styles.paymentModalTitle}>Select Output Format</Text>
              <TouchableOpacity onPress={() => setOutputFormatModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentModalContent}>
              <TouchableOpacity
                style={[styles.paymentMethodButton, { backgroundColor: '#FF9500' }]}
                onPress={() => handleOutputFormatSelected('checkin')}
              >
                <Ionicons name="checkbox-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.paymentMethodButtonText}>Check-In PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.paymentMethodButton}
                onPress={() => handleOutputFormatSelected('pdf')}
              >
                <Ionicons name="document-text-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.paymentMethodButtonText}>Registration PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentMethodButton, { backgroundColor: '#2196F3' }]}
                onPress={() => handleOutputFormatSelected('text')}
              >
                <Ionicons name="text-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.paymentMethodButtonText}>Text</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {isGeneratingPDF && (
        <View style={styles.pdfLoadingOverlay}>
          <View style={styles.pdfLoadingBox}>
            <ActivityIndicator size="large" color="#1B5E20" />
            <Text style={styles.pdfLoadingText}>Generating PDF...</Text>
          </View>
        </View>
      )}

      {textPreviewModalVisible && (
        <View style={styles.htmlModalOverlay}>
          <View style={styles.htmlModal}>
            <View style={styles.htmlModalHeader}>
              <Text style={styles.htmlModalTitle}>Text Preview</Text>
              <TouchableOpacity onPress={() => setTextPreviewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.htmlModalContent}>
              <Text style={styles.htmlCode}>{generatedTextContent}</Text>
            </ScrollView>

            <View style={styles.htmlModalFooter}>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyText}
              >
                <Ionicons name="copy-outline" size={20} color="#fff" />
                <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
          isCurrentUserRegistered() && styles.registerButtonInactive,
        ]}
        onPress={handleRegisterCurrentUser}
        disabled={isCurrentUserRegistered()}
      >
        <Text style={[
          styles.registerButtonText,
          isCurrentUserRegistered() && styles.registerButtonTextInactive,
        ]}>
          {isCurrentUserRegistered() ? "You're Registered For This Event" : 'Register For This Event'}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 58,
    position: 'relative',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  refreshButtonText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
  pdfButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  pdfButtonText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
  },
  statusButtonSection: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  addButtonInRow: {
    flex: 1,
    backgroundColor: '#1B5E20',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonInRow: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
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
  emailInvoiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    marginRight: 32,
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
    paddingVertical: 10,
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
  htmlModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  htmlModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  htmlModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  htmlModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  htmlModalContent: {
    padding: 16,
    maxHeight: 400,
  },
  htmlCode: {
    fontFamily: 'monospace' as const,
    fontSize: 11,
    color: '#1a1a1a',
    lineHeight: 16,
  },
  htmlModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  copyButtonText: {
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
  emailButtonContainer: {
    position: 'relative' as const,
  },
  emailNotificationDot: {
    position: 'absolute' as const,
    top: -4,
    right: 24,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
  },
  emailSentDot: {
    backgroundColor: '#34C759',
  },
  pdfLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  pdfLoadingBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  pdfLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
    marginTop: 16,
  },
});
