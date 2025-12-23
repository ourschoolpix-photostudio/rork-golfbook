import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { PersonalGame } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';

export const [GamesProvider, useGames] = createContextHook(() => {
  const { currentUser } = useAuth();
  const { orgInfo } = useSettings();
  const useLocalStorage = orgInfo?.useLocalStorage || false;
  const memberId = currentUser?.id || '';

  const [games, setGames] = useState<PersonalGame[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchGames = useCallback(async () => {
    if (!memberId) {
      setGames([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      if (useLocalStorage) {
        console.log('📥 [GamesContext] Fetching games from local storage...');
        const fetchedGames = await localStorageService.games.getAll(memberId);
        console.log('✅ [GamesContext] Successfully fetched games from local storage:', fetchedGames.length);
        setGames(fetchedGames);
      } else {
        console.log('📥 [GamesContext] Fetching games from Supabase...');
        const { data, error } = await supabase
          .from('personal_games')
          .select('*')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const fetchedGames = (data || []).map((g: any) => ({
          id: g.id,
          memberId: g.member_id,
          courseName: g.course_name,
          coursePar: g.course_par,
          holePars: g.hole_pars,
          strokeIndices: g.stroke_indices,
          players: g.players,
          status: g.status,
          createdAt: g.created_at,
          completedAt: g.completed_at,
          gameType: g.game_type,
          matchPlayScoringType: g.match_play_scoring_type,
          dollarAmount: g.dollar_amount,
          front9Bet: g.front_9_bet,
          back9Bet: g.back_9_bet,
          overallBet: g.overall_bet,
          potBet: g.pot_bet,
          potPlayers: g.pot_players,
          useHandicaps: g.use_handicaps,
          wolfOrder: g.wolf_order,
        }));
        
        console.log('✅ [GamesContext] Successfully fetched games:', fetchedGames.length);
        setGames(fetchedGames);
      }
    } catch (error) {
      console.error('❌ [GamesContext] Failed to fetch games:', error instanceof Error ? error.message : JSON.stringify(error));
      console.log('📥 [GamesContext] Falling back to local storage');
      
      try {
        const fallbackGames = await localStorageService.games.getAll(memberId);
        console.log('✅ [GamesContext] Successfully fetched games from local storage fallback:', fallbackGames.length);
        setGames(fallbackGames);
      } catch (fallbackError) {
        console.error('❌ [GamesContext] Fallback also failed:', fallbackError instanceof Error ? fallbackError.message : JSON.stringify(fallbackError));
        setGames([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [memberId, useLocalStorage]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const createGame = useCallback(async (
    courseName: string,
    coursePar: number,
    holePars: number[],
    players: { name: string; handicap: number; strokesReceived?: number; strokeMode?: 'manual' | 'auto' | 'all-but-par3'; teamId?: 1 | 2; memberId?: string }[],
    gameType?: 'individual-net' | 'team-match-play' | 'wolf' | 'niners',
    matchPlayScoringType?: 'best-ball' | 'alternate-ball',
    strokeIndices?: number[],
    dollarAmount?: number,
    front9Bet?: number,
    back9Bet?: number,
    overallBet?: number,
    potBet?: number,
    potPlayers?: { name: string; handicap: number; memberId?: string }[],
    useHandicaps?: boolean
  ): Promise<string> => {
    if (!memberId) {
      throw new Error('User must be logged in to create a game');
    }

    const gameData: any = {
      memberId,
      courseName,
      coursePar,
      holePars,
      strokeIndices,
      players: players.map(p => ({
        name: p.name,
        handicap: p.handicap,
        scores: new Array(18).fill(0),
        totalScore: 0,
        strokesReceived: p.strokesReceived || 0,
        strokeMode: p.strokeMode || 'manual',
        teamId: p.teamId,
        strokesUsed: new Array(18).fill(0),
        wolfPoints: gameType === 'wolf' || gameType === 'niners' ? 0 : undefined,
        memberId: p.memberId,
      })),
      gameType: gameType || 'individual-net',
      matchPlayScoringType,
      dollarAmount,
      front9Bet,
      back9Bet,
      overallBet,
      potBet,
      potPlayers,
      useHandicaps: useHandicaps !== undefined ? useHandicaps : true,
    };

    if (gameType === 'wolf') {
      gameData.wolfOrder = players.map((_, idx) => idx);
    }

    try {
      console.log('➕ [GamesContext] Creating game:', courseName);
      let result;
      
      if (useLocalStorage) {
        const newGame = {
          id: `game-${Date.now()}`,
          status: 'in-progress' as const,
          createdAt: new Date().toISOString(),
          ...gameData,
        };
        result = await localStorageService.games.create(newGame);
      } else {
        const { data, error } = await supabase.from('personal_games').insert({
          member_id: gameData.memberId,
          course_name: gameData.courseName,
          course_par: gameData.coursePar,
          hole_pars: gameData.holePars,
          stroke_indices: gameData.strokeIndices,
          players: gameData.players,
          status: 'in-progress',
          game_type: gameData.gameType,
          match_play_scoring_type: gameData.matchPlayScoringType,
          dollar_amount: gameData.dollarAmount,
          front_9_bet: gameData.front9Bet,
          back_9_bet: gameData.back9Bet,
          overall_bet: gameData.overallBet,
          pot_bet: gameData.potBet,
          pot_players: gameData.potPlayers,
          use_handicaps: gameData.useHandicaps,
          wolf_order: gameData.wolfOrder,
        }).select().single();
        
        if (error) throw error;
        result = { id: data.id };
      }
      
      console.log('✅ [GamesContext] Game created:', result.id);
      await fetchGames();
      return result.id;
    } catch (error) {
      console.error('❌ [GamesContext] Failed to create game:', error instanceof Error ? error.message : JSON.stringify(error));
      throw error;
    }
  }, [memberId, fetchGames, useLocalStorage]);

  const updateGameScores = useCallback(async (
    gameId: string,
    playerIndex: number,
    scores: number[]
  ) => {
    const game = games.find(g => g.id === gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      scores,
      totalScore: scores.reduce((sum, score) => sum + score, 0),
    };

    try {
      console.log('✏️ [GamesContext] Updating scores for game:', gameId);
      
      if (useLocalStorage) {
        await localStorageService.games.update(gameId, { players: updatedPlayers });
      } else {
        const { error } = await supabase
          .from('personal_games')
          .update({ players: updatedPlayers })
          .eq('id', gameId);
        
        if (error) throw error;
      }
      
      console.log('✅ [GamesContext] Scores updated successfully');
      await fetchGames();
    } catch (error) {
      console.error('❌ [GamesContext] Failed to update scores:', error instanceof Error ? error.message : JSON.stringify(error));
      throw error;
    }
  }, [games, fetchGames, useLocalStorage]);

  const updateGame = useCallback(async (gameId: string, updates: Partial<{
    courseName: string;
    coursePar: number;
    holePars: number[];
    players: any[];
    gameType: 'individual-net' | 'team-match-play' | 'wolf' | 'niners';
    matchPlayScoringType: 'best-ball' | 'alternate-ball';
    strokeIndices: number[];
    dollarAmount: number;
    front9Bet: number;
    back9Bet: number;
    overallBet: number;
    potBet: number;
    potPlayers: { name: string; handicap: number; memberId?: string }[];
    useHandicaps: boolean;
  }>) => {
    try {
      console.log('✏️ [GamesContext] Updating game:', gameId);
      
      if (useLocalStorage) {
        await localStorageService.games.update(gameId, updates);
      } else {
        const supabaseUpdates: any = {};
        if (updates.courseName) supabaseUpdates.course_name = updates.courseName;
        if (updates.coursePar) supabaseUpdates.course_par = updates.coursePar;
        if (updates.holePars) supabaseUpdates.hole_pars = updates.holePars;
        if (updates.players) supabaseUpdates.players = updates.players;
        if (updates.gameType) supabaseUpdates.game_type = updates.gameType;
        if (updates.matchPlayScoringType) supabaseUpdates.match_play_scoring_type = updates.matchPlayScoringType;
        if (updates.strokeIndices) supabaseUpdates.stroke_indices = updates.strokeIndices;
        if (updates.dollarAmount !== undefined) supabaseUpdates.dollar_amount = updates.dollarAmount;
        if (updates.front9Bet !== undefined) supabaseUpdates.front_9_bet = updates.front9Bet;
        if (updates.back9Bet !== undefined) supabaseUpdates.back_9_bet = updates.back9Bet;
        if (updates.overallBet !== undefined) supabaseUpdates.overall_bet = updates.overallBet;
        if (updates.potBet !== undefined) supabaseUpdates.pot_bet = updates.potBet;
        if (updates.potPlayers) supabaseUpdates.pot_players = updates.potPlayers;
        if (updates.useHandicaps !== undefined) supabaseUpdates.use_handicaps = updates.useHandicaps;
        
        const { error } = await supabase
          .from('personal_games')
          .update(supabaseUpdates)
          .eq('id', gameId);
        
        if (error) throw error;
      }
      
      console.log('✅ [GamesContext] Game updated successfully');
      await fetchGames();
    } catch (error) {
      console.error('❌ [GamesContext] Failed to update game:', error instanceof Error ? error.message : JSON.stringify(error));
      throw error;
    }
  }, [fetchGames, useLocalStorage]);

  const completeGame = useCallback(async (gameId: string) => {
    try {
      console.log('✅ [GamesContext] Completing game:', gameId);
      
      if (useLocalStorage) {
        await localStorageService.games.update(gameId, { 
          status: 'completed',
          completedAt: new Date().toISOString()
        });
      } else {
        const { error } = await supabase
          .from('personal_games')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', gameId);
        
        if (error) throw error;
      }
      
      console.log('✅ [GamesContext] Game completed successfully');
      await fetchGames();
    } catch (error) {
      console.error('❌ [GamesContext] Failed to complete game:', error instanceof Error ? error.message : JSON.stringify(error));
      throw error;
    }
  }, [fetchGames, useLocalStorage]);

  const deleteGame = useCallback(async (gameId: string) => {
    try {
      console.log('🗑️ [GamesContext] Deleting game:', gameId);
      
      if (useLocalStorage) {
        await localStorageService.games.delete(gameId);
      } else {
        const { error } = await supabase
          .from('personal_games')
          .delete()
          .eq('id', gameId);
        
        if (error) throw error;
      }
      
      console.log('✅ [GamesContext] Game deleted successfully');
      await fetchGames();
    } catch (error) {
      console.error('❌ [GamesContext] Failed to delete game:', error instanceof Error ? error.message : JSON.stringify(error));
      throw error;
    }
  }, [fetchGames, useLocalStorage]);

  const inProgressGames = useMemo(() => 
    games.filter(g => g.status === 'in-progress'),
    [games]
  );

  const completedGames = useMemo(() => 
    games.filter(g => g.status === 'completed').sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return timeB - timeA;
    }),
    [games]
  );

  const getGame = useCallback((gameId: string): PersonalGame | undefined => {
    return games.find(g => g.id === gameId);
  }, [games]);

  return {
    games,
    inProgressGames,
    completedGames,
    isLoading,
    createGame,
    updateGame,
    updateGameScores,
    completeGame,
    deleteGame,
    getGame,
  };
});
