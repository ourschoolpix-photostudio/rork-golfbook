import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Member } from '@/types';
import { supabase } from '@/integrations/supabase/client';

function transformMemberFromDB(dbMember: any): Member {
  return {
    id: dbMember.id,
    name: dbMember.name,
    pin: dbMember.pin,
    isAdmin: dbMember.is_admin || false,
    email: dbMember.email,
    phone: dbMember.phone,
    handicap: dbMember.handicap,
    rolexPoints: dbMember.rolex_points || 0,
    createdAt: dbMember.created_at,
    fullName: dbMember.full_name,
    username: dbMember.username,
    membershipType: dbMember.membership_type,
    gender: dbMember.gender,
    address: dbMember.address,
    city: dbMember.city,
    state: dbMember.state,
    flight: dbMember.flight,
    rolexFlight: dbMember.rolex_flight,
    currentHandicap: dbMember.current_handicap,
    dateOfBirth: dbMember.date_of_birth,
    emergencyContactName: dbMember.emergency_contact_name,
    emergencyContactPhone: dbMember.emergency_contact_phone,
    joinDate: dbMember.join_date,
    profilePhotoUrl: dbMember.profile_photo_url,
    adjustedHandicap: dbMember.adjusted_handicap,
    ghin: dbMember.ghin,
  };
}

function transformMemberToDB(member: Member): any {
  return {
    id: member.id,
    name: member.name,
    pin: member.pin,
    is_admin: member.isAdmin,
    email: member.email,
    phone: member.phone,
    handicap: member.handicap,
    rolex_points: member.rolexPoints,
    created_at: member.createdAt,
    full_name: member.fullName,
    username: member.username,
    membership_type: member.membershipType,
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
    join_date: member.joinDate,
    profile_photo_url: member.profilePhotoUrl,
    adjusted_handicap: member.adjustedHandicap,
    ghin: member.ghin,
  };
}

const STORAGE_KEYS = {
  CURRENT_USER: '@golf_current_user',
} as const;

const DEFAULT_MEMBER = {
  id: 'admin-bruce-pham',
  name: 'Bruce Pham',
  username: 'Bruce Pham',
  pin: '8650',
  is_admin: true,
  rolex_points: 0,
  created_at: new Date().toISOString(),
  membership_type: 'active',
  email: '',
  phone: '',
  handicap: 0,
  join_date: new Date().toISOString().split('T')[0],
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
        console.error('❌ [AuthContext] Failed to fetch members:', JSON.stringify(error, null, 2));
        return;
      }

      console.log('✅ [AuthContext] Successfully fetched members:', data?.length || 0);
      const transformedMembers = (data || []).map(transformMemberFromDB);
      setMembers(transformedMembers);
    } catch (error) {
      console.error('❌ [AuthContext] Exception fetching members:', error instanceof Error ? error.message : String(error));
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

  const addMemberDirect = useCallback(async (dbMember: any) => {
    try {
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('id', dbMember.id)
        .single();

      if (existingMember) {
        console.log('✅ [AuthContext] Member already exists, skipping creation');
        return;
      }

      const { error } = await supabase
        .from('members')
        .insert([dbMember]);

      if (error) {
        if (error.code === '23505') {
          console.log('✅ [AuthContext] Member already exists (duplicate key), skipping creation');
          return;
        }
        console.error('❌ [AuthContext] Failed to create member:', JSON.stringify(error, null, 2));
        return;
      }

      await fetchMembers();
    } catch (error) {
      console.error('❌ [AuthContext] Exception creating member:', error instanceof Error ? error.message : String(error));
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
      const dbMember = transformMemberToDB(member);
      const { error } = await supabase
        .from('members')
        .insert([dbMember]);

      if (error) {
        console.error('❌ [AuthContext] Failed to add member:', JSON.stringify(error, null, 2));
        throw error;
      }

      await fetchMembers();
    } catch (error) {
      console.error('❌ [AuthContext] Exception adding member:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [fetchMembers]);

  const updateMember = useCallback(async (memberId: string, updates: Partial<Member>) => {
    try {
      const dbUpdates = transformMemberToDB(updates as Member);
      const { error } = await supabase
        .from('members')
        .update(dbUpdates)
        .eq('id', memberId);

      if (error) {
        console.error('❌ [AuthContext] Failed to update member:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (currentUser?.id === memberId) {
        const updatedMember = { ...currentUser, ...updates };
        setCurrentUser(updatedMember);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedMember));
      }

      await fetchMembers();
    } catch (error) {
      console.error('❌ [AuthContext] Exception updating member:', error instanceof Error ? error.message : String(error));
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
        console.error('❌ [AuthContext] Failed to delete member:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (currentUser?.id === memberId) {
        await logout();
      }

      await fetchMembers();
    } catch (error) {
      console.error('❌ [AuthContext] Exception deleting member:', error instanceof Error ? error.message : String(error));
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
