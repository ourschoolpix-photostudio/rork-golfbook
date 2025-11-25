import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Play, Trophy, Trash2, BookOpen } from 'lucide-react-native';
import { useGames } from '@/contexts/GamesContext';
import CreateGameModal from '@/components/CreateGameModal';
import CoursesManagementModal from '@/components/CoursesManagementModal';
import { PersonalGame } from '@/types';

export default function GamesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { inProgressGames, completedGames, createGame, deleteGame } = useGames();
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [coursesModalVisible, setCoursesModalVisible] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      console.log('[GamesScreen] Focused - In Progress:', inProgressGames.length, 'Completed:', completedGames.length);
    }, [inProgressGames.length, completedGames.length])
  );

  const handleCreateGame = async (
    courseName: string,
    coursePar: number,
    holePars: number[],
    players: { name: string; handicap: number; strokesReceived?: number; teamId?: 1 | 2 }[],
    gameType?: 'individual-net' | 'team-match-play',
    matchPlayScoringType?: 'best-ball' | 'alternate-ball'
  ) => {
    try {
      const gameId = await createGame(courseName, coursePar, holePars, players, gameType, matchPlayScoringType);
      console.log('[GamesScreen] Game created:', gameId);
      router.push(`/(game)/${gameId}/scoring` as any);
    } catch (error) {
      console.error('[GamesScreen] Error creating game:', error);
      Alert.alert('Error', 'Failed to create game');
    }
  };

  const handleDeleteGame = (gameId: string, gameName: string) => {
    Alert.alert(
      'Delete Game',
      `Are you sure you want to delete "${gameName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGame(gameId);
              console.log('[GamesScreen] Game deleted:', gameId);
            } catch (error) {
              console.error('[GamesScreen] Error deleting game:', error);
              Alert.alert('Error', 'Failed to delete game');
            }
          },
        },
      ]
    );
  };

  const renderGameCard = (game: PersonalGame, isInProgress: boolean) => {
    const date = new Date(game.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const playerNames = game.players.map(p => p.name).join(', ');

    return (
      <TouchableOpacity
        key={game.id}
        style={styles.gameCard}
        activeOpacity={0.8}
        onPress={() => {
          if (isInProgress) {
            router.push(`/(game)/${game.id}/scoring` as any);
          } else {
            router.push(`/(game)/${game.id}/scorecard` as any);
          }
        }}
      >
        <View style={styles.gameCardHeader}>
          <View style={styles.gameInfo}>
            <Text style={styles.gameName}>{game.courseName}</Text>
            <Text style={styles.gameDate}>{formattedDate}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteGame(game.id, game.courseName);
            }}
          >
            <Trash2 size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        <View style={styles.gameDetails}>
          <Text style={styles.gameDetailLabel}>Par: <Text style={styles.gameDetailValue}>{game.coursePar}</Text></Text>
          <Text style={styles.gameDetailLabel}>Players: <Text style={styles.gameDetailValue}>{game.players.length}</Text></Text>
        </View>

        <Text style={styles.playersList} numberOfLines={1}>{playerNames}</Text>

        <View style={styles.gameFooter}>
          {isInProgress ? (
            <View style={styles.statusBadge}>
              <Play size={14} color="#007AFF" />
              <Text style={styles.statusText}>In Progress</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.completedBadge]}>
              <Trophy size={14} color="#34C759" />
              <Text style={[styles.statusText, styles.completedText]}>Completed</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={styles.headerTitle}>My Games</Text>
            <Text style={styles.headerSubtitle}>Personal scoring records</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.coursesButton}
              onPress={() => setCoursesModalVisible(true)}
            >
              <BookOpen size={20} color="#1B5E20" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setCreateModalVisible(true)}
            >
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {inProgressGames.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>In Progress</Text>
              <FlatList
                scrollEnabled={false}
                data={inProgressGames}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderGameCard(item, true)}
              />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {completedGames.length > 0 ? 'Completed Games' : 'No Games Yet'}
            </Text>
            {completedGames.length === 0 && inProgressGames.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No games recorded yet</Text>
                <Text style={styles.emptyDescription}>
                  This screen is for your personal games only and does not affect any tournament results.
                  Use it to track your own scores, monitor your progress, and maintain a historical record of all the rounds you{"'"} ve played with friends.
                </Text>
                <Text style={styles.emptySubtext}>Tap the + button to create your first game</Text>
              </View>
            ) : completedGames.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No completed games yet</Text>
              </View>
            ) : (
              <FlatList
                scrollEnabled={false}
                data={completedGames}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderGameCard(item, false)}
              />
            )}
          </View>
        </ScrollView>

        <CreateGameModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSave={handleCreateGame}
        />

        <CoursesManagementModal
          visible={coursesModalVisible}
          onClose={() => setCoursesModalVisible(false)}
        />
      </View>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#d1d5db',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  coursesButton: {
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  addButton: {
    backgroundColor: '#1B5E20',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  gameCard: {
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
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  gameDate: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 4,
  },
  gameDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  gameDetailLabel: {
    fontSize: 13,
    color: '#666',
  },
  gameDetailValue: {
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  playersList: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  gameFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E3F2FD',
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  completedText: {
    color: '#34C759',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center' as const,
    lineHeight: 20,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
  },
});
