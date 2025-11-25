import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";

const playerSchema = z.object({
  name: z.string(),
  handicap: z.number(),
  scores: z.array(z.number()),
  totalScore: z.number(),
  strokesReceived: z.number().optional(),
  strokeMode: z.enum(['manual', 'auto', 'all-but-par3']).optional(),
  teamId: z.union([z.literal(1), z.literal(2)]).optional(),
  strokesUsed: z.array(z.number()).optional(),
});

const gameSchema = z.object({
  id: z.string(),
  courseName: z.string(),
  coursePar: z.number(),
  holePars: z.array(z.number()),
  strokeIndices: z.array(z.number()).optional(),
  players: z.array(playerSchema),
  createdAt: z.string(),
  status: z.enum(['in-progress', 'completed']),
  completedAt: z.string().optional(),
  gameType: z.enum(['individual-net', 'team-match-play']).optional(),
  matchPlayScoringType: z.enum(['best-ball', 'alternate-ball']).optional(),
  teamScores: z.object({ team1: z.number(), team2: z.number() }).optional(),
  holeResults: z.array(z.enum(['team1', 'team2', 'tie'])).optional(),
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
        strokeIndices: game.stroke_indices,
        players: game.players,
        createdAt: game.created_at,
        status: game.status,
        completedAt: game.completed_at,
        gameType: game.game_type,
        matchPlayScoringType: game.match_play_scoring_type,
        teamScores: game.team_scores,
        holeResults: game.hole_results,
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
    strokeIndices: z.array(z.number()).optional(),
    players: z.array(playerSchema),
    gameType: z.enum(['individual-net', 'team-match-play']).optional(),
    matchPlayScoringType: z.enum(['best-ball', 'alternate-ball']).optional(),
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
          stroke_indices: input.strokeIndices,
          players: input.players,
          status: 'in-progress',
          game_type: input.gameType || 'individual-net',
          match_play_scoring_type: input.matchPlayScoringType,
          team_scores: input.gameType === 'team-match-play' ? { team1: 0, team2: 0 } : null,
          hole_results: input.gameType === 'team-match-play' ? new Array(18).fill('tie') : null,
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
        strokeIndices: data.stroke_indices,
        players: data.players,
        createdAt: data.created_at,
        status: data.status,
        gameType: data.game_type,
        matchPlayScoringType: data.match_play_scoring_type,
        teamScores: data.team_scores,
        holeResults: data.hole_results,
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
    teamScores: z.object({ team1: z.number(), team2: z.number() }).optional(),
    holeResults: z.array(z.enum(['team1', 'team2', 'tie'])).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Games tRPC] Updating game:', input.gameId);
      
      const updateData: any = {};
      if (input.players) updateData.players = input.players;
      if (input.teamScores) updateData.team_scores = input.teamScores;
      if (input.holeResults) updateData.hole_results = input.holeResults;
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
        strokeIndices: data.stroke_indices,
        players: data.players,
        createdAt: data.created_at,
        status: data.status,
        completedAt: data.completed_at,
        gameType: data.game_type,
        matchPlayScoringType: data.match_play_scoring_type,
        teamScores: data.team_scores,
        holeResults: data.hole_results,
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
