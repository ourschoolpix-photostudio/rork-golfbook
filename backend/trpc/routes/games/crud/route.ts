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
  wolfPoints: z.number().optional(),
});

const wolfPartnershipSchema = z.object({
  wolfPlayerIndex: z.number(),
  partnerPlayerIndex: z.number().nullable(),
  isLoneWolf: z.boolean(),
  isQuad: z.boolean().optional(),
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
  gameType: z.enum(['individual-net', 'team-match-play', 'wolf', 'niners']).optional(),
  matchPlayScoringType: z.enum(['best-ball', 'alternate-ball']).optional(),
  teamScores: z.object({ team1: z.number(), team2: z.number() }).optional(),
  holeResults: z.array(z.enum(['team1', 'team2', 'tie'])).optional(),
  wolfOrder: z.array(z.number()).optional(),
  wolfPartnerships: z.record(z.string(), wolfPartnershipSchema).optional(),
  wolfScores: z.record(z.string(), z.object({ players: z.array(z.number()) })).optional(),
  wolfRules: z.object({
    wolfGoesLast: z.boolean(),
    loneWolfMultiplier: z.number(),
    winningTeamPoints: z.number(),
    losingTeamPoints: z.number(),
    tiePoints: z.number(),
  }).optional(),
  dollarAmount: z.number().optional(),
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
        wolfOrder: game.wolf_order,
        wolfPartnerships: game.wolf_partnerships,
        wolfScores: game.wolf_scores,
        wolfRules: game.wolf_rules,
        dollarAmount: game.dollar_amount,
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
    gameType: z.enum(['individual-net', 'team-match-play', 'wolf', 'niners']).optional(),
    matchPlayScoringType: z.enum(['best-ball', 'alternate-ball']).optional(),
    wolfOrder: z.array(z.number()).optional(),
    dollarAmount: z.number().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Games tRPC] Creating game:', input.courseName);
      
      const insertData: any = {
        member_id: input.memberId,
        course_name: input.courseName,
        course_par: input.coursePar,
        hole_pars: input.holePars,
        stroke_indices: input.strokeIndices && input.strokeIndices.length > 0 ? input.strokeIndices : null,
        players: input.players,
        status: 'in-progress',
        game_type: input.gameType || 'individual-net',
        match_play_scoring_type: input.matchPlayScoringType,
        team_scores: input.gameType === 'team-match-play' ? { team1: 0, team2: 0 } : null,
        hole_results: input.gameType === 'team-match-play' ? new Array(18).fill('tie') : null,
        dollar_amount: input.dollarAmount,
      };

      if (input.gameType === 'wolf') {
        insertData.wolf_order = input.wolfOrder || [];
        insertData.wolf_partnerships = {};
        insertData.wolf_scores = {};
        insertData.wolf_rules = {
          wolfGoesLast: true,
          loneWolfMultiplier: 2,
          winningTeamPoints: 1,
          losingTeamPoints: -1,
          tiePoints: 0,
        };
      }

      const { data, error } = await ctx.supabase
        .from('personal_games')
        .insert(insertData)
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
        wolfOrder: data.wolf_order,
        wolfPartnerships: data.wolf_partnerships,
        wolfScores: data.wolf_scores,
        wolfRules: data.wolf_rules,
      };
    } catch (error) {
      console.error('[Games tRPC] Error in create:', error);
      throw error;
    }
  });

const updateProcedure = publicProcedure
  .input(z.object({
    gameId: z.string(),
    courseName: z.string().optional(),
    coursePar: z.number().optional(),
    holePars: z.array(z.number()).optional(),
    strokeIndices: z.array(z.number()).optional(),
    players: z.array(playerSchema).optional(),
    status: z.enum(['in-progress', 'completed']).optional(),
    gameType: z.enum(['individual-net', 'team-match-play', 'wolf', 'niners']).optional(),
    matchPlayScoringType: z.enum(['best-ball', 'alternate-ball']).optional(),
    teamScores: z.object({ team1: z.number(), team2: z.number() }).optional(),
    holeResults: z.array(z.enum(['team1', 'team2', 'tie'])).optional(),
    wolfOrder: z.array(z.number()).optional(),
    wolfPartnerships: z.record(z.string(), z.object({
      wolfPlayerIndex: z.number(),
      partnerPlayerIndex: z.number().nullable(),
      isLoneWolf: z.boolean(),
      isQuad: z.boolean().optional(),
    })).optional(),
    wolfScores: z.record(z.string(), z.object({ players: z.array(z.number()) })).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Games tRPC] Updating game:', input.gameId);
      
      const updateData: any = {};
      if (input.courseName) updateData.course_name = input.courseName;
      if (input.coursePar) updateData.course_par = input.coursePar;
      if (input.holePars) updateData.hole_pars = input.holePars;
      if (input.strokeIndices !== undefined) updateData.stroke_indices = input.strokeIndices.length > 0 ? input.strokeIndices : null;
      if (input.players) updateData.players = input.players;
      if (input.gameType) updateData.game_type = input.gameType;
      if (input.matchPlayScoringType) updateData.match_play_scoring_type = input.matchPlayScoringType;
      if (input.teamScores) updateData.team_scores = input.teamScores;
      if (input.holeResults) updateData.hole_results = input.holeResults;
      if (input.wolfOrder) updateData.wolf_order = input.wolfOrder;
      if (input.wolfPartnerships) updateData.wolf_partnerships = input.wolfPartnerships;
      if (input.wolfScores) updateData.wolf_scores = input.wolfScores;
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
        wolfOrder: data.wolf_order,
        wolfPartnerships: data.wolf_partnerships,
        wolfScores: data.wolf_scores,
        wolfRules: data.wolf_rules,
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
