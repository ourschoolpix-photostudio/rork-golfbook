import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Event } from '@/types';

interface EventHeaderProps {
  event?: Event | null;
}

export const EventHeader: React.FC<EventHeaderProps> = ({ event }) => {
  if (!event || !event.entryFee || !event.photoUrl) {
    return null;
  }

  return (
    <View style={styles.entryFeeBox}>
      <Text style={styles.entryFeeText}>${event.entryFee}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  entryFeeBox: {
    position: 'absolute' as const,
    top: 6,
    right: 16,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 10,
  },
  entryFeeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
