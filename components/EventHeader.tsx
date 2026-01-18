import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useAlerts } from '@/contexts/AlertsContext';
import { Event } from '@/types';

interface EventHeaderProps {
  onBellPress: () => void;
  eventId?: string;
  event?: Event | null;
}

export const EventHeader: React.FC<EventHeaderProps> = ({ onBellPress, eventId, event }) => {
  const { undismissedCount, getAlertsForEvent } = useAlerts();
  
  const eventAlerts = eventId ? getAlertsForEvent(eventId).filter(a => !a.isDismissed) : [];
  const alertCount = eventId ? eventAlerts.length : undismissedCount;

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.bellIcon}
          onPress={onBellPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Bell size={24} color="#1B5E20" />
          {alertCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{alertCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {event && event.entryFee && event.photoUrl && (
        <View style={styles.entryFeeBox}>
          <Text style={styles.entryFeeText}>${event.entryFee}</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute' as const,
    top: 12,
    right: 16,
    zIndex: 100,
  },
  bellIcon: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bellBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  entryFeeBox: {
    position: 'absolute' as const,
    top: 6,
    right: 52,
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
