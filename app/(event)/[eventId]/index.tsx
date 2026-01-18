import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Calendar, MapPin, FileText, Users as UsersIcon } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { storageService } from '@/utils/storage';
import { useState, useEffect, useCallback } from 'react';
import { EventFooter } from '@/components/EventFooter';
import { SyncStatusIndicator } from '@/components/SyncButton';
import { AlertsModal } from '@/components/AlertsModal';
import { useAlerts } from '@/contexts/AlertsContext';

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [event, setEvent] = useState<any>(null);
  const [alertsModalVisible, setAlertsModalVisible] = useState<boolean>(false);
  const [criticalAlertShown, setCriticalAlertShown] = useState<boolean>(false);
  const { getCriticalUndismissedAlerts } = useAlerts();

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      const criticalAlerts = getCriticalUndismissedAlerts();
      const eventSpecificCriticalAlerts = eventId ? criticalAlerts.filter(a => 
        (a.type === 'event' && a.eventId === eventId) || a.type === 'organizational'
      ) : [];
      
      if (eventSpecificCriticalAlerts.length > 0 && !criticalAlertShown) {
        setCriticalAlertShown(true);
        setTimeout(() => {
          setAlertsModalVisible(true);
        }, 500);
      }
    }, [eventId, getCriticalUndismissedAlerts, criticalAlertShown])
  );

  const loadEvent = async () => {
    const events = await storageService.getEvents();
    const foundEvent = events.find(e => e.id === eventId);
    setEvent(foundEvent);
  };

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AlertsModal
        visible={alertsModalVisible}
        onClose={() => {
          setAlertsModalVisible(false);
          setCriticalAlertShown(false);
        }}
        eventId={eventId as string}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <SyncStatusIndicator eventId={eventId as string} />
        
        <View style={styles.header}>
          <Text style={styles.title}>{event.name}</Text>
          <View style={[styles.statusBadge, styles[`status${event.status.charAt(0).toUpperCase() + event.status.slice(1)}` as keyof typeof styles]]}>
            <Text style={styles.statusText}>{event.status}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Calendar size={20} color="#16a34a" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{event.date}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <MapPin size={20} color="#16a34a" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoValue}>{event.location}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <UsersIcon size={20} color="#16a34a" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Participants</Text>
              <Text style={styles.infoValue}>
                {(event.registeredPlayers || []).length} registered
              </Text>
            </View>
          </View>
        </View>

        {event.memo && (
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <FileText size={20} color="#16a34a" />
              <Text style={styles.descriptionTitle}>Description</Text>
            </View>
            <Text style={styles.descriptionText}>{event.memo}</Text>
          </View>
        )}

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Event Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(event.registeredPlayers || []).length}</Text>
              <Text style={styles.statLabel}>Registrations</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{event.status === 'active' ? 'Active' : event.status === 'complete' ? 'Complete' : 'Upcoming'}</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#14532d',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDraft: {
    backgroundColor: '#fef3c7',
  },
  statusUpcoming: {
    backgroundColor: '#fef3c7',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusComplete: {
    backgroundColor: '#dbeafe',
  },
  statusCompleted: {
    backgroundColor: '#dbeafe',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
    color: '#14532d',
  },
  infoCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#16a34a',
    marginBottom: 2,
    fontWeight: '500' as const,
  },
  infoValue: {
    fontSize: 16,
    color: '#14532d',
    fontWeight: '600' as const,
  },
  descriptionCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#14532d',
  },
  descriptionText: {
    fontSize: 15,
    color: '#166534',
    lineHeight: 22,
  },
  statsCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#14532d',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#16a34a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#166534',
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 40,
  },
});
