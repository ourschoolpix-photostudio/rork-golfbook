import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";

const playerSchema = z.object({
  name: z.string(),
  handicap: z.number(),
  scores: z.array(z.number()),
  totalScore: z.number(),
});

const gameSchema = z.object({
  id: z.string(),
  courseName: z.string(),
  coursePar: z.number(),
  holePars: z.array(z.number()),
  players: z.array(playerSchema),
  createdAt: z.string(),
  status: z.enum(['in-progress', 'completed']),
  completedAt: z.string().optional(),
});

const getAllProcedure = publicProcedure
  .input(z.object({ memberId: z.string() }).optional())
  .query(async ({ ctx, input }) => {
    try {
      console.log('[Games tRPC] Getting all games for member:', input?.memberId);
      
      const query = input?.memberId
        ? ctx.supabase.from('personal_games').select('*').eq('member_id', input.memberId).order('created_at', { ascending: false })
        : ctx.supabase.from('personal_games').select('*').order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Games tRPC] Error fetching games:', error);
        throw new Error(`Failed to fetch games: ${error.message}`);
      }

      const games = data.map(game => ({
        id: game.id,
        courseName: game.course_name,
        coursePar: game.course_par,
        holePars: game.hole_pars,
        players: game.players,
        createdAt: game.created_at,
        status: game.status,
        completedAt: game.completed_at,
      }));

      console.log('[Games tRPC] Fetched games:', games.length);
      return games;
    } catch (error) {
      console.error('[Games tRPC] Error in getAll:', error);
      throw error;
    }
  });

const createProcedure = publicProcedure
  .input(z.object({
    memberId: z.string(),
    courseName: z.string(),
    coursePar: z.number(),
    holePars: z.array(z.number()),
    players: z.array(playerSchema),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Games tRPC] Creating game:', input.courseName);
      
      const { data, error } = await ctx.supabase
        .from('personal_games')
        .insert({
          member_id: input.memberId,
          course_name: input.courseName,
          course_par: input.coursePar,
          hole_pars: input.holePars,
          players: input.players,
          status: 'in-progress',
        })
        .select()
        .single();

      if (error) {
        console.error('[Games tRPC] Error creating game:', error);
        throw new Error(`Failed to create game: ${error.message}`);
      }

      console.log('[Games tRPC] Created game:', data.id);
      return {
        id: data.id,
        courseName: data.course_name,
        coursePar: data.course_par,
        holePars: data.hole_pars,
        players: data.players,
        createdAt: data.created_at,
        status: data.status,
      };
    } catch (error) {
      console.error('[Games tRPC] Error in create:', error);
      throw error;
    }
  });

const updateProcedure = publicProcedure
  .input(z.object({
    gameId: z.string(),
    players: z.array(playerSchema).optional(),
    status: z.enum(['in-progress', 'completed']).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Games tRPC] Updating game:', input.gameId);
      
      const updateData: any = {};
      if (input.players) updateData.players = input.players;
      if (input.status) {
        updateData.status = input.status;
        if (input.status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await ctx.supabase
        .from('personal_games')
        .update(updateData)
        .eq('id', input.gameId)
        .select()
        .single();

      if (error) {
        console.error('[Games tRPC] Error updating game:', error);
        throw new Error(`Failed to update game: ${error.message}`);
      }

      console.log('[Games tRPC] Updated game:', data.id);
      return {
        id: data.id,
        courseName: data.course_name,
        coursePar: data.course_par,
        holePars: data.hole_pars,
        players: data.players,
        createdAt: data.created_at,
        status: data.status,
        completedAt: data.completed_at,
      };
    } catch (error) {
      console.error('[Games tRPC] Error in update:', error);
      throw error;
    }
  });

const deleteProcedure = publicProcedure
  .input(z.object({ gameId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Games tRPC] Deleting game:', input.gameId);
      
      const { error } = await ctx.supabase
        .from('personal_games')
        .delete()
        .eq('id', input.gameId);

      if (error) {
        console.error('[Games tRPC] Error deleting game:', error);
        throw new Error(`Failed to delete game: ${error.message}`);
      }

      console.log('[Games tRPC] Deleted game:', input.gameId);
      return { success: true };
    } catch (error) {
      console.error('[Games tRPC] Error in delete:', error);
      throw error;
    }
  });

export default createTRPCRouter({
  getAll: getAllProcedure,
  create: createProcedure,
  update: updateProcedure,
  delete: deleteProcedure,
});
