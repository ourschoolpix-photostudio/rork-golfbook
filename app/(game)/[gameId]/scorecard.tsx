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
import { ArrowLeft, Edit } from 'lucide-react-native';
import { useGames } from '@/contexts/GamesContext';
import * as NinersHelper from '@/utils/ninersHelper';
import * as WolfHelper from '@/utils/wolfHelper';
import * as IndividualScoreHelper from '@/utils/individualScoreHelper';
import { PersonalGamePlayer } from '@/types';

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

  const isWolf = game.gameType === 'wolf';
  const isNiners = game.gameType === 'niners';
  const isIndividualScore = game.gameType === 'individual-net';

  const shouldPlayerReceiveStrokeOnHole = (player: PersonalGamePlayer, playerIndex: number, holeIndex: number): boolean => {
    if (!player.strokesReceived || player.strokesReceived === 0) return false;
    if (!game || !game.strokeIndices || game.strokeIndices.length !== 18) return false;
    if (holeIndex < 0 || holeIndex >= 18) return false;

    const strokeMode = player.strokeMode || 'manual';
    
    if (strokeMode === 'manual') {
      if (!player.strokesUsed || !player.strokesUsed[holeIndex]) return false;
      return player.strokesUsed[holeIndex] === 1;
    } else {
      const isWolfOrNiners = game.gameType === 'wolf' || game.gameType === 'niners';
      const holePar = game.holePars[holeIndex];
      
      if (isWolfOrNiners && holePar === 3) {
        return false;
      }
      
      const strokesPerNine = player.strokesReceived;
      const isFrontNine = holeIndex < 9;
      const nineHoles = isFrontNine ? game.holePars.slice(0, 9) : game.holePars.slice(9, 18);
      const nineStrokeIndices = isFrontNine ? game.strokeIndices.slice(0, 9) : game.strokeIndices.slice(9, 18);
      const holeIndexInNine = isFrontNine ? holeIndex : holeIndex - 9;
      
      const sortedHoles = nineStrokeIndices
        .map((si: number, idx: number) => ({ idx, strokeIndex: si, par: nineHoles[idx] }))
        .filter((h: { idx: number; strokeIndex: number; par: number }) => isWolfOrNiners ? h.par !== 3 : true)
        .sort((a: { idx: number; strokeIndex: number; par: number }, b: { idx: number; strokeIndex: number; par: number }) => a.strokeIndex - b.strokeIndex)
        .slice(0, Math.min(strokesPerNine, 9))
        .map((h: { idx: number; strokeIndex: number; par: number }) => h.idx);
      
      return sortedHoles.includes(holeIndexInNine);
    }
  };

  const holeScores: { [playerIndex: number]: { [hole: number]: number } } = {};
  game.players.forEach((player: PersonalGamePlayer, playerIndex: number) => {
    holeScores[playerIndex] = {};
    player.scores.forEach((score: number, holeIndex: number) => {
      if (score > 0) {
        holeScores[playerIndex][holeIndex + 1] = score;
      }
    });
  });

  const individualScoreData = isIndividualScore
    ? IndividualScoreHelper.calculatePayments(game, holeScores, shouldPlayerReceiveStrokeOnHole)
    : null;

  const paymentData = isWolf
    ? WolfHelper.calculatePayments(game)
    : isNiners
    ? NinersHelper.calculatePayments(game)
    : isIndividualScore && individualScoreData
    ? { transactions: individualScoreData.transactions }
    : null;

  const sortedPlayers = [...game.players].sort((a, b) => {
    if (isWolf || isNiners) {
      if ((a.wolfPoints || 0) === 0) return 1;
      if ((b.wolfPoints || 0) === 0) return -1;
      return (b.wolfPoints || 0) - (a.wolfPoints || 0);
    }
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
        <TouchableOpacity 
          onPress={() => router.push(`/(game)/${gameId}/scoring` as any)} 
          style={styles.editButton}
        >
          <Edit size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.courseName}>{game.courseName}</Text>
          <Text style={styles.gameType}>{game.gameType ? game.gameType.charAt(0).toUpperCase() + game.gameType.slice(1) : 'Individual Net'}</Text>
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
            {game.dollarAmount && (isWolf || isNiners) && (
              <View style={styles.courseDetail}>
                <Text style={styles.courseDetailLabel}>$/Point</Text>
                <Text style={styles.courseDetailValue}>${game.dollarAmount.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </View>

        {isIndividualScore && individualScoreData && (
          <View style={styles.winnersSection}>
            <Text style={styles.sectionTitle}>Winners</Text>
            <View style={styles.winnersCard}>
              {game.front9Bet && game.front9Bet > 0 && (
                <View style={styles.winnerRow}>
                  <Text style={styles.winnerLabel}>Front 9:</Text>
                  {individualScoreData.winners.front9Winners.length === 1 ? (
                    <>
                      <Text style={styles.winnerName}>{game.players[individualScoreData.winners.front9Winner!]?.name || 'N/A'}</Text>
                      <Text style={styles.winnerAmount}>${game.front9Bet.toFixed(2)}</Text>
                    </>
                  ) : individualScoreData.winners.front9Winners.length > 1 ? (
                    <View style={styles.tiedWinnersContainer}>
                      <Text style={styles.winnerTie}>
                        {individualScoreData.winners.front9Winners.map(idx => game.players[idx]?.name).join(', ')} (Split)
                      </Text>
                      <Text style={styles.winnerAmount}>
                        ${(game.front9Bet / individualScoreData.winners.front9Winners.length).toFixed(2)} ea
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.winnerTie}>Push</Text>
                  )}
                </View>
              )}
              {game.back9Bet && game.back9Bet > 0 && (
                <View style={styles.winnerRow}>
                  <Text style={styles.winnerLabel}>Back 9:</Text>
                  {individualScoreData.winners.back9Winners.length === 1 ? (
                    <>
                      <Text style={styles.winnerName}>{game.players[individualScoreData.winners.back9Winner!]?.name || 'N/A'}</Text>
                      <Text style={styles.winnerAmount}>${game.back9Bet.toFixed(2)}</Text>
                    </>
                  ) : individualScoreData.winners.back9Winners.length > 1 ? (
                    <View style={styles.tiedWinnersContainer}>
                      <Text style={styles.winnerTie}>
                        {individualScoreData.winners.back9Winners.map(idx => game.players[idx]?.name).join(', ')} (Split)
                      </Text>
                      <Text style={styles.winnerAmount}>
                        ${(game.back9Bet / individualScoreData.winners.back9Winners.length).toFixed(2)} ea
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.winnerTie}>Push</Text>
                  )}
                </View>
              )}
              {game.overallBet && game.overallBet > 0 && (
                <View style={styles.winnerRow}>
                  <Text style={styles.winnerLabel}>Overall:</Text>
                  {individualScoreData.winners.overallWinners.length === 1 ? (
                    <>
                      <Text style={styles.winnerName}>{game.players[individualScoreData.winners.overallWinner!]?.name || 'N/A'}</Text>
                      <Text style={styles.winnerAmount}>${game.overallBet.toFixed(2)}</Text>
                    </>
                  ) : individualScoreData.winners.overallWinners.length > 1 ? (
                    <View style={styles.tiedWinnersContainer}>
                      <Text style={styles.winnerTie}>
                        {individualScoreData.winners.overallWinners.map(idx => game.players[idx]?.name).join(', ')} (Split)
                      </Text>
                      <Text style={styles.winnerAmount}>
                        ${(game.overallBet / individualScoreData.winners.overallWinners.length).toFixed(2)} ea
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.winnerTie}>Push</Text>
                  )}
                </View>
              )}
              {game.potBet && game.potBet > 0 && (
                <View style={styles.winnerRow}>
                  <Text style={styles.winnerLabel}>Pot:</Text>
                  {individualScoreData.winners.overallWinners.length === 1 ? (
                    <>
                      <Text style={styles.winnerName}>{game.players[individualScoreData.winners.overallWinner!]?.name || 'N/A'}</Text>
                      <Text style={styles.winnerAmount}>${game.potBet.toFixed(2)}</Text>
                    </>
                  ) : individualScoreData.winners.overallWinners.length > 1 ? (
                    <View style={styles.tiedWinnersContainer}>
                      <Text style={styles.winnerTie}>
                        {individualScoreData.winners.overallWinners.map(idx => game.players[idx]?.name).join(', ')} (Split)
                      </Text>
                      <Text style={styles.winnerAmount}>
                        ${(game.potBet / individualScoreData.winners.overallWinners.length).toFixed(2)} ea
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.winnerTie}>Push</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>{isWolf ? 'Wolf Points Leaderboard' : isNiners ? 'Niners Points Leaderboard' : 'Final Scores'}</Text>
          {sortedPlayers.map((player, index) => {
            const scoreDiff = player.totalScore > 0 ? player.totalScore - game.coursePar : 0;
            const scoreDiffText = scoreDiff === 0 ? 'E' : scoreDiff > 0 ? `+${scoreDiff}` : String(scoreDiff);
            const wolfPoints = player.wolfPoints || 0;
            const dollarAmount = (isWolf || isNiners) && game.dollarAmount ? wolfPoints * game.dollarAmount : 0;

            return (
              <View key={index} style={styles.playerCard}>
                <View style={styles.playerRank}>
                  <Text style={styles.rankText}>
                    {(isWolf || isNiners) ? (wolfPoints > 0 ? index + 1 : '-') : (player.totalScore > 0 ? index + 1 : '-')}
                  </Text>
                </View>
                <View style={styles.playerCardInfo}>
                  <View style={styles.playerCardNameRow}>
                    <Text style={styles.playerCardName}>{player.name}</Text>
                    {!isWolf && !isNiners && player.totalScore > 0 && (
                      <Text style={styles.playerCardStrokesAside}>{player.totalScore} strokes</Text>
                    )}
                  </View>
                  <Text style={styles.playerCardHandicap}>HDC: {player.handicap}</Text>
                  {(isWolf || isNiners) && (
                    <Text style={styles.playerCardPoints}>{wolfPoints > 0 ? `${wolfPoints} points` : '0 points'}</Text>
                  )}
                </View>
                {(isWolf || isNiners) && game.dollarAmount && dollarAmount !== 0 ? (
                  <View style={styles.playerCardScores}>
                    <Text style={[styles.playerCardTotal, dollarAmount > 0 ? styles.dollarPositive : styles.dollarNegative]}>
                      ${dollarAmount.toFixed(2)}
                    </Text>
                  </View>
                ) : !isWolf && !isNiners && player.totalScore > 0 ? (
                  <View style={styles.playerCardScores}>
                    <Text style={[
                      styles.playerCardDiff,
                      scoreDiff === 0 && styles.scoreDiffEven,
                      scoreDiff < 0 && styles.scoreDiffUnder,
                    ]}>
                      {scoreDiffText}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {(isWolf || isNiners || isIndividualScore) && paymentData && paymentData.transactions.length > 0 && (
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Payment Settlement</Text>
            <View style={styles.paymentSummaryCard}>
              <Text style={styles.paymentSummaryTitle}>Most Efficient Way to Settle</Text>
              <Text style={styles.paymentSummarySubtitle}>Minimized transactions</Text>
              {paymentData.transactions.map((transaction, idx) => (
                <View key={idx} style={styles.transactionRow}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionFrom}>{transaction.from}</Text>
                    <Text style={styles.transactionArrow}>→</Text>
                    <Text style={styles.transactionTo}>{transaction.to}</Text>
                  </View>
                  <Text style={styles.transactionAmount}>${transaction.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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
  gameType: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1B5E20',
    marginBottom: 4,
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
  playerCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  playerCardName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  playerCardStrokesAside: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
  },
  playerCardHandicap: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  playerCardPoints: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1B5E20',
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
  editButton: {
    padding: 4,
    backgroundColor: '#1B5E20',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerCardDollar: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  dollarPositive: {
    color: '#34C759',
  },
  dollarNegative: {
    color: '#FF3B30',
  },
  paymentSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  paymentSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  paymentSummaryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  paymentSummarySubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  transactionFrom: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  transactionArrow: {
    fontSize: 14,
    color: '#999',
  },
  transactionTo: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  winnersSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  winnersCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  winnerLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
    width: 80,
  },
  winnerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  winnerAmount: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#34C759',
  },
  winnerTie: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#999',
    fontStyle: 'italic' as const,
  },
  tiedWinnersContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
