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

  const membersQuery = trpc.members.getAll.useQuery();

  const createMemberMutation = trpc.members.create.useMutation({
    onSuccess: () => {
      membersQuery.refetch();
    },
  });

  const updateMemberMutation = trpc.members.update.useMutation({
    onSuccess: () => {
      membersQuery.refetch();
    },
  });

  const deleteMemberMutation = trpc.members.delete.useMutation({
    onSuccess: () => {
      membersQuery.refetch();
    },
  });

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (membersQuery.data && membersQuery.data.length === 0 && !createMemberMutation.isPending && !hasInitializedAdmin) {
      console.log('AuthContext - No members found, creating default admin');
      setHasInitializedAdmin(true);
      createMemberMutation.mutate(DEFAULT_MEMBER);
    }
  }, [membersQuery.data, hasInitializedAdmin]);

  const loadCurrentUser = async () => {
    try {
      setIsLoading(true);
      
      const currentUserData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);

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
      
      const allMembers = membersQuery.data || [];
      const member = allMembers.find((m: Member) => 
        (m.username?.toLowerCase() === username.trim().toLowerCase() || 
         m.name?.toLowerCase() === username.trim().toLowerCase()) && 
        m.pin === pin.trim()
      );
      
      console.log('AuthContext login - total members in cache:', allMembers.length);
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
  }, [membersQuery.data]);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }, []);

  const addMember = useCallback(async (member: Member) => {
    await createMemberMutation.mutateAsync(member);
  }, [createMemberMutation]);

  const updateMember = useCallback(async (memberId: string, updates: Partial<Member>) => {
    await updateMemberMutation.mutateAsync({ memberId, updates });

    if (currentUser?.id === memberId) {
      const updatedMember = { ...currentUser, ...updates };
      setCurrentUser(updatedMember);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedMember));
    }
  }, [currentUser, updateMemberMutation]);

  const deleteMember = useCallback(async (memberId: string) => {
    await deleteMemberMutation.mutateAsync({ memberId });

    if (currentUser?.id === memberId) {
      await logout();
    }
  }, [currentUser, logout, deleteMemberMutation]);

  const members = membersQuery.data || [];

  return useMemo(() => ({
    members,
    currentUser,
    isLoading: isLoading || membersQuery.isLoading,
    login,
    logout,
    addMember,
    updateMember,
    deleteMember,
  }), [members, currentUser, isLoading, membersQuery.isLoading, login, logout, addMember, updateMember, deleteMember]);
});
