import React, { useState, useEffect, useMemo } from 'react';
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

  const updateGameMutation = trpc.games.update.useMutation();

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

  const saveCurrentHoleScores = async () => {
    if (!game || isSaving) return;

    try {
      const updatedPlayers = game.players.map((player: PersonalGamePlayer, playerIndex: number) => {
        const playerScores = holeScores[playerIndex] || {};
        const scores = Array.from({ length: 18 }, (_, i) => playerScores[i + 1] || 0);
        
        const strokesUsed = player.strokesUsed ? [...player.strokesUsed] : new Array(18).fill(0);
        strokesUsed[currentHole - 1] = strokesUsedOnHole[playerIndex] ? 1 : 0;
        
        return {
          ...player,
          scores,
          totalScore: scores.reduce((sum: number, score: number) => sum + score, 0),
          strokesUsed,
        };
      });

      let updateData: any = { gameId, players: updatedPlayers };

      if (game.gameType === 'team-match-play') {
        const holeResults = game.holeResults || new Array(18).fill('tie');
        holeResults[currentHole - 1] = calculateHoleResult();
        
        const team1Wins = holeResults.filter((r: string) => r === 'team1').length;
        const team2Wins = holeResults.filter((r: string) => r === 'team2').length;
        
        updateData.holeResults = holeResults;
        updateData.teamScores = { team1: team1Wins, team2: team2Wins };
      }

      await updateGameMutation.mutateAsync(updateData);
      await gameQuery.refetch();
      console.log('[GameScoring] Auto-saved scores for hole', currentHole);
    } catch (error) {
      console.error('[GameScoring] Error auto-saving scores:', error);
    }
  };

  const handleScoreChange = (playerIndex: number, delta: number) => {
    if (!game) return;

    const holePar = game.holePars[currentHole - 1];
    const currentScore = holeScores[playerIndex]?.[currentHole] || 0;
    
    let newScore: number;
    if (currentScore === 0) {
      newScore = holePar + delta;
    } else {
      newScore = currentScore + delta;
    }
    newScore = Math.max(1, newScore);

    setHoleScores(prev => ({
      ...prev,
      [playerIndex]: {
        ...(prev[playerIndex] || {}),
        [currentHole]: newScore,
      },
    }));
  };

  const handleSetPar = (playerIndex: number) => {
    if (!game) return;

    const holePar = game.holePars[currentHole - 1];
    const currentScore = holeScores[playerIndex]?.[currentHole] || 0;

    if (currentScore === holePar) {
      setHoleScores(prev => {
        const newScores = { ...prev };
        if (newScores[playerIndex]) {
          newScores[playerIndex] = { ...newScores[playerIndex] };
          delete newScores[playerIndex][currentHole];
        }
        return newScores;
      });
    } else {
      setHoleScores(prev => ({
        ...prev,
        [playerIndex]: {
          ...(prev[playerIndex] || {}),
          [currentHole]: holePar,
        },
      }));
    }
  };

  const toggleStroke = (playerIndex: number) => {
    setStrokesUsedOnHole(prev => ({
      ...prev,
      [playerIndex]: !prev[playerIndex],
    }));
  };

  const getNetScore = (playerIndex: number): number => {
    const grossScore = holeScores[playerIndex]?.[currentHole] || 0;
    if (grossScore === 0) return 0;
    
    const strokeUsed = strokesUsedOnHole[playerIndex] || false;
    return strokeUsed ? grossScore - 1 : grossScore;
  };

  const calculateHoleResult = (): 'team1' | 'team2' | 'tie' => {
    if (!game || game.gameType !== 'team-match-play') return 'tie';

    const team1Players = game.players.filter((p: PersonalGamePlayer) => p.teamId === 1);
    const team2Players = game.players.filter((p: PersonalGamePlayer) => p.teamId === 2);

    const team1NetScores = team1Players
      .map((player: PersonalGamePlayer) => {
        const playerIndex = game.players.findIndex((p: PersonalGamePlayer) => p === player);
        return getNetScore(playerIndex);
      })
      .filter((s: number) => s > 0);

    const team2NetScores = team2Players
      .map((player: PersonalGamePlayer) => {
        const playerIndex = game.players.findIndex((p: PersonalGamePlayer) => p === player);
        return getNetScore(playerIndex);
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
  };

  const getTotalScore = (playerIndex: number): number => {
    const playerScores = holeScores[playerIndex] || {};
    return Object.values(playerScores).reduce((sum, score) => sum + score, 0);
  };

  const isPlayerScoringComplete = (playerIndex: number): boolean => {
    const playerScores = holeScores[playerIndex] || {};
    const scoredHoles = Object.keys(playerScores).filter(hole => playerScores[Number(hole)] > 0);
    return scoredHoles.length === 18;
  };

  const areAllPlayersComplete = (): boolean => {
    if (!game) return false;
    return game.players.every((_: PersonalGamePlayer, playerIndex: number) => isPlayerScoringComplete(playerIndex));
  };

  const handleSaveAllScores = async () => {
    if (!game || isSaving) return;

    setIsSaving(true);
    try {
      const updatedPlayers = game.players.map((player: PersonalGamePlayer, playerIndex: number) => {
        const playerScores = holeScores[playerIndex] || {};
        const scores = Array.from({ length: 18 }, (_, i) => playerScores[i + 1] || 0);
        
        const strokesUsed = new Array(18).fill(0);
        for (let i = 0; i < 18; i++) {
          if (player.strokesUsed && player.strokesUsed[i] === 1) {
            strokesUsed[i] = 1;
          }
        }
        if (strokesUsedOnHole[playerIndex] && currentHole) {
          strokesUsed[currentHole - 1] = 1;
        }
        
        return {
          ...player,
          scores,
          totalScore: scores.reduce((sum, score) => sum + score, 0),
          strokesUsed,
        };
      });

      let updateData: any = { gameId, players: updatedPlayers };

      if (game.gameType === 'team-match-play') {
        const holeResults = game.holeResults || new Array(18).fill('tie');
        holeResults[currentHole - 1] = calculateHoleResult();
        
        const team1Wins = holeResults.filter((r: string) => r === 'team1').length;
        const team2Wins = holeResults.filter((r: string) => r === 'team2').length;
        
        updateData.holeResults = holeResults;
        updateData.teamScores = { team1: team1Wins, team2: team2Wins };
      }

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

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Game not found</Text>
      </View>
    );
  }

  const allComplete = areAllPlayersComplete();
  const isTeamMatchPlay = game.gameType === 'team-match-play';

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
            {isTeamMatchPlay ? 'Team Match Play' : 'Individual Net'} • Par {game.coursePar}
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

      {isTeamMatchPlay && game.holeResults && (
        <View style={styles.holeResultIndicator}>
          <Text style={styles.holeResultLabel}>Hole {currentHole} Result:</Text>
          <View style={[
            styles.holeResultBadge,
            game.holeResults[currentHole - 1] === 'team1' && styles.holeResultTeam1,
            game.holeResults[currentHole - 1] === 'team2' && styles.holeResultTeam2,
            game.holeResults[currentHole - 1] === 'tie' && styles.holeResultTie,
          ]}>
            <Text style={styles.holeResultText}>
              {game.holeResults[currentHole - 1] === 'team1' && 'Team 1 Wins'}
              {game.holeResults[currentHole - 1] === 'team2' && 'Team 2 Wins'}
              {game.holeResults[currentHole - 1] === 'tie' && 'Tie'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.holeNavigator}>
        <TouchableOpacity style={styles.holeNavBtn} onPress={handlePreviousHole}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.holeIndicator}>
          <Text style={styles.holeLabel}>HOLE</Text>
          <Text style={styles.holeNumber}>{currentHole}</Text>
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

                        {player.strokesReceived && player.strokesReceived > 0 && (
                          <TouchableOpacity
                            style={[styles.strokeButton, strokeUsed && styles.strokeButtonActive]}
                            onPress={() => toggleStroke(playerIndex)}
                          >
                            <Text style={[styles.strokeButtonText, strokeUsed && styles.strokeButtonTextActive]}>
                              {strokeUsed ? '✓ Stroke Used' : 'Use Stroke'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  teamScoreBox: {
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 4,
  },
  teamScore: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  matchPlayDivider: {
    paddingHorizontal: 20,
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
    paddingVertical: 12,
    backgroundColor: '#ADD8E6',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  holeNavBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeIndicator: {
    alignItems: 'center',
  },
  holeLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 2,
  },
  holeNumber: {
    fontSize: 38,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  teamSection: {
    marginBottom: 16,
  },
  teamHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  team1Header: {
    backgroundColor: '#2196F3',
  },
  team2Header: {
    backgroundColor: '#FF9800',
  },
  teamHeaderText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
  },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 1,
  },
  totalScore: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  scoreControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
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
    fontSize: 28,
    fontWeight: '400' as const,
    color: '#fff',
  },
  scoreDisplayContainer: {
    alignItems: 'center',
  },
  scoreDisplay: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    borderWidth: 3,
    borderColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDisplayComplete: {
    backgroundColor: '#ff9800',
    borderColor: '#ff9800',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#ccc',
  },
  scoreValueActive: {
    color: '#2196F3',
  },
  netScoreLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#1B5E20',
    marginTop: 4,
  },
  strokeButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1B5E20',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  strokeButtonActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#1B5E20',
  },
  strokeButtonText: {
    fontSize: 12,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  holeResultLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
  },
  holeResultBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
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
  holeResultText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
