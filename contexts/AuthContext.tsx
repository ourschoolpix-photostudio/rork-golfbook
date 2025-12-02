import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Member } from '@/types';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEYS = {
  CURRENT_USER: '@golf_current_user',
} as const;

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
  const useLocalStorage = orgInfo?.useLocalStorage || false;
  
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitializedAdmin, setHasInitializedAdmin] = useState<boolean>(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isFetchingMembers, setIsFetchingMembers] = useState<boolean>(false);

  const fetchMembers = useCallback(async () => {
    try {
      setIsFetchingMembers(true);
      
      if (useLocalStorage) {
        console.log('📥 [AuthContext] Fetching members from local storage...');
        const fetchedMembers = await localStorageService.members.getAll();
        console.log('✅ [AuthContext] Successfully fetched members from local storage:', fetchedMembers.length);
        setMembers(fetchedMembers);
        return fetchedMembers;
      }
      
      console.log('📥 [AuthContext] Fetching members from Supabase...');
      const { data, error } = await supabase.from('members').select('*');
      
      if (error) throw error;
      
      const fetchedMembers = (data || []).map((m: any) => ({
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
      }));
      
      console.log('✅ [AuthContext] Successfully fetched members:', fetchedMembers.length);
      setMembers(fetchedMembers);
      return fetchedMembers;
    } catch (error) {
      console.error('❌ [AuthContext] Failed to fetch members:', error);
      console.log('📥 [AuthContext] Falling back to local storage');
      
      try {
        const fallbackMembers = await localStorageService.members.getAll();
        console.log('✅ [AuthContext] Successfully fetched members from local storage fallback:', fallbackMembers.length);
        setMembers(fallbackMembers);
        return fallbackMembers;
      } catch (fallbackError) {
        console.error('❌ [AuthContext] Fallback also failed:', fallbackError);
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

  const addMemberDirect = useCallback(async (member: Member) => {
    try {
      const existingMember = members.find(m => m.id === member.id);
      if (existingMember) {
        console.log('✅ [AuthContext] Member already exists, skipping creation');
        return;
      }

      if (useLocalStorage) {
        console.log('➕ [AuthContext] Creating member in local storage:', member.name);
        await localStorageService.members.create(member);
      } else {
        console.log('➕ [AuthContext] Creating member in Supabase:', member.name);
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
          join_date: member.joinDate || new Date().toISOString().split('T')[0],
          full_name: member.name,
          board_member_roles: member.boardMemberRoles || [],
        });
        
        if (error) throw error;
      }
      
      console.log('✅ [AuthContext] Member created successfully');
      await fetchMembers();
    } catch (error: any) {
      if (error?.message?.includes('duplicate key') || error?.message?.includes('already exists')) {
        console.log('✅ [AuthContext] Member already exists, skipping creation');
        return;
      }
      console.error('❌ [AuthContext] Exception creating member:', error);
    }
  }, [members, fetchMembers, useLocalStorage]);

  useEffect(() => {
    const shouldInitializeAdmin = 
      members && 
      members.length === 0 && 
      !hasInitializedAdmin && 
      !isFetchingMembers;

    if (shouldInitializeAdmin) {
      console.log('AuthContext - No members found, creating default admin');
      setHasInitializedAdmin(true);
      addMemberDirect(DEFAULT_MEMBER);
    }
  }, [members, hasInitializedAdmin, isFetchingMembers, addMemberDirect]);

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

      const currentUserData = await Promise.race([loadPromise, timeoutPromise]) as string | null;

      if (currentUserData) {
        const user = JSON.parse(currentUserData);
        console.log('AuthContext - Found current user:', user.name);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, pin: string): Promise<boolean> => {
    try {
      console.log('AuthContext login - searching for username:', username, 'and pin:', pin);
      
      const member = members.find((m: Member) => 
        (m.username?.toLowerCase() === username.trim().toLowerCase() || 
         m.name?.toLowerCase() === username.trim().toLowerCase()) && 
        m.pin === pin.trim()
      );
      
      console.log('AuthContext login - total members in cache:', members.length);
      console.log('AuthContext login - found member:', member ? { id: member.id, name: member.name, pin: member.pin } : 'NONE');
      
      if (member) {
        setCurrentUser(member);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(member));
        console.log('AuthContext login - success, currentUser set to:', member.name);
        return true;
      }
      console.log('AuthContext login - no member found with username:', username, 'and pin:', pin);
      return false;
    } catch (error) {
      console.error('Login error in AuthContext:', error);
      return false;
    }
  }, [members]);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }, []);

  const addMember = useCallback(async (member: Member) => {
    try {
      console.log('➕ [AuthContext] Adding member:', member.name);
      
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
          join_date: member.joinDate || new Date().toISOString().split('T')[0],
          full_name: member.name,
          gender: member.gender,
          address: member.address,
          city: member.city,
          state: member.state,
          flight: member.flight,
          rolex_flight: member.rolexFlight,
          current_handicap: member.currentHandicap,
          date_of_birth: member.dateOfBirth,
          emergency_contact_name: member.emergencyContactName,
          emergency_contact_phone: member.emergencyContactPhone,
          profile_photo_url: member.profilePhotoUrl,
          adjusted_handicap: member.adjustedHandicap,
          ghin: member.ghin,
          board_member_roles: member.boardMemberRoles || [],
        });
        
        if (error) throw error;
      }
      
      console.log('✅ [AuthContext] Member added successfully');
      await fetchMembers();
    } catch (error) {
      console.error('❌ [AuthContext] Exception adding member:', error);
      throw error;
    }
  }, [fetchMembers, useLocalStorage]);

  const updateMember = useCallback(async (memberId: string, updates: Partial<Member>) => {
    try {
      console.log('✏️ [AuthContext] Updating member:', memberId, 'with updates:', Object.keys(updates));
      
      if (useLocalStorage) {
        await localStorageService.members.update(memberId, updates);
        console.log('✅ [AuthContext] Member updated in local storage');
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
        if (updates.joinDate !== undefined) supabaseUpdates.join_date = updates.joinDate;
        if (updates.gender !== undefined) supabaseUpdates.gender = updates.gender;
        if (updates.address !== undefined) supabaseUpdates.address = updates.address;
        if (updates.city !== undefined) supabaseUpdates.city = updates.city;
        if (updates.state !== undefined) supabaseUpdates.state = updates.state;
        if (updates.flight !== undefined) supabaseUpdates.flight = updates.flight;
        if (updates.rolexFlight !== undefined) supabaseUpdates.rolex_flight = updates.rolexFlight;
        if (updates.currentHandicap !== undefined) supabaseUpdates.current_handicap = updates.currentHandicap;
        if (updates.dateOfBirth !== undefined) supabaseUpdates.date_of_birth = updates.dateOfBirth;
        if (updates.emergencyContactName !== undefined) supabaseUpdates.emergency_contact_name = updates.emergencyContactName;
        if (updates.emergencyContactPhone !== undefined) supabaseUpdates.emergency_contact_phone = updates.emergencyContactPhone;
        if (updates.profilePhotoUrl !== undefined) supabaseUpdates.profile_photo_url = updates.profilePhotoUrl;
        if (updates.adjustedHandicap !== undefined) supabaseUpdates.adjusted_handicap = updates.adjustedHandicap;
        if (updates.ghin !== undefined) supabaseUpdates.ghin = updates.ghin;
        if (updates.boardMemberRoles !== undefined) supabaseUpdates.board_member_roles = updates.boardMemberRoles || [];
        
        console.log('📤 [AuthContext] Sending Supabase update with fields:', Object.keys(supabaseUpdates));
        
        const { error } = await supabase
          .from('members')
          .update(supabaseUpdates)
          .eq('id', memberId);
        
        if (error) throw error;
        console.log('✅ [AuthContext] Member updated in Supabase');
      }
      
      console.log('🔄 [AuthContext] Refreshing members list...');
      await fetchMembers();

      if (currentUser?.id === memberId) {
        const updatedMember = { ...currentUser, ...updates };
        console.log('🔄 [AuthContext] Updating current user in state and storage');
        setCurrentUser(updatedMember);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedMember));
      }
      
      console.log('✅ [AuthContext] Member update complete');
    } catch (error) {
      console.error('❌ [AuthContext] Exception updating member:', error);
      throw error;
    }
  }, [currentUser, fetchMembers, useLocalStorage]);

  const deleteMember = useCallback(async (memberId: string) => {
    try {
      console.log('🗑️ [AuthContext] Deleting member:', memberId);
      
      if (useLocalStorage) {
        await localStorageService.members.delete(memberId);
      } else {
        const { error } = await supabase
          .from('members')
          .delete()
          .eq('id', memberId);
        
        if (error) throw error;
      }
      
      console.log('✅ [AuthContext] Member deleted successfully');
      await fetchMembers();

      if (currentUser?.id === memberId) {
        await logout();
      }
    } catch (error) {
      console.error('❌ [AuthContext] Exception deleting member:', error);
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
