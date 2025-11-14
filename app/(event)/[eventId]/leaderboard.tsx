import { useLocalSearchParams } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { EventFooter } from '@/components/EventFooter';

export default function LeaderboardScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.emptyState}>
          <Trophy size={64} color="#16a34a" />
          <Text style={styles.emptyTitle}>Event Leaderboard</Text>
          <Text style={styles.emptyText}>
            View standings and Rolex Points for this event
          </Text>
          <Text style={styles.comingSoon}>Feature coming soon</Text>
        </View>
      </ScrollView>
      <EventFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#14532d',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#166534',
    textAlign: 'center',
    marginBottom: 16,
  },
  comingSoon: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic' as const,
  },
});
