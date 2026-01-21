import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EventFooter } from '@/components/EventFooter';

export default function EventTestScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Event Test Screen</Text>
        <Text style={styles.subtitle}>Event ID: {eventId}</Text>
        <Text style={styles.description}>
          Use this screen to preview and test components before adding them to actual screens.
        </Text>
      </View>
      <EventFooter 
        showPlaceholderButton={true}
        onPlaceholderPress={() => console.log('[EventTestScreen] Placeholder button pressed')}
        hideTopRowButtons={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8899AA',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
