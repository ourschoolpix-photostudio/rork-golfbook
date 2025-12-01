import { useMemo, useCallback, createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { PersonalGame } from '@/types';
import { supabase } from '@/integrations/supabase/client';
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
    front9Bet: number;
    back9Bet: number;
    overallBet: number;
    potBet: number;
    potPlayers: { name: string; handicap: number; memberId?: string }[];
    useHandicaps: boolean;
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

  const [games, setGames] = useState<PersonalGame[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchGames = useCallback(async () => {
    if (!isUserLoggedIn) return;
    
    try {
      setIsLoading(true);
      console.log('⏳ [GamesContext] Loading games from Supabase...');
      
      const { data, error } = await supabase
        .from('personal_games')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [GamesContext] Failed to fetch games:', error);
        return;
      }

      console.log('✅ [GamesContext] Successfully fetched games:', data?.length || 0);
      setGames(data || []);
    } catch (error) {
      console.error('❌ [GamesContext] Exception fetching games:', error);
    } finally {
      setIsLoading(false);
    }
  }, [memberId, isUserLoggedIn]);

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
      gameData.wolfPartnerships = {};
    }

    const { data, error } = await supabase
      .from('personal_games')
      .insert([gameData])
      .select()
      .single();

    if (error) {
      console.error('❌ [GamesContext] Failed to create game:', error);
      throw error;
    }

    console.log('[GamesContext] Created game:', data.id);
    await fetchGames();
    console.log('[GamesContext] Refetched games after creation');
    return data.id;
  }, [memberId, fetchGames]);

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

    const { error } = await supabase
      .from('personal_games')
      .update({ players: updatedPlayers })
      .eq('id', gameId);

    if (error) {
      console.error('❌ [GamesContext] Failed to update scores:', error);
      throw error;
    }

    console.log('[GamesContext] Updated scores for game:', gameId);
    await fetchGames();
  }, [games, fetchGames]);

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
    const updateData: any = { gameId };
    if (updates.courseName) updateData.courseName = updates.courseName;
    if (updates.coursePar) updateData.coursePar = updates.coursePar;
    if (updates.holePars) updateData.holePars = updates.holePars;
    if (updates.players) updateData.players = updates.players;
    if (updates.gameType) updateData.gameType = updates.gameType;
    if (updates.matchPlayScoringType) updateData.matchPlayScoringType = updates.matchPlayScoringType;
    if (updates.strokeIndices) updateData.strokeIndices = updates.strokeIndices;
    if (updates.dollarAmount !== undefined) updateData.dollarAmount = updates.dollarAmount;
    if (updates.front9Bet !== undefined) updateData.front9Bet = updates.front9Bet;
    if (updates.back9Bet !== undefined) updateData.back9Bet = updates.back9Bet;
    if (updates.overallBet !== undefined) updateData.overallBet = updates.overallBet;
    if (updates.potBet !== undefined) updateData.potBet = updates.potBet;
    if (updates.potPlayers) updateData.potPlayers = updates.potPlayers;
    if (updates.useHandicaps !== undefined) updateData.useHandicaps = updates.useHandicaps;

    const { error } = await supabase
      .from('personal_games')
      .update(updateData)
      .eq('id', gameId);

    if (error) {
      console.error('❌ [GamesContext] Failed to update game:', error);
      throw error;
    }

    console.log('[GamesContext] Updated game:', gameId);
    await fetchGames();
  }, [fetchGames]);

  const completeGame = useCallback(async (gameId: string) => {
    const { error } = await supabase
      .from('personal_games')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (error) {
      console.error('❌ [GamesContext] Failed to complete game:', error);
      throw error;
    }

    console.log('[GamesContext] Completed game:', gameId);
    await fetchGames();
  }, [fetchGames]);

  const deleteGame = useCallback(async (gameId: string) => {
    const { error } = await supabase
      .from('personal_games')
      .delete()
      .eq('id', gameId);

    if (error) {
      console.error('❌ [GamesContext] Failed to delete game:', error);
      throw error;
    }

    console.log('[GamesContext] Deleted game:', gameId);
    await fetchGames();
  }, [fetchGames]);



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
