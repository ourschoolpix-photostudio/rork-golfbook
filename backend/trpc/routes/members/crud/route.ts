import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import type { Member } from "@/types";

const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  pin: z.string(),
  isAdmin: z.boolean(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  handicap: z.number().nullable().optional(),
  rolexPoints: z.number(),
  createdAt: z.string(),
  fullName: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  membershipType: z.enum(['active', 'in-active', 'guest']).nullable().optional(),
  gender: z.union([z.enum(['male', 'female']), z.string()]).nullable().optional().transform(val => {
    if (val === 'male' || val === 'female') return val;
    return null;
  }),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  flight: z.enum(['A', 'B', 'C', 'L']).nullable().optional(),
  rolexFlight: z.union([z.enum(['A', 'B']), z.string()]).nullable().optional().transform(val => {
    if (val === 'A' || val === 'B') return val;
    return null;
  }),
  currentHandicap: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  joinDate: z.string().nullable().optional(),
  profilePhotoUrl: z.string().nullable().optional(),
  adjustedHandicap: z.string().nullable().optional(),
  ghin: z.string().nullable().optional(),
});

function mapMemberToDb(member: z.infer<typeof memberSchema>) {
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
    updated_at: new Date().toISOString(),
  };
}

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
  };
}

export const getAllMembersProcedure = publicProcedure
  .query(async () => {
    console.log('📥 Fetching all members from database...');
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error fetching members:', error);
      throw new Error(`Failed to fetch members: ${error.message}`);
    }

    const members = (data || []).map(mapDbToMember);

    console.log('✅ Fetched members:', members.length);
    return members;
  });

export const getMemberProcedure = publicProcedure
  .input(z.object({ memberId: z.string() }))
  .query(async ({ input }) => {
    console.log('📥 Fetching member:', input.memberId);
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', input.memberId)
      .single();

    if (error) {
      console.error('❌ Error fetching member:', error);
      throw new Error(`Failed to fetch member: ${error.message}`);
    }

    return mapDbToMember(data);
  });

export const getMemberByPinProcedure = publicProcedure
  .input(z.object({ pin: z.string() }))
  .query(async ({ input }) => {
    console.log('📥 Fetching member by PIN');
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('pin', input.pin)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('❌ Error fetching member by PIN:', error);
      throw new Error(`Failed to fetch member: ${error.message}`);
    }

    return mapDbToMember(data);
  });

export const createMemberProcedure = publicProcedure
  .input(memberSchema)
  .mutation(async ({ input }) => {
    console.log('➕ Creating member:', input.name);
    
    const memberData = mapMemberToDb(input);

    const { error } = await supabase
      .from('members')
      .insert(memberData);

    if (error) {
      console.error('❌ Error creating member:', error);
      throw new Error(`Failed to create member: ${error.message}`);
    }

    console.log('✅ Member created successfully');
    return { success: true, memberId: input.id };
  });

export const updateMemberProcedure = publicProcedure
  .input(z.object({
    memberId: z.string(),
    updates: memberSchema.partial(),
  }))
  .mutation(async ({ input }) => {
    console.log('✏️ Updating member:', input.memberId);
    
    const memberData = mapMemberToDb({ id: input.memberId, ...input.updates } as any);

    const { error } = await supabase
      .from('members')
      .update(memberData)
      .eq('id', input.memberId);

    if (error) {
      console.error('❌ Error updating member:', error);
      throw new Error(`Failed to update member: ${error.message}`);
    }

    console.log('✅ Member updated successfully');
    return { success: true };
  });

export const deleteMemberProcedure = publicProcedure
  .input(z.object({ memberId: z.string() }))
  .mutation(async ({ input }) => {
    console.log('🗑️ Deleting member:', input.memberId);
    
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', input.memberId);

    if (error) {
      console.error('❌ Error deleting member:', error);
      throw new Error(`Failed to delete member: ${error.message}`);
    }

    console.log('✅ Member deleted successfully');
    return { success: true };
  });

export default {
  getAll: getAllMembersProcedure,
  get: getMemberProcedure,
  getByPin: getMemberByPinProcedure,
  create: createMemberProcedure,
  update: updateMemberProcedure,
  delete: deleteMemberProcedure,
};
