import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Trophy } from 'lucide-react-native';
import { useGames } from '@/contexts/GamesContext';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalGamePlayer } from '@/types';
import { trpc } from '@/lib/trpc';
import * as WolfHelper from '@/utils/wolfHelper';

export default function GameScoringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { completeGame } = useGames();
  const { currentUser } = useAuth();

  const gameQuery = trpc.games.getAll.useQuery(
    { memberId: currentUser?.id || '' },
    { enabled: !!currentUser?.id, refetchInterval: false }
  );

  const game = useMemo(() => {
    if (gameQuery.data) {
      return gameQuery.data.find(g => g.id === gameId);
    }
    return undefined;
  }, [gameQuery.data, gameId]);
  const [currentHole, setCurrentHole] = useState<number>(1);
  const [holeScores, setHoleScores] = useState<{ [playerIndex: number]: { [hole: number]: number } }>({});
  const [strokesUsedOnHole, setStrokesUsedOnHole] = useState<{ [playerIndex: number]: boolean }>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);
  const [wolfPartner, setWolfPartner] = useState<number | null>(null);
  const [isLoneWolf, setIsLoneWolf] = useState<boolean>(false);
  const [isQuad, setIsQuad] = useState<boolean>(false);

  const updateGameMutation = trpc.games.update.useMutation();

  const allComplete = useMemo(() => {
    if (!game) return false;
    return game.players.every((_: PersonalGamePlayer, playerIndex: number) => {
      if (playerIndex < 0) return false;
      const playerScores = holeScores[playerIndex] || {};
      const scoredHoles = Object.keys(playerScores).filter(hole => playerScores[Number(hole)] > 0);
      return scoredHoles.length === 18;
    });
  }, [game, holeScores]);
  
  const isTeamMatchPlay = game?.gameType === 'team-match-play';
  const isWolf = game?.gameType === 'wolf';

  useEffect(() => {
    if (game && !initialLoadDone) {
      const scoresMap: { [playerIndex: number]: { [hole: number]: number } } = {};
      
      game.players.forEach((player: PersonalGamePlayer, playerIndex: number) => {
        scoresMap[playerIndex] = {};
        player.scores.forEach((score: number, holeIndex: number) => {
          if (score > 0) {
            scoresMap[playerIndex][holeIndex + 1] = score;
          }
        });
      });
      
      setHoleScores(scoresMap);
      setInitialLoadDone(true);
      console.log('[GameScoring] Initial load - Loaded scores:', scoresMap);
    }
  }, [game, initialLoadDone]);

  useEffect(() => {
    if (game) {
      const strokesMap: { [playerIndex: number]: boolean } = {};
      game.players.forEach((player: PersonalGamePlayer, playerIndex: number) => {
        if (player.strokesUsed && player.strokesUsed[currentHole - 1] === 1) {
          strokesMap[playerIndex] = true;
        }
      });
      setStrokesUsedOnHole(strokesMap);
    }
  }, [game, currentHole]);

  const handlePreviousHole = async () => {
    await saveCurrentHoleScores();
    setCurrentHole(prev => {
      if (prev === 1) return 18;
      return prev - 1;
    });
  };

  const handleNextHole = async () => {
    await saveCurrentHoleScores();
    setCurrentHole(prev => {
      if (prev === 18) return 1;
      return prev + 1;
    });
  };

  const calculateHoleResult = useCallback((): 'team1' | 'team2' | 'tie' => {
    if (!game || game.gameType !== 'team-match-play') return 'tie';

    const team1Players = game.players.filter((p: PersonalGamePlayer) => p.teamId === 1);
    const team2Players = game.players.filter((p: PersonalGamePlayer) => p.teamId === 2);

    const team1NetScores = team1Players
      .map((player: PersonalGamePlayer) => {
        const playerIndex = game.players.findIndex((p: PersonalGamePlayer) => p === player);
        if (playerIndex < 0 || playerIndex >= game.players.length) return 0;
        if (currentHole < 1 || currentHole > 18) return 0;
        const grossScore = holeScores[playerIndex]?.[currentHole] || 0;
        if (grossScore === 0) return 0;
        const receivesStroke = shouldPlayerReceiveStrokeOnHole(player, playerIndex, currentHole - 1);
        return receivesStroke ? grossScore - 1 : grossScore;
      })
      .filter((s: number) => s > 0);

    const team2NetScores = team2Players
      .map((player: PersonalGamePlayer) => {
        const playerIndex = game.players.findIndex((p: PersonalGamePlayer) => p === player);
        if (playerIndex < 0 || playerIndex >= game.players.length) return 0;
        if (currentHole < 1 || currentHole > 18) return 0;
        const grossScore = holeScores[playerIndex]?.[currentHole] || 0;
        if (grossScore === 0) return 0;
        const receivesStroke = shouldPlayerReceiveStrokeOnHole(player, playerIndex, currentHole - 1);
        return receivesStroke ? grossScore - 1 : grossScore;
      })
      .filter((s: number) => s > 0);

    if (team1NetScores.length === 0 || team2NetScores.length === 0) {
      return 'tie';
    }

    if (game.matchPlayScoringType === 'best-ball') {
      const team1Best = Math.min(...team1NetScores);
      const team2Best = Math.min(...team2NetScores);
      
      if (team1Best < team2Best) return 'team1';
      if (team2Best < team1Best) return 'team2';
      return 'tie';
    } else {
      team1NetScores.sort((a: number, b: number) => a - b);
      team2NetScores.sort((a: number, b: number) => a - b);

      const hasAnyTie = team1NetScores.some((score: number, idx: number) => score === team2NetScores[idx]);
      
      if (hasAnyTie) {
        const remainingTeam1 = team1NetScores.filter((score: number, idx: number) => score !== team2NetScores[idx]);
        const remainingTeam2 = team2NetScores.filter((score: number, idx: number) => score !== team1NetScores[idx]);
        
        if (remainingTeam1.length === 0 || remainingTeam2.length === 0) {
          return 'tie';
        }
        
        const team1Best = Math.min(...remainingTeam1);
        const team2Best = Math.min(...remainingTeam2);
        
        if (team1Best < team2Best) return 'team1';
        if (team2Best < team1Best) return 'team2';
      } else {
        const team1Best = Math.min(...team1NetScores);
        const team2Best = Math.min(...team2NetScores);
        
        if (team1Best < team2Best) return 'team1';
        if (team2Best < team1Best) return 'team2';
      }
      
      return 'tie';
    }
  }, [game, currentHole, holeScores, shouldPlayerReceiveStrokeOnHole]);

  const buildUpdateData = useCallback((includeWolfPoints: boolean = false) => {
    if (!game) return null;

    const updatedPlayers = game.players.map((player: PersonalGamePlayer, playerIndex: number) => {
      const playerScores = holeScores[playerIndex] || {};
      const scores = Array.from({ length: 18 }, (_, i) => playerScores[i + 1] || 0);
      
      const strokesUsed = player.strokesUsed ? [...player.strokesUsed] : new Array(18).fill(0);
      if (currentHole >= 1 && currentHole <= 18) {
        strokesUsed[currentHole - 1] = strokesUsedOnHole[playerIndex] ? 1 : 0;
      }
      
      let wolfPoints = player.wolfPoints || 0;
      if (includeWolfPoints && isWolf) {
        wolfPoints = WolfHelper.getTotalWolfPoints(playerIndex, game, holeScores, shouldPlayerReceiveStrokeOnHole);
      }
      
      return {
        ...player,
        scores,
        totalScore: scores.reduce((sum: number, score: number) => sum + score, 0),
        strokesUsed,
        ...(includeWolfPoints && { wolfPoints }),
      };
    });

    let updateData: any = { gameId, players: updatedPlayers };

    if (game.gameType === 'team-match-play' && currentHole >= 1 && currentHole <= 18) {
      const holeResults = game.holeResults || new Array(18).fill('tie');
      holeResults[currentHole - 1] = calculateHoleResult();
      
      const team1Wins = holeResults.filter((r: string) => r === 'team1').length;
      const team2Wins = holeResults.filter((r: string) => r === 'team2').length;
      
      updateData.holeResults = holeResults;
      updateData.teamScores = { team1: team1Wins, team2: team2Wins };
    }

    return updateData;
  }, [game, gameId, holeScores, currentHole, strokesUsedOnHole, isWolf, calculateHoleResult, shouldPlayerReceiveStrokeOnHole]);

  const saveScoresAndUpdateResult = async () => {
    if (!game || isSaving) return;

    setIsSaving(true);
    try {
      const updateData = buildUpdateData(false);
      if (!updateData) return;

      await updateGameMutation.mutateAsync(updateData);
      await gameQuery.refetch();
      console.log('[GameScoring] Auto-calculated and saved team score for hole', currentHole);
    } catch (error) {
      console.error('[GameScoring] Error auto-saving scores:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const saveCurrentHoleScores = async () => {
    if (!game || isSaving) return;

    try {
      const updateData = buildUpdateData(false);
      if (!updateData) return;

      await updateGameMutation.mutateAsync(updateData);
      await gameQuery.refetch();
      console.log('[GameScoring] Auto-saved scores for hole', currentHole);
    } catch (error) {
      console.error('[GameScoring] Error auto-saving scores:', error);
    }
  };

  const handleScoreChange = async (playerIndex: number, delta: number) => {
    if (!game || playerIndex < 0 || playerIndex >= game.players.length) return;
    if (currentHole < 1 || currentHole > 18) return;

    const holePar = game.holePars[currentHole - 1];
    const currentScore = holeScores[playerIndex]?.[currentHole] || 0;
    
    let newScore: number;
    if (currentScore === 0) {
      newScore = holePar + delta;
    } else {
      newScore = currentScore + delta;
    }
    newScore = Math.max(1, newScore);

    const updatedScores = {
      ...holeScores,
      [playerIndex]: {
        ...(holeScores[playerIndex] || {}),
        [currentHole]: newScore,
      },
    };

    setHoleScores(updatedScores);

    if (game.gameType === 'team-match-play') {
      const allPlayersHaveScores = game.players.every((_: PersonalGamePlayer, idx: number) => {
        const score = updatedScores[idx]?.[currentHole];
        return score && score > 0;
      });

      if (allPlayersHaveScores) {
        setTimeout(() => {
          saveScoresAndUpdateResult();
        }, 300);
      }
    }
  };

  const handleSetPar = async (playerIndex: number) => {
    if (!game || playerIndex < 0 || playerIndex >= game.players.length) return;
    if (currentHole < 1 || currentHole > 18) return;

    const holePar = game.holePars[currentHole - 1];
    const currentScore = holeScores[playerIndex]?.[currentHole] || 0;

    let updatedScores: { [playerIndex: number]: { [hole: number]: number } };
    if (currentScore === holePar) {
      updatedScores = { ...holeScores };
      if (updatedScores[playerIndex]) {
        updatedScores[playerIndex] = { ...updatedScores[playerIndex] };
        delete updatedScores[playerIndex][currentHole];
      }
      setHoleScores(updatedScores);
    } else {
      updatedScores = {
        ...holeScores,
        [playerIndex]: {
          ...(holeScores[playerIndex] || {}),
          [currentHole]: holePar,
        },
      };
      setHoleScores(updatedScores);

      if (game.gameType === 'team-match-play') {
        const allPlayersHaveScores = game.players.every((_: PersonalGamePlayer, idx: number) => {
          const score = updatedScores[idx]?.[currentHole];
          return score && score > 0;
        });

        if (allPlayersHaveScores) {
          setTimeout(() => {
            saveScoresAndUpdateResult();
          }, 300);
        }
      }
    }
  };

  const getNetScore = useCallback((playerIndex: number): number => {
    if (!game || playerIndex < 0 || playerIndex >= game.players.length) return 0;
    if (currentHole < 1 || currentHole > 18) return 0;

    const grossScore = holeScores[playerIndex]?.[currentHole] || 0;
    if (grossScore === 0) return 0;
    
    const player = game.players[playerIndex];
    if (!player) return grossScore;
    
    const receivesStroke = shouldPlayerReceiveStrokeOnHole(player, playerIndex, currentHole - 1);
    return receivesStroke ? grossScore - 1 : grossScore;
  }, [game, currentHole, holeScores, shouldPlayerReceiveStrokeOnHole]);

  const getTotalScore = useCallback((playerIndex: number): number => {
    if (playerIndex < 0) return 0;
    const playerScores = holeScores[playerIndex] || {};
    return Object.values(playerScores).reduce((sum, score) => sum + score, 0);
  }, [holeScores]);

  const isPlayerScoringComplete = useCallback((playerIndex: number): boolean => {
    if (playerIndex < 0) return false;
    const playerScores = holeScores[playerIndex] || {};
    const scoredHoles = Object.keys(playerScores).filter(hole => playerScores[Number(hole)] > 0);
    return scoredHoles.length === 18;
  }, [holeScores]);

  const calculateWolfPointsForHole = useCallback((hole: number): { [playerIndex: number]: number } => {
    if (!game || !isWolf) return {};
    return WolfHelper.calculateWolfPointsForHole(hole, game, holeScores, shouldPlayerReceiveStrokeOnHole);
  }, [game, isWolf, holeScores, shouldPlayerReceiveStrokeOnHole]);

  const getWolfPointsWonForCurrentHole = useCallback((): { [playerIndex: number]: number } => {
    return calculateWolfPointsForHole(currentHole);
  }, [calculateWolfPointsForHole, currentHole]);

  const getTotalWolfPoints = useCallback((playerIndex: number): number => {
    if (!isWolf || !game || playerIndex < 0 || playerIndex >= game.players.length) return 0;
    return WolfHelper.getTotalWolfPoints(playerIndex, game, holeScores, shouldPlayerReceiveStrokeOnHole);
  }, [isWolf, game, holeScores, shouldPlayerReceiveStrokeOnHole]);

  const getHoleByHolePoints = useCallback((playerIndex: number): { [hole: number]: number } => {
    if (!isWolf || !game || playerIndex < 0 || playerIndex >= game.players.length) return {};
    return WolfHelper.getHoleByHolePoints(playerIndex, game, holeScores, shouldPlayerReceiveStrokeOnHole);
  }, [isWolf, game, holeScores, shouldPlayerReceiveStrokeOnHole]);

  const handleSaveAllScores = async () => {
    if (!game || isSaving) return;

    setIsSaving(true);
    try {
      const updateData = buildUpdateData(true);
      if (!updateData) return;

      await updateGameMutation.mutateAsync(updateData);
      await gameQuery.refetch();

      console.log('[GameScoring] Saved all scores');
      Alert.alert('Success', 'All scores have been saved!');
    } catch (error) {
      console.error('[GameScoring] Error saving scores:', error);
      Alert.alert('Error', 'Failed to save scores');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteGame = () => {
    if (!game) return;

    const allPlayersScored = game.players.every((p: PersonalGamePlayer) => {
      return p.scores.some((s: number) => s > 0);
    });

    if (!allPlayersScored) {
      Alert.alert(
        'Incomplete Scores',
        'Some players have not started scoring. Complete the game anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            onPress: async () => {
              await completeGame(gameId);
              router.push(`/(game)/${gameId}/scorecard` as any);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Complete Game',
        'Mark this game as completed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            onPress: async () => {
              await completeGame(gameId);
              router.push(`/(game)/${gameId}/scorecard` as any);
            },
          },
        ]
      );
    }
  };



  const currentWolfPlayerIndex = useMemo(() => {
    if (!isWolf || !game) return -1;
    return WolfHelper.determineCurrentWolf(currentHole, game, holeScores, shouldPlayerReceiveStrokeOnHole);
  }, [isWolf, game, currentHole, holeScores, shouldPlayerReceiveStrokeOnHole]);

  const sortedPlayersForWolf = useMemo(() => {
    if (!isWolf || !game || currentWolfPlayerIndex === -1) return game?.players || [];
    
    const players = game.players.map((p: PersonalGamePlayer, idx: number) => ({ player: p, idx }));
    const nonWolfPlayers = players.filter(({ idx }: { idx: number }) => idx !== currentWolfPlayerIndex);
    const wolfPlayer = players.find(({ idx }: { idx: number }) => idx === currentWolfPlayerIndex);
    
    if (wolfPlayer) {
      return [...nonWolfPlayers.map((p: { player: PersonalGamePlayer }) => p.player), wolfPlayer.player];
    }
    return players.map((p: { player: PersonalGamePlayer }) => p.player);
  }, [isWolf, game, currentWolfPlayerIndex]);

  const currentWolfPartnership = useMemo(() => {
    if (!isWolf || !game || !game.wolfPartnerships) return null;
    return game.wolfPartnerships[currentHole.toString()] || null;
  }, [isWolf, game, currentHole]);

  useEffect(() => {
    if (isWolf && currentWolfPartnership) {
      setWolfPartner(currentWolfPartnership.partnerPlayerIndex);
      setIsLoneWolf(currentWolfPartnership.isLoneWolf);
      setIsQuad(currentWolfPartnership.isQuad || false);
    } else {
      setWolfPartner(null);
      setIsLoneWolf(false);
      setIsQuad(false);
    }
  }, [isWolf, currentWolfPartnership]);

  const handleWolfPartnerSelect = async (playerIndex: number) => {
    if (!isWolf || playerIndex === currentWolfPlayerIndex) return;
    
    if (wolfPartner === playerIndex) {
      setWolfPartner(null);
      setIsLoneWolf(false);
    } else {
      setWolfPartner(playerIndex);
      setIsLoneWolf(false);
    }
  };

  const handleToggleSolo = async () => {
    if (!isWolf || !game) return;
    
    const newIsLoneWolf = !isLoneWolf;
    setIsLoneWolf(newIsLoneWolf);
    if (newIsLoneWolf) {
      setWolfPartner(null);
    }
    
    const updatedWolfPartnerships = { ...(game.wolfPartnerships || {}) };
    updatedWolfPartnerships[currentHole.toString()] = {
      wolfPlayerIndex: currentWolfPlayerIndex,
      partnerPlayerIndex: newIsLoneWolf ? null : wolfPartner,
      isLoneWolf: newIsLoneWolf,
      isQuad: currentHole >= 16 ? isQuad : false,
    };

    try {
      await updateGameMutation.mutateAsync({
        gameId,
        wolfPartnerships: updatedWolfPartnerships,
      });
      await gameQuery.refetch();
      console.log('[GameScoring] Saved wolf partnership (solo toggle) for hole', currentHole);
    } catch (error) {
      console.error('[GameScoring] Error saving wolf partnership (solo toggle):', error);
    }
  };

  const handleToggleQuad = async () => {
    if (!isWolf || currentHole < 16 || !game) return;
    
    const newIsQuad = !isQuad;
    setIsQuad(newIsQuad);
    
    const updatedWolfPartnerships = { ...(game.wolfPartnerships || {}) };
    updatedWolfPartnerships[currentHole.toString()] = {
      wolfPlayerIndex: currentWolfPlayerIndex,
      partnerPlayerIndex: wolfPartner,
      isLoneWolf,
      isQuad: newIsQuad,
    };

    try {
      await updateGameMutation.mutateAsync({
        gameId,
        wolfPartnerships: updatedWolfPartnerships,
      });
      await gameQuery.refetch();
      console.log('[GameScoring] Saved wolf partnership (quad toggle) for hole', currentHole);
    } catch (error) {
      console.error('[GameScoring] Error saving wolf partnership (quad toggle):', error);
    }
  };

  const savewolfPartnership = async () => {
    if (!game || !isWolf) return;

    const updatedWolfPartnerships = { ...(game.wolfPartnerships || {}) };
    updatedWolfPartnerships[currentHole.toString()] = {
      wolfPlayerIndex: currentWolfPlayerIndex,
      partnerPlayerIndex: wolfPartner,
      isLoneWolf,
      isQuad: currentHole >= 16 ? isQuad : false,
    };

    try {
      await updateGameMutation.mutateAsync({
        gameId,
        wolfPartnerships: updatedWolfPartnerships,
      });
      await gameQuery.refetch();
      console.log('[GameScoring] Saved wolf partnership for hole', currentHole);
    } catch (error) {
      console.error('[GameScoring] Error saving wolf partnership:', error);
    }
  };

  useEffect(() => {
    if (isWolf && wolfPartner !== null && !isLoneWolf) {
      savewolfPartnership();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wolfPartner]);

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Game not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{game.courseName}</Text>
          <Text style={styles.headerSubtitle}>
            {isTeamMatchPlay ? 'Team Match Play' : isWolf ? 'Wolf' : 'Individual Net'} • Par {game.coursePar}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteGame}
        >
          <Check size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isTeamMatchPlay && game.teamScores && (
        <View style={styles.matchPlayScoreboard}>
          <View style={styles.teamScoreBox}>
            <Text style={styles.teamLabel}>Team 1</Text>
            <Text style={styles.teamScore}>{game.teamScores.team1}</Text>
          </View>
          <View style={styles.matchPlayDivider}>
            <Trophy size={20} color="#FFD700" />
          </View>
          <View style={styles.teamScoreBox}>
            <Text style={styles.teamLabel}>Team 2</Text>
            <Text style={styles.teamScore}>{game.teamScores.team2}</Text>
          </View>
        </View>
      )}

      {isWolf && (
        <View style={styles.wolfPointsHeader}>
          <Text style={styles.wolfPointsHeaderTitle}>Wolf Points</Text>
          <View style={styles.wolfPointsGrid}>
            {game.players.map((player: PersonalGamePlayer, idx: number) => {
              const totalPoints = getTotalWolfPoints(idx);
              return (
                <View key={idx} style={styles.wolfPointsPlayerBox}>
                  <Text style={styles.wolfPointsPlayerName} numberOfLines={1}>{player.name}</Text>
                  <Text style={styles.wolfPointsPlayerTotal}>{String(totalPoints)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {isTeamMatchPlay && game.holeResults && (() => {
        if (!game.holeResults) return null;
        
        const hasAnyScores = game.players.some((player: PersonalGamePlayer, idx: number) => {
          const score = holeScores[idx]?.[currentHole];
          return score && score > 0;
        });
        const isTie = game.holeResults[currentHole - 1] === 'tie';
        const showGreenTie = isTie && hasAnyScores;
        const holeResult = game.holeResults[currentHole - 1];
        
        return (
          <View style={styles.holeResultIndicator}>
            <Text style={styles.holeResultLabel}>Hole {currentHole} Result:</Text>
            <View style={[
              styles.holeResultBadge,
              holeResult === 'team1' && styles.holeResultTeam1,
              holeResult === 'team2' && styles.holeResultTeam2,
              isTie && (showGreenTie ? styles.holeResultTieActive : styles.holeResultTie),
            ]}>
              <Text style={styles.holeResultText}>
                {holeResult === 'team1' ? 'Team 1 Wins' : holeResult === 'team2' ? 'Team 2 Wins' : 'Tie'}
              </Text>
            </View>
          </View>
        );
      })()}

      <View style={styles.holeNavigator}>
        <TouchableOpacity style={styles.holeNavBtn} onPress={handlePreviousHole}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.holeIndicator}>
          <Text style={styles.holeLabel}>HOLE</Text>
          <Text style={styles.holeNumber}>{currentHole}</Text>
          {game.strokeIndices && game.strokeIndices.length === 18 && (
            <View style={styles.strokeIndexContainer}>
              <Text style={styles.strokeIndexLabel}>{game.strokeIndices[currentHole - 1]}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.holeNavBtn} onPress={handleNextHole}>
          <ChevronRight size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isTeamMatchPlay ? (
          <>
            {[1, 2].map(teamId => {
              const teamPlayers = game.players
                .map((player: PersonalGamePlayer, idx: number) => ({ player, idx }))
                .filter(({ player }: { player: PersonalGamePlayer; idx: number }) => player.teamId === teamId);
              
              return (
                <View key={teamId} style={styles.teamSection}>
                  <View style={[
                    styles.teamHeader,
                    teamId === 1 ? styles.team1Header : styles.team2Header,
                  ]}>
                    <Text style={styles.teamHeaderText}>Team {teamId}</Text>
                  </View>
                  
                  {teamPlayers.map(({ player, idx: playerIndex }: { player: PersonalGamePlayer; idx: number }) => {
                    const currentScore = holeScores[playerIndex]?.[currentHole] || 0;
                    const totalScore = getTotalScore(playerIndex);
                    const holePar = game.holePars[currentHole - 1];
                    const hasScore = currentScore > 0;
                    const isScoringComplete = isPlayerScoringComplete(playerIndex);
                    const netScore = getNetScore(playerIndex);
                    const strokeUsed = strokesUsedOnHole[playerIndex] || false;

                    return (
                      <View key={playerIndex} style={styles.playerCard}>
                        <View style={styles.playerHeader}>
                          <View style={styles.playerInfo}>
                            <Text style={styles.playerName}>{player.name}</Text>
                            <View style={styles.playerStats}>
                              <Text style={styles.playerHandicap}>HDC: {player.handicap}</Text>
                              {player.strokesReceived && player.strokesReceived > 0 && (
                                <Text style={styles.playerStrokes}>
                                  • Strokes: {player.strokesReceived}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.totalScoreBox}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalScore}>{totalScore > 0 ? totalScore : 0}</Text>
                          </View>
                        </View>

                        <View style={styles.scoreControls}>
                          <TouchableOpacity
                            style={styles.minusButton}
                            onPress={() => handleScoreChange(playerIndex, -1)}
                          >
                            <Text style={styles.buttonSymbol}>−</Text>
                          </TouchableOpacity>

                          <View style={styles.scoreDisplayContainer}>
                            <TouchableOpacity 
                              style={[styles.scoreDisplay, isScoringComplete && styles.scoreDisplayComplete]}
                              onPress={() => handleSetPar(playerIndex)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.scoreValue, hasScore && styles.scoreValueActive]}>
                                {hasScore ? currentScore : holePar}
                              </Text>
                            </TouchableOpacity>
                            {hasScore && netScore !== currentScore && (
                              <Text style={styles.netScoreLabel}>Net: {netScore}</Text>
                            )}
                          </View>

                          <TouchableOpacity
                            style={styles.plusButton}
                            onPress={() => handleScoreChange(playerIndex, 1)}
                          >
                            <Text style={styles.buttonSymbol}>+</Text>
                          </TouchableOpacity>
                        </View>

                        {player.strokesReceived && player.strokesReceived > 0 && (() => {
                          const strokeMode = player.strokeMode || 'manual';
                          const receivesStroke = shouldPlayerReceiveStrokeOnHole(player, playerIndex, currentHole - 1);
                          
                          if (strokeMode === 'manual') {
                            return (
                              <TouchableOpacity
                                style={[styles.strokeButton, strokeUsed && styles.strokeButtonActive]}
                                onPress={() => toggleStroke(playerIndex)}
                              >
                                <Text style={[styles.strokeButtonText, strokeUsed && styles.strokeButtonTextActive]}>
                                  {strokeUsed ? '✓ Stroke Used' : 'Use Stroke'}
                                </Text>
                              </TouchableOpacity>
                            );
                          } else {
                            return (
                              <View style={[styles.strokeIndicator, receivesStroke && styles.strokeIndicatorActive]}>
                                <Text style={[styles.strokeIndicatorText, receivesStroke && styles.strokeIndicatorTextActive]}>
                                  {receivesStroke ? '✓ Stroke Applied' : 'No Stroke'}
                                </Text>
                              </View>
                            );
                          }
                        })()}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
        ) : isWolf ? (
          sortedPlayersForWolf.map((player: PersonalGamePlayer) => {
            const playerIndex = game.players.findIndex((p: PersonalGamePlayer) => p.name === player.name);
            const currentScore = holeScores[playerIndex]?.[currentHole] || 0;
            const totalScore = getTotalScore(playerIndex);
            const holePar = game.holePars[currentHole - 1];
            const hasScore = currentScore > 0;
            const isScoringComplete = isPlayerScoringComplete(playerIndex);
            const isCurrentWolf = playerIndex === currentWolfPlayerIndex;
            const isPartner = wolfPartner === playerIndex;

            const allScoresEntered = game.players.every((_: PersonalGamePlayer, idx: number) => {
              const score = holeScores[idx]?.[currentHole];
              return score && score > 0;
            });
            const pointsWon = allScoresEntered ? getWolfPointsWonForCurrentHole()[playerIndex] || 0 : 0;
            const isOtherTeam = !isCurrentWolf && !isPartner && wolfPartner !== null;
            const netScore = getNetScore(playerIndex);
            const receivesStroke = shouldPlayerReceiveStrokeOnHole(player, playerIndex, currentHole - 1);

            return (
              <View key={playerIndex}>
                <TouchableOpacity
                  style={[
                    styles.playerCard,
                    isCurrentWolf && styles.wolfCard,
                    isPartner && styles.partnerCard,
                    isOtherTeam && styles.otherTeamCard,
                  ]}
                  onPress={() => !isCurrentWolf && handleWolfPartnerSelect(playerIndex)}
                  activeOpacity={isCurrentWolf ? 1 : 0.7}
                  disabled={isCurrentWolf}
                >
                  <View style={styles.playerHeader}>
                    <View style={styles.playerInfo}>
                      <View style={styles.playerNameRow}>
                        <Text style={styles.playerName}>{player.name}</Text>
                        {isCurrentWolf && <Text style={styles.wolfBadge}>WOLF</Text>}
                        {isPartner && <Text style={styles.partnerBadge}>PARTNER</Text>}
                        {pointsWon > 0 && allScoresEntered && (
                          <Text style={styles.pointsWonBadge}>+{pointsWon}</Text>
                        )}
                      </View>
                      <View style={styles.playerStats}>
                        <Text style={styles.playerHandicap}>HDC: {player.handicap}</Text>
                        {player.strokesReceived && player.strokesReceived > 0 && (
                          <Text style={styles.playerStrokes}>
                            • Strokes: {player.strokesReceived} a side
                          </Text>
                        )}
                      </View>
                      {isWolf && (
                        <View style={styles.playerPointsRow}>
                          <Text style={styles.playerWolfPointsLabel}>
                            Points Earned: <Text style={styles.playerWolfPointsValue}>{String(getTotalWolfPoints(playerIndex))}</Text>
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.totalScoreBox}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalScore}>{totalScore > 0 ? totalScore : 0}</Text>
                    </View>
                  </View>

                  <View style={styles.scoreControls}>
                    <TouchableOpacity
                      style={styles.minusButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleScoreChange(playerIndex, -1);
                      }}
                    >
                      <Text style={styles.buttonSymbol}>−</Text>
                    </TouchableOpacity>

                    <View style={styles.scoreDisplayContainer}>
                      <TouchableOpacity 
                        style={[styles.scoreDisplay, isScoringComplete && styles.scoreDisplayComplete]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleSetPar(playerIndex);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.scoreValue, hasScore && styles.scoreValueActive]}>
                          {hasScore ? currentScore : holePar}
                        </Text>
                      </TouchableOpacity>
                      {hasScore && netScore !== currentScore && (
                        <Text style={styles.netScoreLabel}>Net: {netScore}</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.plusButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleScoreChange(playerIndex, 1);
                      }}
                    >
                      <Text style={styles.buttonSymbol}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {player.strokesReceived && player.strokesReceived > 0 && receivesStroke && (
                    <View style={[styles.strokeHoleIndicator, receivesStroke && styles.strokeHoleIndicatorActive]}>
                      <Text style={[styles.strokeHoleIndicatorText, receivesStroke && styles.strokeHoleIndicatorTextActive]}>
                        Stroke Hole
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {isCurrentWolf && (
                  <>
                    <TouchableOpacity
                      style={[styles.soloButton, isLoneWolf && styles.soloButtonActive]}
                      onPress={handleToggleSolo}
                    >
                      <Text style={[styles.soloButtonText, isLoneWolf && styles.soloButtonTextActive]}>
                        {isLoneWolf ? (isQuad ? '✓ Going Solo (16 pts)' : '✓ Going Solo (4 pts)') : 'Go Solo'}
                      </Text>
                    </TouchableOpacity>
                    {currentHole >= 16 && (
                      <TouchableOpacity
                        style={[styles.quadButton, isQuad && styles.quadButtonActive]}
                        onPress={handleToggleQuad}
                      >
                        <Text style={[styles.quadButtonText, isQuad && styles.quadButtonTextActive]}>
                          {isQuad ? '✓ Quad Active (4x)' : 'Activate Quad (4x)'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            );
          })
        ) : (
          game.players.map((player: PersonalGamePlayer, playerIndex: number) => {
            const currentScore = holeScores[playerIndex]?.[currentHole] || 0;
            const totalScore = getTotalScore(playerIndex);
            const holePar = game.holePars[currentHole - 1];
            const hasScore = currentScore > 0;
            const isScoringComplete = isPlayerScoringComplete(playerIndex);

            return (
              <View key={playerIndex} style={styles.playerCard}>
                <View style={styles.playerHeader}>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerHandicap}>HDC: {player.handicap}</Text>
                  </View>
                  <View style={styles.totalScoreBox}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalScore}>{totalScore > 0 ? totalScore : 0}</Text>
                  </View>
                </View>

                <View style={styles.scoreControls}>
                  <TouchableOpacity
                    style={styles.minusButton}
                    onPress={() => handleScoreChange(playerIndex, -1)}
                  >
                    <Text style={styles.buttonSymbol}>−</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.scoreDisplay, isScoringComplete && styles.scoreDisplayComplete]}
                    onPress={() => handleSetPar(playerIndex)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.scoreValue, hasScore && styles.scoreValueActive]}>
                      {hasScore ? currentScore : holePar}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.plusButton}
                    onPress={() => handleScoreChange(playerIndex, 1)}
                  >
                    <Text style={styles.buttonSymbol}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {isWolf && (
          <View style={styles.pointsBreakdownSection}>
            <Text style={styles.pointsBreakdownTitle}>Points Breakdown (Hole-by-Hole)</Text>
            {game.players.map((player: PersonalGamePlayer, idx: number) => {
              const holePoints = getHoleByHolePoints(idx);
              const totalPoints = getTotalWolfPoints(idx);
              if (Object.keys(holePoints).length === 0) return null;
              return (
                <View key={idx} style={styles.pointsBreakdownCard}>
                  <View style={styles.pointsBreakdownHeader}>
                    <Text style={styles.pointsBreakdownPlayerName}>{player.name}</Text>
                    <Text style={styles.pointsBreakdownTotal}>Total: {String(totalPoints)}</Text>
                  </View>
                  <View style={styles.pointsBreakdownHoles}>
                    {Object.entries(holePoints).map(([hole, points]) => (
                      <View key={hole} style={styles.pointsBreakdownHole}>
                        <Text style={styles.pointsBreakdownHoleNumber}>H{hole}</Text>
                        <Text style={styles.pointsBreakdownHolePoints}>+{String(points)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {allComplete && (
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveAllScores}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'SAVE ALL SCORES'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#d1d5db',
  },
  completeButton: {
    backgroundColor: '#1B5E20',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchPlayScoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  teamScoreBox: {
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 2,
  },
  teamScore: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  matchPlayDivider: {
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  holeNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#ADD8E6',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  holeNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeIndicator: {
    alignItems: 'center',
  },
  holeLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 1,
  },
  holeNumber: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  strokeIndexContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  strokeIndexLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#666',
  },
  strokeIndexHelpText: {
    fontSize: 8,
    fontWeight: '500' as const,
    color: '#999',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  teamSection: {
    marginBottom: 6,
  },
  teamHeader: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  team1Header: {
    backgroundColor: '#2196F3',
  },
  team2Header: {
    backgroundColor: '#FF9800',
  },
  teamHeaderText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
  },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  playerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerHandicap: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#999',
  },
  playerStrokes: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#1B5E20',
  },
  totalScoreBox: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#666',
  },
  totalScore: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  scoreControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  minusButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#d32f2f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSymbol: {
    fontSize: 26,
    fontWeight: '400' as const,
    color: '#fff',
  },
  scoreDisplayContainer: {
    alignItems: 'center',
  },
  scoreDisplay: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDisplayComplete: {
    backgroundColor: '#ff9800',
    borderColor: '#ff9800',
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#ccc',
  },
  scoreValueActive: {
    color: '#2196F3',
  },
  netScoreLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#1B5E20',
    marginTop: 3,
  },
  strokeButton: {
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#1B5E20',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  strokeButtonActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#1B5E20',
  },
  strokeButtonText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#666',
  },
  strokeButtonTextActive: {
    color: '#1B5E20',
  },
  saveButton: {
    backgroundColor: '#1B5E20',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  bottomPadding: {
    height: 16,
  },
  holeResultIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  holeResultLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#666',
  },
  holeResultBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  holeResultTeam1: {
    backgroundColor: '#2196F3',
  },
  holeResultTeam2: {
    backgroundColor: '#FF9800',
  },
  holeResultTie: {
    backgroundColor: '#9E9E9E',
  },
  holeResultTieActive: {
    backgroundColor: '#4CAF50',
  },
  holeResultText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  strokeIndicator: {
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  strokeIndicatorActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#1B5E20',
  },
  strokeIndicatorText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#999',
  },
  strokeIndicatorTextActive: {
    color: '#1B5E20',
  },
  strokeHoleIndicator: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: '#2e7d32',
    borderWidth: 1.5,
    borderColor: '#1B5E20',
    alignSelf: 'center',
  },
  strokeHoleIndicatorActive: {
    backgroundColor: '#2e7d32',
    borderColor: '#1B5E20',
  },
  strokeHoleIndicatorText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
  },
  strokeHoleIndicatorTextActive: {
    color: '#fff',
  },
  wolfCard: {
    backgroundColor: '#fffbea',
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  partnerCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  wolfBadge: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#fff',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  partnerBadge: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#fff',
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playerPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  playerWolfPointsLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#666',
  },
  playerWolfPointsValue: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#f59e0b',
  },
  pointsWonBadge: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#fff',
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  otherTeamCard: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
  },
  soloButton: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#f59e0b',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  soloButtonActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  soloButtonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#f59e0b',
  },
  soloButtonTextActive: {
    color: '#b45309',
  },
  quadButton: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#dc2626',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  quadButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  quadButtonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#dc2626',
  },
  quadButtonTextActive: {
    color: '#991b1b',
  },
  wolfPointsHeader: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  wolfPointsHeaderTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  wolfPointsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  wolfPointsPlayerBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  wolfPointsPlayerName: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 3,
  },
  wolfPointsPlayerTotal: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#f59e0b',
  },
  pointsBreakdownSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  pointsBreakdownTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  pointsBreakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  pointsBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pointsBreakdownPlayerName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  pointsBreakdownTotal: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#f59e0b',
  },
  pointsBreakdownHoles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pointsBreakdownHole: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
    minWidth: 42,
  },
  pointsBreakdownHoleNumber: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 1,
  },
  pointsBreakdownHolePoints: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#10b981',
  },
});
