import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";

const getAllProcedure = publicProcedure
  .input(z.object({ 
    memberId: z.string().optional(),
    eventId: z.string().optional(),
  }).optional())
  .query(async ({ ctx, input }) => {
    try {
      console.log('[Preferences tRPC] Getting preferences');
      
      let query = ctx.supabase.from('user_preferences').select('*');
      
      if (input?.memberId) {
        query = query.eq('member_id', input.memberId);
      }
      if (input?.eventId) {
        query = query.eq('event_id', input.eventId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Preferences tRPC] Error fetching preferences:', error);
        throw new Error(`Failed to fetch preferences: ${error.message}`);
      }

      const preferences = data.map(pref => ({
        id: pref.id,
        memberId: pref.member_id,
        eventId: pref.event_id,
        key: pref.preference_key,
        value: pref.preference_value,
        createdAt: pref.created_at,
        updatedAt: pref.updated_at,
      }));

      console.log('[Preferences tRPC] Fetched preferences:', preferences.length);
      return preferences;
    } catch (error) {
      console.error('[Preferences tRPC] Error in getAll:', error);
      throw error;
    }
  });

const getProcedure = publicProcedure
  .input(z.object({
    memberId: z.string().optional(),
    eventId: z.string().optional(),
    key: z.string(),
  }))
  .query(async ({ ctx, input }) => {
    try {
      console.log('[Preferences tRPC] Getting preference:', input.key);
      
      let query = ctx.supabase
        .from('user_preferences')
        .select('*')
        .eq('preference_key', input.key);
      
      if (input.memberId) {
        query = query.eq('member_id', input.memberId);
      } else {
        query = query.is('member_id', null);
      }
      
      if (input.eventId) {
        query = query.eq('event_id', input.eventId);
      } else {
        query = query.is('event_id', null);
      }
      
      const { data, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('[Preferences tRPC] Error fetching preference:', error);
        throw new Error(`Failed to fetch preference: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      console.log('[Preferences tRPC] Fetched preference:', data.preference_key);
      return {
        id: data.id,
        memberId: data.member_id,
        eventId: data.event_id,
        key: data.preference_key,
        value: data.preference_value,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('[Preferences tRPC] Error in get:', error);
      throw error;
    }
  });

const setProcedure = publicProcedure
  .input(z.object({
    memberId: z.string().optional(),
    eventId: z.string().optional(),
    key: z.string(),
    value: z.any(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Preferences tRPC] Setting preference:', input.key);
      
      const { data, error } = await ctx.supabase
        .from('user_preferences')
        .upsert({
          member_id: input.memberId || null,
          event_id: input.eventId || null,
          preference_key: input.key,
          preference_value: input.value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'member_id,event_id,preference_key'
        })
        .select()
        .single();

      if (error) {
        console.error('[Preferences tRPC] Error setting preference:', error);
        throw new Error(`Failed to set preference: ${error.message}`);
      }

      console.log('[Preferences tRPC] Set preference:', data.preference_key);
      return {
        id: data.id,
        memberId: data.member_id,
        eventId: data.event_id,
        key: data.preference_key,
        value: data.preference_value,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('[Preferences tRPC] Error in set:', error);
      throw error;
    }
  });

const deleteProcedure = publicProcedure
  .input(z.object({
    memberId: z.string().optional(),
    eventId: z.string().optional(),
    key: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Preferences tRPC] Deleting preference:', input.key);
      
      let query = ctx.supabase
        .from('user_preferences')
        .delete()
        .eq('preference_key', input.key);
      
      if (input.memberId) {
        query = query.eq('member_id', input.memberId);
      }
      if (input.eventId) {
        query = query.eq('event_id', input.eventId);
      }
      
      const { error } = await query;

      if (error) {
        console.error('[Preferences tRPC] Error deleting preference:', error);
        throw new Error(`Failed to delete preference: ${error.message}`);
      }

      console.log('[Preferences tRPC] Deleted preference');
      return { success: true };
    } catch (error) {
      console.error('[Preferences tRPC] Error in delete:', error);
      throw error;
    }
  });

export default createTRPCRouter({
  getAll: getAllProcedure,
  get: getProcedure,
  set: setProcedure,
  delete: deleteProcedure,
});
