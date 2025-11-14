import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Upload, CheckCircle, AlertCircle, Clock } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';

interface SyncButtonProps {
  eventId?: string;
}

export function SyncButton({ eventId }: SyncButtonProps) {
  const { currentUser, members } = useAuth();
  const { events } = useEvents();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const syncMembersMutation = trpc.sync.members.sync.useMutation();
  const syncEventMutation = trpc.sync.events.sync.useMutation();

  const handleSync = async () => {
    if (!currentUser?.isAdmin) {
      Alert.alert('Error', 'Only admins can sync data');
      return;
    }

    setIsSyncing(true);
    
    try {
      console.log('🔄 Starting sync process...');

      await syncMembersMutation.mutateAsync({
        members: members.map(m => ({
          id: m.id,
          name: m.name,
          pin: m.pin,
          isAdmin: m.isAdmin,
          email: m.email,
          phone: m.phone,
          handicap: m.handicap,
          rolexPoints: m.rolexPoints,
          createdAt: m.createdAt,
          fullName: m.fullName,
          username: m.username,
          membershipType: m.membershipType,
          gender: m.gender,
          address: m.address,
          city: m.city,
          state: m.state,
          flight: m.flight,
          rolexFlight: m.rolexFlight,
          currentHandicap: m.currentHandicap,
          dateOfBirth: m.dateOfBirth,
          emergencyContactName: m.emergencyContactName,
          emergencyContactPhone: m.emergencyContactPhone,
          joinDate: m.joinDate,
          profilePhotoUrl: m.profilePhotoUrl,
          adjustedHandicap: m.adjustedHandicap,
          ghin: m.ghin,
        })),
        syncedBy: currentUser.id,
      });
      console.log('✅ Members synced');

      if (eventId) {
        const event = events.find(e => e.id === eventId);
        if (event) {
          await syncEventMutation.mutateAsync({
            event: {
              id: event.id,
              name: event.name,
              date: event.date,
              venue: event.venue,
              status: event.status,
              startDate: event.startDate,
              endDate: event.endDate,
              location: event.location,
              course: event.course,
              description: event.description,
              memo: event.memo,
              registrationDeadline: event.registrationDeadline,
              maxParticipants: event.maxParticipants,
              createdAt: event.createdAt,
              createdBy: event.createdBy,
              type: event.type,
              photoUrl: event.photoUrl,
              entryFee: event.entryFee,
              numberOfDays: event.numberOfDays,
              address: event.address,
              city: event.city,
              state: event.state,
              zipcode: event.zipcode,
              day1StartTime: event.day1StartTime,
              day1StartPeriod: event.day1StartPeriod,
              day1Course: event.day1Course,
              day1StartType: event.day1StartType,
              day1LeadingHole: event.day1LeadingHole,
              day1Par: event.day1Par,
              day1HolePars: event.day1HolePars,
              day2StartTime: event.day2StartTime,
              day2StartPeriod: event.day2StartPeriod,
              day2Course: event.day2Course,
              day2StartType: event.day2StartType,
              day2LeadingHole: event.day2LeadingHole,
              day2Par: event.day2Par,
              day2HolePars: event.day2HolePars,
              day3StartTime: event.day3StartTime,
              day3StartPeriod: event.day3StartPeriod,
              day3Course: event.day3Course,
              day3StartType: event.day3StartType,
              day3LeadingHole: event.day3LeadingHole,
              day3Par: event.day3Par,
              day3HolePars: event.day3HolePars,
              flightACutoff: event.flightACutoff,
              flightBCutoff: event.flightBCutoff,
              flightATeebox: event.flightATeebox,
              flightBTeebox: event.flightBTeebox,
              flightLTeebox: event.flightLTeebox,
              registeredPlayers: event.registeredPlayers,
            },
            syncedBy: currentUser.id,
          });
          console.log('✅ Event synced');
        }
      } else {
        for (const event of events) {
          await syncEventMutation.mutateAsync({
            event: {
              id: event.id,
              name: event.name,
              date: event.date,
              venue: event.venue,
              status: event.status,
              startDate: event.startDate,
              endDate: event.endDate,
              location: event.location,
              course: event.course,
              description: event.description,
              memo: event.memo,
              registrationDeadline: event.registrationDeadline,
              maxParticipants: event.maxParticipants,
              createdAt: event.createdAt,
              createdBy: event.createdBy,
              type: event.type,
              photoUrl: event.photoUrl,
              entryFee: event.entryFee,
              numberOfDays: event.numberOfDays,
              address: event.address,
              city: event.city,
              state: event.state,
              zipcode: event.zipcode,
              day1StartTime: event.day1StartTime,
              day1StartPeriod: event.day1StartPeriod,
              day1Course: event.day1Course,
              day1StartType: event.day1StartType,
              day1LeadingHole: event.day1LeadingHole,
              day1Par: event.day1Par,
              day1HolePars: event.day1HolePars,
              day2StartTime: event.day2StartTime,
              day2StartPeriod: event.day2StartPeriod,
              day2Course: event.day2Course,
              day2StartType: event.day2StartType,
              day2LeadingHole: event.day2LeadingHole,
              day2Par: event.day2Par,
              day2HolePars: event.day2HolePars,
              day3StartTime: event.day3StartTime,
              day3StartPeriod: event.day3StartPeriod,
              day3Course: event.day3Course,
              day3StartType: event.day3StartType,
              day3LeadingHole: event.day3LeadingHole,
              day3Par: event.day3Par,
              day3HolePars: event.day3HolePars,
              flightACutoff: event.flightACutoff,
              flightBCutoff: event.flightBCutoff,
              flightATeebox: event.flightATeebox,
              flightBTeebox: event.flightBTeebox,
              flightLTeebox: event.flightLTeebox,
              registeredPlayers: event.registeredPlayers,
            },
            syncedBy: currentUser.id,
          });
        }
        console.log('✅ All events synced');
      }

      setLastSyncTime(new Date());
      Alert.alert('Success', 'Data synced successfully to server');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      Alert.alert('Error', 'Failed to sync data. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!currentUser?.isAdmin) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
        onPress={handleSync}
        disabled={isSyncing}
        testID="sync-button"
      >
        {isSyncing ? (
          <>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.syncButtonText}>Syncing...</Text>
          </>
        ) : (
          <>
            <Upload size={20} color="#FFFFFF" />
            <Text style={styles.syncButtonText}>
              {eventId ? 'Sync Event' : 'Sync All Data'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {lastSyncTime && (
        <View style={styles.lastSyncContainer}>
          <CheckCircle size={14} color="#10B981" />
          <Text style={styles.lastSyncText}>
            Synced {lastSyncTime.toLocaleTimeString()}
          </Text>
        </View>
      )}
    </View>
  );
}

export function SyncStatusIndicator({ eventId }: { eventId?: string }) {
  const syncStatusQuery = trpc.sync.status.useQuery({
    entityType: eventId ? 'event' : 'members',
    entityId: eventId,
  });

  if (syncStatusQuery.isLoading) {
    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator size="small" color="#6B7280" />
        <Text style={styles.statusText}>Checking sync status...</Text>
      </View>
    );
  }

  const syncStatus = syncStatusQuery.data;
  const isRecent = syncStatus && 
    (Date.now() - new Date(syncStatus.lastSyncedAt).getTime()) < 3600000;

  return (
    <View style={styles.statusContainer}>
      {syncStatus && isRecent ? (
        <>
          <CheckCircle size={16} color="#10B981" />
          <Text style={styles.statusTextSuccess}>
            Synced {new Date(syncStatus.lastSyncedAt).toLocaleString()}
          </Text>
        </>
      ) : syncStatus ? (
        <>
          <Clock size={16} color="#F59E0B" />
          <Text style={styles.statusTextWarning}>
            Last synced {new Date(syncStatus.lastSyncedAt).toLocaleString()}
          </Text>
        </>
      ) : (
        <>
          <AlertCircle size={16} color="#EF4444" />
          <Text style={styles.statusTextError}>Not synced yet</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  syncButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lastSyncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#10B981',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusTextSuccess: {
    fontSize: 14,
    color: '#10B981',
  },
  statusTextWarning: {
    fontSize: 14,
    color: '#F59E0B',
  },
  statusTextError: {
    fontSize: 14,
    color: '#EF4444',
  },
});
