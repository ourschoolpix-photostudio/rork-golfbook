import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import type { Grouping } from "@/types";

const groupingSchema = z.object({
  day: z.number(),
  hole: z.number(),
  slots: z.array(z.string().nullable()),
});

export const syncGroupingsProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
    groupings: z.array(groupingSchema),
    syncedBy: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('🔄 Syncing groupings to Supabase...', input.eventId);
    
    const groupingsToUpsert = input.groupings.map(g => ({
      id: `${input.eventId}-${g.day}-${g.hole}`,
      event_id: input.eventId,
      day: g.day,
      hole: g.hole,
      slots: g.slots,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('groupings')
      .upsert(groupingsToUpsert, { onConflict: 'event_id,day,hole' });

    if (error) {
      console.error('❌ Error syncing groupings:', error);
      throw new Error(`Failed to sync groupings: ${error.message}`);
    }

    const { error: syncError } = await supabase
      .from('sync_status')
      .upsert({
        id: `groupings-${input.eventId}`,
        entity_type: 'groupings',
        entity_id: input.eventId,
        last_synced_at: new Date().toISOString(),
        synced_by: input.syncedBy,
        sync_version: Date.now(),
      }, { onConflict: 'entity_type,entity_id' });

    if (syncError) {
      console.error('❌ Error updating sync status:', syncError);
    }

    console.log('✅ Groupings synced successfully');
    return { success: true, count: input.groupings.length };
  });

export const getGroupingsProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .query(async ({ input }) => {
    console.log('📥 Fetching groupings from Supabase...', input.eventId);
    
    const { data, error } = await supabase
      .from('groupings')
      .select('*')
      .eq('event_id', input.eventId)
      .order('day')
      .order('hole');

    if (error) {
      console.error('❌ Error fetching groupings:', error);
      throw new Error(`Failed to fetch groupings: ${error.message}`);
    }

    const groupings: Grouping[] = (data || []).map(g => ({
      day: g.day,
      hole: g.hole,
      slots: g.slots as (string | null)[],
    }));

    console.log('✅ Fetched groupings:', groupings.length);
    return groupings;
  });

export default {
  sync: syncGroupingsProcedure,
  get: getGroupingsProcedure,
};
