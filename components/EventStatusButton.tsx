import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Alert } from '@/utils/alertPolyfill';

export type EventStatus = 'upcoming' | 'active' | 'locked' | 'complete';

interface EventStatusButtonProps {
  status: EventStatus;
  onStatusChange: (newStatus: EventStatus) => void;
  isAdmin: boolean;
}

const statusCycle: Record<EventStatus, EventStatus> = {
  upcoming: 'active',
  active: 'locked',
  locked: 'complete',
  complete: 'upcoming',
};

const statusColors: Record<EventStatus, { bg: string; text: string }> = {
  upcoming: { bg: '#FF9500', text: '#fff' },
  active: { bg: '#34C759', text: '#fff' },
  locked: { bg: '#FFA500', text: '#fff' },
  complete: { bg: '#007AFF', text: '#fff' },
};

const statusLabels: Record<EventStatus, string> = {
  upcoming: 'Start',
  active: 'Active',
  locked: 'Locked',
  complete: 'Complete',
};

export function EventStatusButton({ status, onStatusChange, isAdmin }: EventStatusButtonProps) {
  const handlePress = () => {
    if (!isAdmin) return;
    const nextStatus = statusCycle[status];
    
    if (status === 'complete' && nextStatus === 'upcoming') {
      Alert.prompt(
        'Admin Verification Required',
        'Enter admin code to change status from Complete to Start:',
        (code?: string) => {
          if (code === '8650') {
            onStatusChange(nextStatus);
          } else if (code !== undefined) {
            Alert.alert('Error', 'Invalid admin code. Status change denied.');
          }
        },
        'secure-text'
      );
    } else {
      onStatusChange(nextStatus);
    }
  };

  const colors = statusColors[status];
  const label = statusLabels[status];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.bg,
          opacity: isAdmin ? 1 : 0.6,
        },
      ]}
      onPress={handlePress}
      disabled={!isAdmin}
      activeOpacity={isAdmin ? 0.7 : 1}
    >
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
});
