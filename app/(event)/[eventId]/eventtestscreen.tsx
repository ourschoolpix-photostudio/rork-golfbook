import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EventFooter } from '@/components/EventFooter';
import { SingleFooterButton } from '@/components/SingleFooterButton';

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
        
        <View style={styles.buttonPreview}>
          <SingleFooterButton
            label="Button Label"
            onPress={() => console.log('[EventTestScreen] SingleFooterButton pressed')}
          />
        </View>
      </View>
      {/* Independent test button row - changes here won't affect EventFooter on other screens */}
      <View style={styles.testButtonRow}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => console.log('[EventTestScreen] Test Button 1 pressed')}
          activeOpacity={0.8}
        >
          <Text style={styles.testButtonText}>Test Button 1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => console.log('[EventTestScreen] Test Button 2 pressed')}
          activeOpacity={0.8}
        >
          <Text style={styles.testButtonText}>Test Button 2</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => console.log('[EventTestScreen] Test Button 3 pressed')}
          activeOpacity={0.8}
        >
          <Text style={styles.testButtonText}>Test Button 3</Text>
        </TouchableOpacity>
      </View>
      <EventFooter 
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
  buttonPreview: {
    marginTop: 40,
    width: '60%',
  },
  testButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#5A0015',
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FDB813',
    borderWidth: 2,
    borderColor: '#800020',
  },
  testButtonText: {
    color: '#800020',
    fontSize: 12,
    fontWeight: '700' as const,
  },
});
