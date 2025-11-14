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

export const syncMembersProcedure = publicProcedure
  .input(z.object({
    members: z.array(memberSchema),
    syncedBy: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('🔄 Syncing members to Supabase...', input.members.length);
    
    const membersToUpsert = input.members.map(member => ({
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
    }));

    const { error } = await supabase
      .from('members')
      .upsert(membersToUpsert, { onConflict: 'id' });

    if (error) {
      console.error('❌ Error syncing members:', error);
      throw new Error(`Failed to sync members: ${error.message}`);
    }

    const { error: syncError } = await supabase
      .from('sync_status')
      .upsert({
        id: 'members-all',
        entity_type: 'members',
        entity_id: 'all',
        last_synced_at: new Date().toISOString(),
        synced_by: input.syncedBy,
        sync_version: Date.now(),
      }, { onConflict: 'entity_type,entity_id' });

    if (syncError) {
      console.error('❌ Error updating sync status:', syncError);
    }

    console.log('✅ Members synced successfully');
    return { success: true, count: input.members.length };
  });

export const getMembersProcedure = publicProcedure
  .query(async () => {
    console.log('📥 Fetching members from Supabase...');
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error fetching members:', error);
      throw new Error(`Failed to fetch members: ${error.message}`);
    }

    const members: Member[] = (data || []).map(m => ({
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
    }));

    console.log('✅ Fetched members:', members.length);
    return members;
  });

export const getSyncStatusProcedure = publicProcedure
  .input(z.object({
    entityType: z.string(),
    entityId: z.string().optional(),
  }))
  .query(async ({ input }) => {
    const query = supabase
      .from('sync_status')
      .select('*')
      .eq('entity_type', input.entityType);

    if (input.entityId) {
      query.eq('entity_id', input.entityId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching sync status:', error);
      throw new Error(`Failed to fetch sync status: ${error.message}`);
    }

    return data ? {
      lastSyncedAt: data.last_synced_at,
      syncedBy: data.synced_by,
      syncVersion: data.sync_version,
    } : null;
  });

export default {
  sync: syncMembersProcedure,
  get: getMembersProcedure,
  syncStatus: getSyncStatusProcedure,
};
