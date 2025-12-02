import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Upload, CheckCircle, AlertCircle, Clock } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { supabaseService } from '@/utils/supabaseService';

interface SyncButtonProps {
  eventId?: string;
}

export function SyncButton({ eventId }: SyncButtonProps) {
  const { currentUser, members } = useAuth();
  const { events } = useEvents();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const handleSync = async () => {
    if (!currentUser?.isAdmin) {
      Alert.alert('Error', 'Only admins can sync data');
      return;
    }

    setIsSyncing(true);
    
    try {
      console.log('🔄 Starting sync process...');
      let syncedCount = 0;
      let failedCount = 0;

      console.log('📊 Syncing members to Supabase...');
      for (const member of members) {
        try {
          await supabaseService.members.update(member.id, member);
          syncedCount++;
        } catch (error) {
          console.error('❌ Failed to sync member:', member.id, error);
          failedCount++;
        }
      }
      console.log(`✅ Members synced: ${syncedCount} success, ${failedCount} failed`);

      if (eventId) {
        const event = events.find(e => e.id === eventId);
        if (event) {
          try {
            await supabaseService.events.update(event.id, event);
            console.log('✅ Event synced:', event.id);
            syncedCount++;
          } catch (error) {
            console.error('❌ Failed to sync event:', event.id, error);
            failedCount++;
          }
        }
      } else {
        console.log('📊 Syncing all events to Supabase...');
        for (const event of events) {
          try {
            await supabaseService.events.update(event.id, event);
            syncedCount++;
          } catch (error) {
            console.error('❌ Failed to sync event:', event.id, error);
            failedCount++;
          }
        }
        console.log(`✅ All events synced: ${syncedCount} success, ${failedCount} failed`);
      }

      const syncTime = new Date();
      setLastSyncTime(syncTime);
      
      const statusKey = `sync_status_${eventId || 'all'}`;
      await AsyncStorage.setItem(statusKey, JSON.stringify({
        lastSyncedAt: syncTime.toISOString(),
        syncedCount,
        failedCount
      }));
      
      if (failedCount === 0) {
        Alert.alert('Success', `Data synced successfully! ${syncedCount} items synced.`);
      } else {
        Alert.alert(
          'Sync Completed', 
          `${syncedCount} items synced successfully. ${failedCount} items failed to sync.`
        );
      }
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
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        setIsLoading(true);
        const statusKey = `sync_status_${eventId || 'all'}`;
        const storedStatus = await AsyncStorage.getItem(statusKey);
        
        if (storedStatus) {
          const parsed = JSON.parse(storedStatus);
          setLastSyncedAt(new Date(parsed.lastSyncedAt));
        }
      } catch (error) {
        console.error('Failed to load sync status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSyncStatus();
  }, [eventId]);

  if (isLoading) {
    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator size="small" color="#6B7280" />
        <Text style={styles.statusText}>Checking sync status...</Text>
      </View>
    );
  }

  const isRecent = lastSyncedAt && 
    (Date.now() - lastSyncedAt.getTime()) < 3600000;

  return (
    <View style={styles.statusContainer}>
      {lastSyncedAt && isRecent ? (
        <>
          <CheckCircle size={16} color="#10B981" />
          <Text style={styles.statusTextSuccess}>
            Synced {lastSyncedAt.toLocaleString()}
          </Text>
        </>
      ) : lastSyncedAt ? (
        <>
          <Clock size={16} color="#F59E0B" />
          <Text style={styles.statusTextWarning}>
            Last synced {lastSyncedAt.toLocaleString()}
          </Text>
        </>
      ) : (
        <>
          <AlertCircle size={16} color="#EF4444" />
          <Text style={styles.statusTextError}>Ready to sync</Text>
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
