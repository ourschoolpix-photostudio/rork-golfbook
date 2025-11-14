import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { PersonalGame } from '@/types';

const STORAGE_KEY = '@golf_personal_games';

export const [GamesProvider, useGames] = createContextHook(() => {
  const [games, setGames] = useState<PersonalGame[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PersonalGame[];
        console.log('[GamesContext] Loaded games:', parsed.length);
        setGames(parsed);
      }
    } catch (error) {
      console.error('[GamesContext] Error loading games:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGames = async (updatedGames: PersonalGame[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGames));
      console.log('[GamesContext] Saved games:', updatedGames.length);
    } catch (error) {
      console.error('[GamesContext] Error saving games:', error);
    }
  };

  const createGame = useCallback(async (
    courseName: string,
    coursePar: number,
    holePars: number[],
    players: { name: string; handicap: number }[]
  ): Promise<string> => {
    const gameId = `game-${Date.now()}`;
    const newGame: PersonalGame = {
      id: gameId,
      courseName,
      coursePar,
      holePars,
      players: players.map(p => ({
        name: p.name,
        handicap: p.handicap,
        scores: new Array(18).fill(0),
        totalScore: 0,
      })),
      createdAt: new Date().toISOString(),
      status: 'in-progress',
    };

    const updatedGames = [...games, newGame];
    setGames(updatedGames);
    await saveGames(updatedGames);
    console.log('[GamesContext] Created game:', gameId);
    return gameId;
  }, [games]);

  const updateGameScores = useCallback(async (
    gameId: string,
    playerIndex: number,
    scores: number[]
  ) => {
    const updatedGames = games.map(game => {
      if (game.id === gameId) {
        const updatedPlayers = [...game.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          scores,
          totalScore: scores.reduce((sum, score) => sum + score, 0),
        };
        return { ...game, players: updatedPlayers };
      }
      return game;
    });

    setGames(updatedGames);
    await saveGames(updatedGames);
    console.log('[GamesContext] Updated scores for game:', gameId);
  }, [games]);

  const completeGame = useCallback(async (gameId: string) => {
    const updatedGames = games.map(game => {
      if (game.id === gameId) {
        return {
          ...game,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
        };
      }
      return game;
    });

    setGames(updatedGames);
    await saveGames(updatedGames);
    console.log('[GamesContext] Completed game:', gameId);
  }, [games]);

  const deleteGame = useCallback(async (gameId: string) => {
    const updatedGames = games.filter(g => g.id !== gameId);
    setGames(updatedGames);
    await saveGames(updatedGames);
    console.log('[GamesContext] Deleted game:', gameId);
  }, [games]);

  const getGame = useCallback((gameId: string): PersonalGame | undefined => {
    return games.find(g => g.id === gameId);
  }, [games]);

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
