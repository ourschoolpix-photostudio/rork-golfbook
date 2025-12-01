import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Member } from '@/types';
import { trpc } from '@/lib/trpc';

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

  const membersQuery = trpc.members.getAll.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (membersQuery.data) {
      console.log('✅ [AuthContext] Successfully fetched members:', membersQuery.data.length);
    }
    if (membersQuery.error) {
      console.error('❌ [AuthContext] Failed to fetch members:', membersQuery.error);
    }
  }, [membersQuery.data, membersQuery.error]);

  const members = useMemo(() => membersQuery.data || [], [membersQuery.data]);
  const isFetchingMembers = membersQuery.isLoading;

  const createMemberMutation = trpc.members.create.useMutation({
    onSuccess: () => {
      console.log('✅ [AuthContext] Member created successfully');
      membersQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [AuthContext] Failed to create member:', error);
    },
  });

  const updateMemberMutation = trpc.members.update.useMutation({
    onSuccess: () => {
      console.log('✅ [AuthContext] Member updated successfully');
      membersQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [AuthContext] Failed to update member:', error);
    },
  });

  const deleteMemberMutation = trpc.members.delete.useMutation({
    onSuccess: () => {
      console.log('✅ [AuthContext] Member deleted successfully');
      membersQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [AuthContext] Failed to delete member:', error);
    },
  });

  const addMemberDirect = useCallback(async (member: Member) => {
    try {
      const existingMember = members.find(m => m.id === member.id);
      if (existingMember) {
        console.log('✅ [AuthContext] Member already exists, skipping creation');
        return;
      }

      await createMemberMutation.mutateAsync(member);
    } catch (error: any) {
      if (error?.message?.includes('duplicate key') || error?.message?.includes('23505')) {
        console.log('✅ [AuthContext] Member already exists (duplicate key), skipping creation');
        return;
      }
      console.error('❌ [AuthContext] Exception creating member:', error);
    }
  }, [members, createMemberMutation]);

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
      await createMemberMutation.mutateAsync(member);
    } catch (error) {
      console.error('❌ [AuthContext] Exception adding member:', error);
      throw error;
    }
  }, [createMemberMutation]);

  const updateMember = useCallback(async (memberId: string, updates: Partial<Member>) => {
    try {
      await updateMemberMutation.mutateAsync({ memberId, updates });

      if (currentUser?.id === memberId) {
        const updatedMember = { ...currentUser, ...updates };
        setCurrentUser(updatedMember);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedMember));
      }
    } catch (error) {
      console.error('❌ [AuthContext] Exception updating member:', error);
      throw error;
    }
  }, [currentUser, updateMemberMutation]);

  const deleteMember = useCallback(async (memberId: string) => {
    try {
      await deleteMemberMutation.mutateAsync({ memberId });

      if (currentUser?.id === memberId) {
        await logout();
      }
    } catch (error) {
      console.error('❌ [AuthContext] Exception deleting member:', error);
      throw error;
    }
  }, [currentUser, logout, deleteMemberMutation]);

  return useMemo(() => ({
    members,
    currentUser,
    isLoading: isLoading || isFetchingMembers,
    login,
    logout,
    addMember,
    updateMember,
    deleteMember,
    refreshMembers: membersQuery.refetch,
  }), [members, currentUser, isLoading, isFetchingMembers, login, logout, addMember, updateMember, deleteMember, membersQuery.refetch]);
});
