import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useGames } from '@/contexts/GamesContext';

export default function GameScoringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { getGame, updateGameScores, completeGame } = useGames();

  const [game, setGame] = useState(getGame(gameId));
  const [currentHole, setCurrentHole] = useState<number>(1);
  const [holeScores, setHoleScores] = useState<{ [playerIndex: number]: { [hole: number]: number } }>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (game) {
      const scoresMap: { [playerIndex: number]: { [hole: number]: number } } = {};
      game.players.forEach((player, playerIndex) => {
        scoresMap[playerIndex] = {};
        player.scores.forEach((score, holeIndex) => {
          if (score > 0) {
            scoresMap[playerIndex][holeIndex + 1] = score;
          }
        });
      });
      setHoleScores(scoresMap);
      console.log('[GameScoring] Loaded scores:', scoresMap);
    }
  }, [game]);

  const handlePreviousHole = () => {
    setCurrentHole(prev => {
      if (prev === 1) return 18;
      return prev - 1;
    });
  };

  const handleNextHole = () => {
    setCurrentHole(prev => {
      if (prev === 18) return 1;
      return prev + 1;
    });
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
    return game.players.every((_, playerIndex) => isPlayerScoringComplete(playerIndex));
  };

  const handleSaveAllScores = async () => {
    if (!game || isSaving) return;

    setIsSaving(true);
    try {
      for (let playerIndex = 0; playerIndex < game.players.length; playerIndex++) {
        const playerScores = holeScores[playerIndex] || {};
        const scores = Array.from({ length: 18 }, (_, i) => playerScores[i + 1] || 0);
        await updateGameScores(gameId, playerIndex, scores);
      }

      const updatedGame = getGame(gameId);
      setGame(updatedGame);
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

    const allPlayersScored = game.players.every(p => {
      return p.scores.some(s => s > 0);
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{game.courseName}</Text>
          <Text style={styles.headerSubtitle}>Par {game.coursePar}</Text>
        </View>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteGame}
        >
          <Check size={20} color="#fff" />
        </TouchableOpacity>
      </View>

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
        {game.players.map((player, playerIndex) => {
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
        })}

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
  playerHandicap: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#999',
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
});
