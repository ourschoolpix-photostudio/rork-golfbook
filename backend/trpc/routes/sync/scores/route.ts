import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const scoreSchema = z.object({
  eventId: z.string(),
  memberId: z.string(),
  day: z.number(),
  holes: z.array(z.number()),
  totalScore: z.number().optional(),
  submittedBy: z.string().optional(),
});

export const submitScoreProcedure = publicProcedure
  .input(scoreSchema)
  .mutation(async ({ input }) => {
    console.log('🔄 Submitting score to Supabase...', input.memberId, input.day);
    
    const scoreToUpsert = {
      id: `${input.eventId}-${input.memberId}-${input.day}`,
      event_id: input.eventId,
      member_id: input.memberId,
      day: input.day,
      holes: input.holes,
      total_score: input.totalScore,
      submitted_by: input.submittedBy,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('scores')
      .upsert(scoreToUpsert, { onConflict: 'event_id,member_id,day' });

    if (error) {
      console.error('❌ Error submitting score:', error);
      throw new Error(`Failed to submit score: ${error.message}`);
    }

    console.log('✅ Score submitted successfully');
    return { success: true };
  });

export const getScoresProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .query(async ({ input }) => {
    console.log('📥 Fetching scores from Supabase...', input.eventId);
    
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('event_id', input.eventId);

    if (error) {
      console.error('❌ Error fetching scores:', error);
      throw new Error(`Failed to fetch scores: ${error.message}`);
    }

    const scores = (data || []).map(s => ({
      id: s.id,
      eventId: s.event_id,
      memberId: s.member_id,
      day: s.day,
      holes: s.holes as number[],
      totalScore: s.total_score,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      submittedBy: s.submitted_by,
    }));

    console.log('✅ Fetched scores:', scores.length);
    return scores;
  });

export const getPlayerScoreProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
    memberId: z.string(),
    day: z.number(),
  }))
  .query(async ({ input }) => {
    console.log('📥 Fetching player score...', input.memberId, input.day);
    
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('event_id', input.eventId)
      .eq('member_id', input.memberId)
      .eq('day', input.day)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching score:', error);
      throw new Error(`Failed to fetch score: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      eventId: data.event_id,
      memberId: data.member_id,
      day: data.day,
      holes: data.holes as number[],
      totalScore: data.total_score,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      submittedBy: data.submitted_by,
    };
  });

export const deleteScoresProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('🗑️ Deleting all scores for event:', input.eventId);
    
    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('event_id', input.eventId);

    if (error) {
      console.error('❌ Error deleting scores:', error);
      throw new Error(`Failed to delete scores: ${error.message}`);
    }

    console.log('✅ All scores deleted successfully');
    return { success: true };
  });

export default {
  submit: submitScoreProcedure,
  getAll: getScoresProcedure,
  getPlayer: getPlayerScoreProcedure,
  deleteAll: deleteScoresProcedure,
};
