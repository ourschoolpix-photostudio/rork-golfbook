import { useMemo, useCallback, createContext, useContext, ReactNode } from 'react';
import { PersonalGame } from '@/types';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

type GamesContextType = {
  games: PersonalGame[];
  inProgressGames: PersonalGame[];
  completedGames: PersonalGame[];
  isLoading: boolean;
  createGame: (
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
  ) => Promise<string>;
  updateGame: (gameId: string, updates: Partial<{
    courseName: string;
    coursePar: number;
    holePars: number[];
    players: any[];
    gameType: 'individual-net' | 'team-match-play' | 'wolf' | 'niners';
    matchPlayScoringType: 'best-ball' | 'alternate-ball';
    strokeIndices: number[];
    dollarAmount: number;
  }>) => Promise<void>;
  updateGameScores: (gameId: string, playerIndex: number, scores: number[]) => Promise<void>;
  completeGame: (gameId: string) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  getGame: (gameId: string) => PersonalGame | undefined;
};

const GamesContext = createContext<GamesContextType | undefined>(undefined);

export function GamesProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const memberId = currentUser?.id || '';
  const isUserLoggedIn = !!currentUser?.id;

  const gamesQuery = trpc.games.getAll.useQuery(
    { memberId },
    { enabled: isUserLoggedIn }
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
      gameData.wolfPartnerships = {};
    }

    const result = await createGameMutation.mutateAsync(gameData);
    console.log('[GamesContext] Created game:', result.id);
    await gamesQuery.refetch();
    console.log('[GamesContext] Refetched games after creation');
    return result.id;
  }, [memberId, createGameMutation, gamesQuery]);

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

  const updateGame = useCallback(async (gameId: string, updates: Partial<{
    courseName: string;
    coursePar: number;
    holePars: number[];
    players: any[];
    gameType: 'individual-net' | 'team-match-play' | 'wolf' | 'niners';
    matchPlayScoringType: 'best-ball' | 'alternate-ball';
    strokeIndices: number[];
    dollarAmount: number;
  }>) => {
    const updateData: any = { gameId };
    if (updates.courseName) updateData.courseName = updates.courseName;
    if (updates.coursePar) updateData.coursePar = updates.coursePar;
    if (updates.holePars) updateData.holePars = updates.holePars;
    if (updates.players) updateData.players = updates.players;
    if (updates.gameType) updateData.gameType = updates.gameType;
    if (updates.matchPlayScoringType) updateData.matchPlayScoringType = updates.matchPlayScoringType;
    if (updates.strokeIndices) updateData.strokeIndices = updates.strokeIndices;
    if (updates.dollarAmount !== undefined) updateData.dollarAmount = updates.dollarAmount;

    await updateGameMutation.mutateAsync(updateData);
    console.log('[GamesContext] Updated game:', gameId);
  }, [updateGameMutation]);

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

  const games = useMemo(() => gamesQuery.data || [], [gamesQuery.data]);
  const isLoading = gamesQuery.isLoading;

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

  const value = useMemo(() => ({
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

  return (
    <GamesContext.Provider value={value}>
      {children}
    </GamesContext.Provider>
  );
}

export function useGames(): GamesContextType {
  const context = useContext(GamesContext);
  if (!context) {
    throw new Error('useGames must be used within GamesProvider');
  }
  return context;
}
