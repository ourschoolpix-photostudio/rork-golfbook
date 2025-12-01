import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Member } from '@/types';
import { trpcClient } from '@/lib/trpc';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';

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
      
      console.log('📥 [AuthContext] Fetching members via tRPC...');
      const fetchedMembers = await trpcClient.members.getAll.query();
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
        console.log('➕ [AuthContext] Creating member via tRPC:', member.name);
        await trpcClient.members.create.mutate(member);
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
        await trpcClient.members.create.mutate(member);
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
      console.log('✏️ [AuthContext] Updating member:', memberId);
      
      if (useLocalStorage) {
        await localStorageService.members.update(memberId, updates);
      } else {
        await trpcClient.members.update.mutate({ memberId, updates });
      }
      
      console.log('✅ [AuthContext] Member updated successfully');
      await fetchMembers();

      if (currentUser?.id === memberId) {
        const updatedMember = { ...currentUser, ...updates };
        setCurrentUser(updatedMember);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedMember));
      }
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
        await trpcClient.members.delete.mutate({ memberId });
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
