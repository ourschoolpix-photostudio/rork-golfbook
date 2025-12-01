import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { PersonalGame } from '@/types';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';

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
        console.log('📥 [GamesContext] Fetching games via tRPC...');
        const fetchedGames = await trpcClient.games.getAll.query({ memberId });
        console.log('✅ [GamesContext] Successfully fetched games:', fetchedGames.length);
        setGames(fetchedGames);
      }
    } catch (error) {
      console.error('❌ [GamesContext] Failed to fetch games:', error);
      console.log('📥 [GamesContext] Falling back to local storage');
      
      try {
        const fallbackGames = await localStorageService.games.getAll(memberId);
        console.log('✅ [GamesContext] Successfully fetched games from local storage fallback:', fallbackGames.length);
        setGames(fallbackGames);
      } catch (fallbackError) {
        console.error('❌ [GamesContext] Fallback also failed:', fallbackError);
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
        result = await trpcClient.games.create.mutate(gameData);
      }
      
      console.log('✅ [GamesContext] Game created:', result.id);
      await fetchGames();
      return result.id;
    } catch (error) {
      console.error('❌ [GamesContext] Failed to create game:', error);
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
        await trpcClient.games.update.mutate({ gameId, players: updatedPlayers });
      }
      
      console.log('✅ [GamesContext] Scores updated successfully');
      await fetchGames();
    } catch (error) {
      console.error('❌ [GamesContext] Failed to update scores:', error);
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
        await trpcClient.games.update.mutate({ gameId, ...updates });
      }
      
      console.log('✅ [GamesContext] Game updated successfully');
      await fetchGames();
    } catch (error) {
      console.error('❌ [GamesContext] Failed to update game:', error);
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
        await trpcClient.games.update.mutate({ gameId, status: 'completed' });
      }
      
      console.log('✅ [GamesContext] Game completed successfully');
      await fetchGames();
    } catch (error) {
      console.error('❌ [GamesContext] Failed to complete game:', error);
      throw error;
    }
  }, [fetchGames, useLocalStorage]);

  const deleteGame = useCallback(async (gameId: string) => {
    try {
      console.log('🗑️ [GamesContext] Deleting game:', gameId);
      
      if (useLocalStorage) {
        await localStorageService.games.delete(gameId);
      } else {
        await trpcClient.games.delete.mutate({ gameId });
      }
      
      console.log('✅ [GamesContext] Game deleted successfully');
      await fetchGames();
    } catch (error) {
      console.error('❌ [GamesContext] Failed to delete game:', error);
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

  return useMemo(() => ({
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
  }), [games, inProgressGames, completedGames, isLoading, createGame, updateGame, updateGameScores, completeGame, deleteGame, getGame]);
});
