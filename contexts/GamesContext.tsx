import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback } from 'react';
import { PersonalGame } from '@/types';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export const [GamesProvider, useGames] = createContextHook(() => {
  const { currentUser } = useAuth();

  const gamesQuery = trpc.games.getAll.useQuery(
    { memberId: currentUser?.id || '' },
    { enabled: !!currentUser?.id }
  );

  const createGameMutation = trpc.games.create.useMutation({
    onSuccess: async () => {
      await gamesQuery.refetch();
    },
  });

  const updateGameMutation = trpc.games.update.useMutation({
    onSuccess: () => {
      gamesQuery.refetch();
    },
  });

  const deleteGameMutation = trpc.games.delete.useMutation({
    onSuccess: () => {
      gamesQuery.refetch();
    },
  });

  const createGame = useCallback(async (
    courseName: string,
    coursePar: number,
    holePars: number[],
    players: { name: string; handicap: number; strokesReceived?: number; strokeMode?: 'manual' | 'auto' | 'all-but-par3'; teamId?: 1 | 2 }[],
    gameType?: 'individual-net' | 'team-match-play' | 'wolf' | 'niners',
    matchPlayScoringType?: 'best-ball' | 'alternate-ball',
    strokeIndices?: number[]
  ): Promise<string> => {
    if (!currentUser?.id) {
      throw new Error('User must be logged in to create a game');
    }

    const gameData: any = {
      memberId: currentUser.id,
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
        wolfPoints: gameType === 'wolf' ? 0 : undefined,
      })),
      gameType: gameType || 'individual-net',
      matchPlayScoringType,
    };

    if (gameType === 'wolf') {
      gameData.wolfOrder = players.map((_, idx) => idx);
      gameData.wolfPartnerships = {};
    }

    const result = await createGameMutation.mutateAsync(gameData);
    console.log('[GamesContext] Created game:', result.id);
    await gamesQuery.refetch();
    console.log('[GamesContext] Refetched games after creation');
    return result.id;
  }, [currentUser, createGameMutation, gamesQuery]);

  const updateGameScores = useCallback(async (
    gameId: string,
    playerIndex: number,
    scores: number[]
  ) => {
    const game = gamesQuery.data?.find(g => g.id === gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      scores,
      totalScore: scores.reduce((sum, score) => sum + score, 0),
    };

    await updateGameMutation.mutateAsync({
      gameId,
      players: updatedPlayers,
    });
    console.log('[GamesContext] Updated scores for game:', gameId);
  }, [gamesQuery.data, updateGameMutation]);

  const completeGame = useCallback(async (gameId: string) => {
    await updateGameMutation.mutateAsync({
      gameId,
      status: 'completed',
    });
    console.log('[GamesContext] Completed game:', gameId);
  }, [updateGameMutation]);

  const deleteGame = useCallback(async (gameId: string) => {
    await deleteGameMutation.mutateAsync({ gameId });
    console.log('[GamesContext] Deleted game:', gameId);
  }, [deleteGameMutation]);

  const getGame = useCallback((gameId: string): PersonalGame | undefined => {
    return gamesQuery.data?.find(g => g.id === gameId);
  }, [gamesQuery.data]);

  const games = gamesQuery.data || [];
  const isLoading = gamesQuery.isLoading;

  const inProgressGames = useMemo(() => {
    return games.filter(g => g.status === 'in-progress');
  }, [games]);

  const completedGames = useMemo(() => {
    return games.filter(g => g.status === 'completed').sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [games]);

  return useMemo(() => ({
    games,
    inProgressGames,
    completedGames,
    isLoading,
    createGame,
    updateGameScores,
    completeGame,
    deleteGame,
    getGame,
  }), [games, inProgressGames, completedGames, isLoading, createGame, updateGameScores, completeGame, deleteGame, getGame]);
});
