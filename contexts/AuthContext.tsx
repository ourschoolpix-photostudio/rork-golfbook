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

function mapDbToMember(m: any): Member {
  return {
    id: m.id,
    name: m.name,
    pin: m.pin,
    isAdmin: m.is_admin,
    email: m.email,
    phone: m.phone,
    handicap: m.handicap,
    rolexPoints: m.rolex_points,
    createdAt: m.created_at,
    fullName: m.full_name,
    username: m.username,
    membershipType: m.membership_type,
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
    joinDate: m.join_date,
    profilePhotoUrl: m.profile_photo_url,
    adjustedHandicap: m.adjusted_handicap,
    ghin: m.ghin,
    boardMemberRoles: m.board_member_roles || [],
  };
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitializedAdmin, setHasInitializedAdmin] = useState<boolean>(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isFetchingMembers, setIsFetchingMembers] = useState<boolean>(false);

  const fetchMembers = useCallback(async () => {
    try {
      setIsFetchingMembers(true);
      console.log('📥 [AuthContext] Fetching members from Supabase...');
      
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ [AuthContext] Failed to fetch members:', error);
        throw error;
      }

      const mappedMembers = (data || []).map(mapDbToMember);
      console.log('✅ [AuthContext] Successfully fetched members:', mappedMembers.length);
      setMembers(mappedMembers);
      return mappedMembers;
    } catch (error) {
      console.error('❌ [AuthContext] Exception fetching members:', error);
      return [];
    } finally {
      setIsFetchingMembers(false);
    }
  }, []);

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

      console.log('➕ [AuthContext] Creating member via Supabase:', member.name);
      
      const { error } = await supabase
        .from('members')
        .insert({
          id: member.id,
          name: member.name,
          pin: member.pin,
          is_admin: member.isAdmin,
          email: member.email || null,
          phone: member.phone || null,
          handicap: member.handicap || null,
          rolex_points: member.rolexPoints || 0,
          created_at: member.createdAt || new Date().toISOString(),
          full_name: member.fullName || null,
          username: member.username || null,
          membership_type: member.membershipType || 'active',
          join_date: member.joinDate || new Date().toISOString().split('T')[0],
          board_member_roles: member.boardMemberRoles || [],
        });

      if (error) {
        if (error.code === '23505') {
          console.log('✅ [AuthContext] Member already exists (duplicate key), skipping creation');
          return;
        }
        console.error('❌ [AuthContext] Supabase insert failed:', error);
        throw error;
      }

      console.log('✅ [AuthContext] Member created successfully');
      await fetchMembers();
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        console.log('✅ [AuthContext] Member already exists, skipping creation');
        return;
      }
      console.error('❌ [AuthContext] Exception creating member:', error);
    }
  }, [members, fetchMembers]);

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
      
      const { error } = await supabase
        .from('members')
        .insert({
          id: member.id,
          name: member.name,
          pin: member.pin,
          is_admin: member.isAdmin,
          email: member.email || null,
          phone: member.phone || null,
          handicap: member.handicap || null,
          rolex_points: member.rolexPoints || 0,
          created_at: member.createdAt || new Date().toISOString(),
          full_name: member.fullName || null,
          username: member.username || null,
          membership_type: member.membershipType || 'active',
          join_date: member.joinDate || new Date().toISOString().split('T')[0],
          board_member_roles: member.boardMemberRoles || [],
        });

      if (error) {
        console.error('❌ [AuthContext] Failed to add member:', error);
        throw error;
      }

      console.log('✅ [AuthContext] Member added successfully');
      await fetchMembers();
    } catch (error) {
      console.error('❌ [AuthContext] Exception adding member:', error);
      throw error;
    }
  }, [fetchMembers]);

  const updateMember = useCallback(async (memberId: string, updates: Partial<Member>) => {
    try {
      console.log('✏️ [AuthContext] Updating member:', memberId);
      
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.pin !== undefined) updateData.pin = updates.pin;
      if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.handicap !== undefined) updateData.handicap = updates.handicap;
      if (updates.rolexPoints !== undefined) updateData.rolex_points = updates.rolexPoints;
      if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
      if (updates.username !== undefined) updateData.username = updates.username;
      if (updates.membershipType !== undefined) updateData.membership_type = updates.membershipType;
      if (updates.gender !== undefined) updateData.gender = updates.gender;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.flight !== undefined) updateData.flight = updates.flight;
      if (updates.rolexFlight !== undefined) updateData.rolex_flight = updates.rolexFlight;
      if (updates.currentHandicap !== undefined) updateData.current_handicap = updates.currentHandicap;
      if (updates.dateOfBirth !== undefined) updateData.date_of_birth = updates.dateOfBirth;
      if (updates.emergencyContactName !== undefined) updateData.emergency_contact_name = updates.emergencyContactName;
      if (updates.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = updates.emergencyContactPhone;
      if (updates.joinDate !== undefined) updateData.join_date = updates.joinDate;
      if (updates.profilePhotoUrl !== undefined) updateData.profile_photo_url = updates.profilePhotoUrl;
      if (updates.adjustedHandicap !== undefined) updateData.adjusted_handicap = updates.adjustedHandicap;
      if (updates.ghin !== undefined) updateData.ghin = updates.ghin;
      if (updates.boardMemberRoles !== undefined) updateData.board_member_roles = updates.boardMemberRoles;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId);

      if (error) {
        console.error('❌ [AuthContext] Failed to update member:', error);
        throw error;
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
  }, [currentUser, fetchMembers]);

  const deleteMember = useCallback(async (memberId: string) => {
    try {
      console.log('🗑️ [AuthContext] Deleting member:', memberId);
      
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('❌ [AuthContext] Failed to delete member:', error);
        throw error;
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
