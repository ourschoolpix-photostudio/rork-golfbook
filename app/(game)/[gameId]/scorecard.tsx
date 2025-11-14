import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useGames } from '@/contexts/GamesContext';

export default function GameScorecardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { getGame } = useGames();

  const game = getGame(gameId);

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Game not found</Text>
      </View>
    );
  }

  const sortedPlayers = [...game.players].sort((a, b) => {
    if (a.totalScore === 0) return 1;
    if (b.totalScore === 0) return -1;
    return a.totalScore - b.totalScore;
  });

  const date = new Date(game.completedAt || game.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Scorecard</Text>
          <Text style={styles.headerSubtitle}>{game.courseName}</Text>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.courseName}>{game.courseName}</Text>
          <Text style={styles.courseDate}>{formattedDate}</Text>
          <View style={styles.courseDetailsRow}>
            <View style={styles.courseDetail}>
              <Text style={styles.courseDetailLabel}>Par</Text>
              <Text style={styles.courseDetailValue}>{game.coursePar}</Text>
            </View>
            <View style={styles.courseDetail}>
              <Text style={styles.courseDetailLabel}>Players</Text>
              <Text style={styles.courseDetailValue}>{game.players.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>Final Scores</Text>
          {sortedPlayers.map((player, index) => {
            const scoreDiff = player.totalScore > 0 ? player.totalScore - game.coursePar : 0;
            const scoreDiffText = scoreDiff === 0 ? 'E' : scoreDiff > 0 ? `+${scoreDiff}` : String(scoreDiff);

            return (
              <View key={index} style={styles.playerCard}>
                <View style={styles.playerRank}>
                  <Text style={styles.rankText}>{player.totalScore > 0 ? index + 1 : '-'}</Text>
                </View>
                <View style={styles.playerCardInfo}>
                  <Text style={styles.playerCardName}>{player.name}</Text>
                  <Text style={styles.playerCardHandicap}>HDC: {player.handicap}</Text>
                </View>
                <View style={styles.playerCardScores}>
                  <Text style={styles.playerCardTotal}>{player.totalScore > 0 ? player.totalScore : '-'}</Text>
                  {player.totalScore > 0 && (
                    <Text style={[
                      styles.playerCardDiff,
                      scoreDiff === 0 && styles.scoreDiffEven,
                      scoreDiff < 0 && styles.scoreDiffUnder,
                    ]}>
                      {scoreDiffText}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Hole-by-Hole</Text>
          {game.players.map((player, playerIndex) => (
            <View key={playerIndex} style={styles.holeByHoleCard}>
              <Text style={styles.holeByHolePlayerName}>{player.name}</Text>
              <View style={styles.holesGrid}>
                {player.scores.map((score, holeIndex) => (
                  <View key={holeIndex} style={styles.holeDetail}>
                    <Text style={styles.holeDetailNumber}>{holeIndex + 1}</Text>
                    <Text style={styles.holeDetailPar}>Par {game.holePars[holeIndex]}</Text>
                    <Text style={[
                      styles.holeDetailScore,
                      score > 0 && score < game.holePars[holeIndex] && styles.holeScoreBirdie,
                      score > 0 && score > game.holePars[holeIndex] && styles.holeScoreBogey,
                    ]}>
                      {score > 0 ? score : '-'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

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
  errorText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  courseName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 6,
  },
  courseDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  courseDetailsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  courseDetail: {
    alignItems: 'center',
  },
  courseDetailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  courseDetailValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  leaderboardSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  playerRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B5E20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  playerCardInfo: {
    flex: 1,
  },
  playerCardName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  playerCardHandicap: {
    fontSize: 12,
    color: '#666',
  },
  playerCardScores: {
    alignItems: 'flex-end',
  },
  playerCardTotal: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  playerCardDiff: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  scoreDiffEven: {
    color: '#666',
  },
  scoreDiffUnder: {
    color: '#34C759',
  },
  detailsSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  holeByHoleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  holeByHolePlayerName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  holesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  holeDetail: {
    width: '15%',
    alignItems: 'center',
    marginBottom: 8,
  },
  holeDetailNumber: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 2,
  },
  holeDetailPar: {
    fontSize: 9,
    color: '#999',
    marginBottom: 4,
  },
  holeDetailScore: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  holeScoreBirdie: {
    color: '#34C759',
  },
  holeScoreBogey: {
    color: '#FF3B30',
  },
  bottomPadding: {
    height: 24,
  },
});
