import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Event } from '@/types';
import { useAlerts } from '@/contexts/AlertsContext';
import { AlertsModal } from '@/components/AlertsModal';
import { soundService } from '@/utils/soundService';

interface EventHeaderProps {
  event?: Event | null;
}

export const EventHeader: React.FC<EventHeaderProps> = ({ event }) => {
  const { getAlertsForEvent } = useAlerts();
  const [alertsModalVisible, setAlertsModalVisible] = useState<boolean>(false);
  const shownCriticalAlertIds = useRef<Set<string>>(new Set());

  const eventAlerts = event ? getAlertsForEvent(event.id) : [];
  const undismissedEventAlerts = eventAlerts.filter(a => !a.isDismissed);
  const criticalUndismissedAlerts = undismissedEventAlerts.filter(a => a.priority === 'critical');

  useEffect(() => {
    if (!event || criticalUndismissedAlerts.length === 0) return;

    const newCriticalAlerts = criticalUndismissedAlerts.filter(
      alert => !shownCriticalAlertIds.current.has(alert.id)
    );

    if (newCriticalAlerts.length > 0) {
      console.log('[EventHeader] New critical alert detected, auto-opening modal');
      newCriticalAlerts.forEach(alert => shownCriticalAlertIds.current.add(alert.id));
      soundService.playEmergencySound();
      setAlertsModalVisible(true);
    }
  }, [event, criticalUndismissedAlerts]);

  if (!event) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.bellButton}
        onPress={() => setAlertsModalVisible(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.bellIconContainer}>
          <Bell size={18} color="#ffffff" strokeWidth={2.5} />
          {undismissedEventAlerts.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{undismissedEventAlerts.length}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {event.entryFee && (
        <View style={styles.entryFeeBox}>
          <Text style={styles.entryFeeText}>${event.entryFee}</Text>
        </View>
      )}

      <AlertsModal
        visible={alertsModalVisible}
        onClose={() => setAlertsModalVisible(false)}
        eventId={event.id}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bellButton: {
    position: 'absolute' as const,
    top: 38,
    right: 16,
    zIndex: 10,
  },
  bellIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5A0015',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
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
