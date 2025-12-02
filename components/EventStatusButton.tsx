import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export type EventStatus = 'upcoming' | 'active' | 'complete';

interface EventStatusButtonProps {
  status: EventStatus;
  onStatusChange: (newStatus: EventStatus) => void;
  isAdmin: boolean;
}

const statusCycle: Record<EventStatus, EventStatus> = {
  upcoming: 'active',
  active: 'complete',
  complete: 'upcoming',
};

const statusColors: Record<EventStatus, { bg: string; text: string }> = {
  upcoming: { bg: '#FF9500', text: '#fff' },
  active: { bg: '#34C759', text: '#fff' },
  complete: { bg: '#007AFF', text: '#fff' },
};

const statusLabels: Record<EventStatus, string> = {
  upcoming: 'Start',
  active: 'Active',
  complete: 'Complete',
};

export function EventStatusButton({ status, onStatusChange, isAdmin }: EventStatusButtonProps) {
  const handlePress = () => {
    if (!isAdmin) return;
    const nextStatus = statusCycle[status];
    onStatusChange(nextStatus);
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
    paddingHorizontal: 12,
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
