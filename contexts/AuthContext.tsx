import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Member } from '@/types';
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
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitializedAdmin, setHasInitializedAdmin] = useState<boolean>(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isFetchingMembers, setIsFetchingMembers] = useState<boolean>(false);

  const fetchMembers = useCallback(async () => {
    try {
      setIsFetchingMembers(true);
      console.log('⏳ [AuthContext] Loading members from Supabase...');
      
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ [AuthContext] Failed to fetch members:', error);
        return;
      }

      console.log('✅ [AuthContext] Successfully fetched members:', data?.length || 0);
      setMembers(data || []);
    } catch (error) {
      console.error('❌ [AuthContext] Exception fetching members:', error);
    } finally {
      setIsFetchingMembers(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const addMemberDirect = useCallback(async (member: Member) => {
    try {
      const { error } = await supabase
        .from('members')
        .insert([member]);

      if (error) {
        console.error('❌ [AuthContext] Failed to create member:', error);
        return;
      }

      await fetchMembers();
    } catch (error) {
      console.error('❌ [AuthContext] Exception creating member:', error);
    }
  }, [fetchMembers]);

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
      const { error } = await supabase
        .from('members')
        .insert([member]);

      if (error) {
        console.error('❌ [AuthContext] Failed to add member:', error);
        throw error;
      }

      await fetchMembers();
    } catch (error) {
      console.error('❌ [AuthContext] Exception adding member:', error);
      throw error;
    }
  }, [fetchMembers]);

  const updateMember = useCallback(async (memberId: string, updates: Partial<Member>) => {
    try {
      const { error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', memberId);

      if (error) {
        console.error('❌ [AuthContext] Failed to update member:', error);
        throw error;
      }

      if (currentUser?.id === memberId) {
        const updatedMember = { ...currentUser, ...updates };
        setCurrentUser(updatedMember);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedMember));
      }

      await fetchMembers();
    } catch (error) {
      console.error('❌ [AuthContext] Exception updating member:', error);
      throw error;
    }
  }, [currentUser, fetchMembers]);

  const deleteMember = useCallback(async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('❌ [AuthContext] Failed to delete member:', error);
        throw error;
      }

      if (currentUser?.id === memberId) {
        await logout();
      }

      await fetchMembers();
    } catch (error) {
      console.error('❌ [AuthContext] Exception deleting member:', error);
      throw error;
    }
  }, [currentUser, logout, fetchMembers]);

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
