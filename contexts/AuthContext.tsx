import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Member } from '@/types';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeMembers } from '@/utils/useRealtimeSubscription';
import { logger } from '@/utils/logger';

const STORAGE_KEYS = {
  CURRENT_USER: '@golf_current_user',
  EXPLICIT_LOGOUT: '@golf_explicit_logout',
} as const;

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

const DEFAULT_MEMBER: Member = {
  id: 'admin-bruce-pham',
  name: 'Bruce Pham',
  username: 'Bruce Pham',
  pin: '8650',
  isAdmin: true,
  rolexPoints: 0,
  createdAt: new Date().toISOString(),
  membershipType: 'active',
  email: '',
  phone: '',
  handicap: 0,
  joinDate: new Date().toISOString().split('T')[0],
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const { orgInfo } = useSettings();
  const useLocalStorage = useMemo(() => orgInfo?.useLocalStorage || false, [orgInfo?.useLocalStorage]);
  
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitializedAdmin, setHasInitializedAdmin] = useState<boolean>(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isFetchingMembers, setIsFetchingMembers] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const fetchMembers = useCallback(async () => {
    try {
      setIsFetchingMembers(true);
      setNetworkError(false);
      
      if (useLocalStorage) {
        logger.info('AuthContext', 'Fetching members from local storage');
        const fetchedMembers = await localStorageService.members.getAll();
        logger.info('AuthContext', `Successfully fetched ${fetchedMembers.length} members from local storage`);
        setMembers(fetchedMembers);
        return fetchedMembers;
      }
      
      logger.info('AuthContext', 'Fetching members from Supabase');
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Member fetch timeout')), 3000)
      );
      
      const fetchPromise = supabase.from('members').select('*');
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (error) throw error;
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .eq('archived', false);
      
      if (eventsError) {
        logger.error('AuthContext', 'Failed to fetch events for filtering', eventsError);
      }
      
      const validEventIds = new Set((eventsData || []).map(e => e.id));
      logger.debug('AuthContext', `Valid non-archived event IDs: ${validEventIds.size}`);
      
      const fetchedMembers = (data || []).map((m: any) => {
        const tournamentHandicaps = m.tournament_handicaps || [];
        const filteredHandicaps = tournamentHandicaps.filter((th: any) => {
          if (!th || !th.eventId) {
            logger.debug('AuthContext', 'Filtering out invalid tournament handicap record');
            return false;
          }
          const isValid = validEventIds.has(th.eventId);
          if (!isValid) {
            logger.debug('AuthContext', `Filtering out tournament handicap for deleted/archived event: ${th.eventName || 'Unknown'} (${th.eventId})`);
          }
          return isValid;
        });
        
        return {
          id: m.id,
          name: m.name || m.full_name || '',
          username: m.username || m.name || '',
          pin: m.pin || '',
          isAdmin: m.is_admin || false,
          rolexPoints: m.rolex_points || 0,
          email: m.email || '',
          phone: m.phone || '',
          handicap: m.handicap || 0,
          membershipType: m.membership_type || 'active',
          membershipLevel: m.membership_level || 'full',
          joinDate: m.join_date || new Date().toISOString().split('T')[0],
          createdAt: m.created_at || new Date().toISOString(),
          gender: m.gender,
          address: m.address,
          city: m.city,
          state: m.state,
          flight: m.flight,
          rolexFlight: m.rolex_flight,
          currentHandicap: m.current_handicap,
          dateOfBirth: m.date_of_birth,
          emergencyContactName: m.emergency_contact_name,
          emergencyContactPhone: m.emergency_contact_phone,
          profilePhotoUrl: m.profile_photo_url,
          adjustedHandicap: m.adjusted_handicap,
          ghin: m.ghin,
          boardMemberRoles: m.board_member_roles || [],
          tournamentHandicaps: filteredHandicaps,
        };
      });
      
      logger.info('AuthContext', `Successfully fetched ${fetchedMembers.length} members`);
      setMembers(fetchedMembers);
      return fetchedMembers;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      const isNetworkError = errorMessage.includes('Network request failed') || 
                            errorMessage.includes('fetch failed') ||
                            errorMessage.includes('network');
      
      logger.error('AuthContext', 'Failed to fetch members', error);
      
      if (isNetworkError) {
        logger.warn('AuthContext', 'Network error detected, setting network error flag');
        setNetworkError(true);
      }
      
      logger.info('AuthContext', 'Falling back to local storage');
      
      try {
        const fallbackMembers = await localStorageService.members.getAll();
        logger.info('AuthContext', `Successfully fetched ${fallbackMembers.length} members from local storage fallback`);
        setMembers(fallbackMembers);
        return fallbackMembers;
      } catch (fallbackError) {
        logger.error('AuthContext', 'Fallback also failed', fallbackError);
        setMembers([]);
        return [];
      }
    } finally {
      setIsFetchingMembers(false);
    }
  }, [useLocalStorage]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useRealtimeMembers(
    useCallback(() => {
      logger.info('AuthContext', 'Real-time member update detected, refetching members');
      fetchMembers();
    }, [fetchMembers]),
    !useLocalStorage
  );

  const addMemberDirect = useCallback(async (member: Member) => {
    try {
      const existingMember = members.find(m => m.id === member.id);
      if (existingMember) {
        logger.info('AuthContext', 'Member already exists, skipping creation');
        return;
      }

      if (networkError && retryCount >= MAX_RETRY_ATTEMPTS) {
        logger.warn('AuthContext', 'Skipping member creation due to network issues (max retries reached)');
        return;
      }

      if (useLocalStorage) {
        logger.info('AuthContext', `Creating member in local storage: ${member.name}`);
        await localStorageService.members.create(member);
      } else {
        logger.info('AuthContext', `Creating member in Supabase: ${member.name}`);
        const { error } = await supabase.from('members').insert({
          id: member.id,
          name: member.name,
          username: member.username || member.name,
          pin: member.pin,
          is_admin: member.isAdmin || false,
          rolex_points: member.rolexPoints || 0,
          email: member.email || '',
          phone: member.phone || '',
          handicap: member.handicap || 0,
          membership_type: member.membershipType || 'active',
          join_date: member.joinDate && member.joinDate.trim() !== '' ? member.joinDate : new Date().toISOString().split('T')[0],
          full_name: member.name,
          board_member_roles: member.boardMemberRoles || [],
        });
        
        if (error) throw error;
      }
      
      logger.info('AuthContext', 'Member created successfully');
      setRetryCount(0);
      setNetworkError(false);
      await fetchMembers();
    } catch (error: any) {
      const errorMessage = error?.message || JSON.stringify(error);
      
      if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        logger.info('AuthContext', 'Member already exists, skipping creation');
        return;
      }
      
      const isNetworkError = errorMessage.includes('Network request failed') || 
                            errorMessage.includes('fetch failed') ||
                            errorMessage.includes('network');
      
      if (isNetworkError) {
        logger.warn('AuthContext', `Network error creating member (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
        setNetworkError(true);
        setRetryCount(prev => prev + 1);
        
        if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
          logger.info('AuthContext', `Will retry in ${RETRY_DELAY_MS}ms`);
        } else {
          logger.warn('AuthContext', 'Max retry attempts reached, using local storage fallback');
          try {
            await localStorageService.members.create(member);
            logger.info('AuthContext', 'Member created in local storage fallback');
          } catch {
            logger.error('AuthContext', 'Local storage fallback also failed');
          }
        }
      } else {
        logger.error('AuthContext', 'Exception creating member', error);
      }
    }
  }, [members, fetchMembers, useLocalStorage, networkError, retryCount]);

  useEffect(() => {
    const shouldInitializeAdmin = 
      members && 
      members.length === 0 && 
      !hasInitializedAdmin && 
      !isFetchingMembers &&
      (!networkError || retryCount < MAX_RETRY_ATTEMPTS);

    if (shouldInitializeAdmin) {
      logger.info('AuthContext', 'No members found, creating default admin');
      setHasInitializedAdmin(true);
      
      const delay = networkError ? RETRY_DELAY_MS * retryCount : 0;
      if (delay > 0) {
        logger.info('AuthContext', `Waiting ${delay}ms before retry`);
        setTimeout(() => {
          addMemberDirect(DEFAULT_MEMBER);
        }, delay);
      } else {
        addMemberDirect(DEFAULT_MEMBER);
      }
    }
  }, [members, hasInitializedAdmin, isFetchingMembers, addMemberDirect, networkError, retryCount]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      setIsLoading(true);
      
      const loadPromise = AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AsyncStorage timeout')), 2000)
      );

      const currentUserData = await Promise.race([
        loadPromise,
        timeoutPromise
      ]) as string | null;

      if (currentUserData) {
        const user = JSON.parse(currentUserData);
        logger.info('AuthContext', `Found current user: ${user.name}`);
        setCurrentUser(user);
      } else {
        logger.info('AuthContext', 'No saved user, showing login screen');
      }
    } catch (error) {
      logger.error('AuthContext', 'Error loading current user', error);
      logger.info('AuthContext', 'Error loading user data, showing login screen');
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, pin: string): Promise<boolean> => {
    try {
      logger.debug('AuthContext', `Login attempt for username: ${username}`);
      
      const member = members.find((m: Member) => 
        (m.username?.toLowerCase() === username.trim().toLowerCase() || 
         m.name?.toLowerCase() === username.trim().toLowerCase()) && 
        m.pin === pin.trim()
      );
      
      logger.debug('AuthContext', `Total members in cache: ${members.length}`);
      logger.debug('AuthContext', member ? `Found member: ${member.name}` : 'No member found');
      
      if (member) {
        setCurrentUser(member);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(member));
        await AsyncStorage.removeItem(STORAGE_KEYS.EXPLICIT_LOGOUT);
        logger.info('AuthContext', `Login success: ${member.name}`);
        return true;
      }
      logger.warn('AuthContext', `Login failed: no member found with username: ${username}`);
      return false;
    } catch (error) {
      logger.error('AuthContext', 'Login error', error);
      return false;
    }
  }, [members]);

  const logout = useCallback(async () => {
    logger.info('AuthContext', 'Logging out, setting explicit logout flag');
    setCurrentUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    await AsyncStorage.setItem(STORAGE_KEYS.EXPLICIT_LOGOUT, 'true');
  }, []);

  const addMember = useCallback(async (member: Member) => {
    try {
      logger.info('AuthContext', `Adding member: ${member.name}`);
      
      if (useLocalStorage) {
        await localStorageService.members.create(member);
      } else {
        const { error } = await supabase.from('members').insert({
          id: member.id,
          name: member.name,
          username: member.username || member.name,
          pin: member.pin,
          is_admin: member.isAdmin || false,
          rolex_points: member.rolexPoints || 0,
          email: member.email || '',
          phone: member.phone || '',
          handicap: member.handicap || 0,
          membership_type: member.membershipType || 'active',
          join_date: member.joinDate && member.joinDate.trim() !== '' ? member.joinDate : new Date().toISOString().split('T')[0],
          full_name: member.name,
          gender: member.gender || null,
          address: member.address || null,
          city: member.city || null,
          state: member.state || null,
          flight: member.flight || null,
          rolex_flight: member.rolexFlight || null,
          current_handicap: member.currentHandicap || null,
          date_of_birth: member.dateOfBirth && member.dateOfBirth.trim() !== '' ? member.dateOfBirth : null,
          emergency_contact_name: member.emergencyContactName || null,
          emergency_contact_phone: member.emergencyContactPhone || null,
          profile_photo_url: member.profilePhotoUrl || null,
          adjusted_handicap: member.adjustedHandicap || null,
          ghin: member.ghin || null,
          board_member_roles: member.boardMemberRoles || [],
        });
        
        if (error) throw error;
      }
      
      logger.info('AuthContext', 'Member added successfully');
      await fetchMembers();
    } catch (error) {
      logger.error('AuthContext', 'Exception adding member', error);
      throw error;
    }
  }, [fetchMembers, useLocalStorage]);

  const updateMember = useCallback(async (memberId: string, updates: Partial<Member>) => {
    try {
      logger.info('AuthContext', `Updating member: ${memberId}`, { fields: Object.keys(updates) });
      
      if (useLocalStorage) {
        await localStorageService.members.update(memberId, updates);
        logger.info('AuthContext', 'Member updated in local storage');
      } else {
        const supabaseUpdates: any = {};
        if (updates.name !== undefined) supabaseUpdates.name = updates.name;
        if (updates.username !== undefined) supabaseUpdates.username = updates.username;
        if (updates.pin !== undefined) supabaseUpdates.pin = updates.pin;
        if (updates.isAdmin !== undefined) supabaseUpdates.is_admin = updates.isAdmin;
        if (updates.rolexPoints !== undefined) supabaseUpdates.rolex_points = updates.rolexPoints;
        if (updates.email !== undefined) supabaseUpdates.email = updates.email;
        if (updates.phone !== undefined) supabaseUpdates.phone = updates.phone;
        if (updates.handicap !== undefined) supabaseUpdates.handicap = updates.handicap;
        if (updates.membershipType !== undefined) supabaseUpdates.membership_type = updates.membershipType;
        if (updates.membershipLevel !== undefined) supabaseUpdates.membership_level = updates.membershipLevel;
        if (updates.joinDate !== undefined) supabaseUpdates.join_date = updates.joinDate && updates.joinDate.trim() !== '' ? updates.joinDate : null;
        if (updates.gender !== undefined) supabaseUpdates.gender = updates.gender || null;
        if (updates.address !== undefined) supabaseUpdates.address = updates.address || null;
        if (updates.city !== undefined) supabaseUpdates.city = updates.city || null;
        if (updates.state !== undefined) supabaseUpdates.state = updates.state || null;
        if (updates.flight !== undefined) supabaseUpdates.flight = updates.flight || null;
        if (updates.rolexFlight !== undefined) supabaseUpdates.rolex_flight = updates.rolexFlight || null;
        if (updates.currentHandicap !== undefined) supabaseUpdates.current_handicap = updates.currentHandicap || null;
        if (updates.dateOfBirth !== undefined) supabaseUpdates.date_of_birth = updates.dateOfBirth && updates.dateOfBirth.trim() !== '' ? updates.dateOfBirth : null;
        if (updates.emergencyContactName !== undefined) supabaseUpdates.emergency_contact_name = updates.emergencyContactName || null;
        if (updates.emergencyContactPhone !== undefined) supabaseUpdates.emergency_contact_phone = updates.emergencyContactPhone || null;
        if (updates.profilePhotoUrl !== undefined) supabaseUpdates.profile_photo_url = updates.profilePhotoUrl || null;
        if (updates.adjustedHandicap !== undefined) supabaseUpdates.adjusted_handicap = updates.adjustedHandicap || null;
        if (updates.ghin !== undefined) supabaseUpdates.ghin = updates.ghin || null;
        if (updates.boardMemberRoles !== undefined) supabaseUpdates.board_member_roles = updates.boardMemberRoles || [];
        if (updates.tournamentHandicaps !== undefined) supabaseUpdates.tournament_handicaps = updates.tournamentHandicaps || [];
        
        logger.debug('AuthContext', 'Sending Supabase update', { fields: Object.keys(supabaseUpdates) });
        
        const { error } = await supabase
          .from('members')
          .update(supabaseUpdates)
          .eq('id', memberId);
        
        if (error) throw error;
        logger.info('AuthContext', 'Member updated in Supabase');
      }
      
      logger.info('AuthContext', 'Refreshing members list');
      await fetchMembers();

      if (currentUser?.id === memberId) {
        const updatedMember = { ...currentUser, ...updates };
        logger.info('AuthContext', 'Updating current user in state and storage');
        setCurrentUser(updatedMember);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedMember));
      }
      
      logger.info('AuthContext', 'Member update complete');
    } catch (error) {
      logger.error('AuthContext', 'Exception updating member', error);
      throw error;
    }
  }, [currentUser, fetchMembers, useLocalStorage]);

  const deleteMember = useCallback(async (memberId: string) => {
    try {
      logger.info('AuthContext', `Deleting member: ${memberId}`);
      
      if (useLocalStorage) {
        await localStorageService.members.delete(memberId);
      } else {
        const { error } = await supabase
          .from('members')
          .delete()
          .eq('id', memberId);
        
        if (error) throw error;
      }
      
      logger.info('AuthContext', 'Member deleted successfully');
      await fetchMembers();

      if (currentUser?.id === memberId) {
        await logout();
      }
    } catch (error) {
      logger.error('AuthContext', 'Exception deleting member', error);
      throw error;
    }
  }, [currentUser, logout, fetchMembers, useLocalStorage]);

  return useMemo(() => ({
    members,
    currentUser,
    isLoading: isLoading || isFetchingMembers,
    login,
    logout,
    addMember,
    updateMember,
    deleteMember,
    refreshMembers: fetchMembers,
  }), [members, currentUser, isLoading, isFetchingMembers, login, logout, addMember, updateMember, deleteMember, fetchMembers]);
});
