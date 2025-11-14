import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineMode } from '@/contexts/OfflineModeContext';
import { syncPendingOperations } from '@/utils/offlineSync';

interface OfflineModeToggleProps {
  eventId?: string;
  position?: 'header' | 'footer';
}

export function OfflineModeToggle({ eventId, position = 'header' }: OfflineModeToggleProps) {
  const {
    isOfflineMode,
    isConnected,
    hasPendingChanges,
    pendingOperations,
    enableOfflineMode,
    disableOfflineMode,
    removePendingOperation,
    isSyncing,
    setIsSyncing,
    setPendingSyncTime,
  } = useOfflineMode();
  
  const [showModal, setShowModal] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const eventOperations = eventId 
    ? pendingOperations.filter(op => !op.eventId || op.eventId === eventId)
    : pendingOperations;

  const handleToggleOfflineMode = async () => {
    if (isOfflineMode) {
      if (hasPendingChanges && isConnected) {
        Alert.alert(
          'Pending Changes',
          `You have ${eventOperations.length} pending changes. Do you want to sync them now?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Sync & Go Online',
              onPress: async () => {
                await handleSync();
                await disableOfflineMode();
              },
            },
            {
              text: 'Go Online Without Syncing',
              style: 'destructive',
              onPress: async () => {
                await disableOfflineMode();
              },
            },
          ]
        );
      } else {
        await disableOfflineMode();
      }
    } else {
      Alert.alert(
        'Enable Offline Mode',
        'This will allow you to work without internet connection. All changes will be queued and synced when you go back online.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Enable',
            onPress: async () => {
              await enableOfflineMode();
            },
          },
        ]
      );
    }
  };

  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('No Connection', 'Cannot sync while offline. Please connect to the internet first.');
      return;
    }

    if (eventOperations.length === 0) {
      Alert.alert('No Changes', 'There are no pending changes to sync.');
      return;
    }

    try {
      setIsSyncing(true);
      setSyncProgress({ current: 0, total: eventOperations.length });
      
      const result = await syncPendingOperations(
        eventOperations,
        (operationId, success) => {
          if (success) {
            removePendingOperation(operationId);
            setSyncProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }
        }
      );

      setPendingSyncTime(new Date().toISOString());

      if (result.success) {
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${result.syncedCount} changes.`
        );
      } else {
        Alert.alert(
          'Sync Partially Complete',
          `Synced ${result.syncedCount} changes, ${result.failedCount} failed. Failed operations will be retried later.`
        );
      }
    } catch (error) {
      console.error('[OfflineModeToggle] Error during sync:', error);
      Alert.alert('Sync Error', 'Failed to sync changes. Please try again.');
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  };

  const handleShowDetails = () => {
    setShowModal(true);
  };

  const getStatusColor = () => {
    if (!isConnected) return '#EF4444';
    if (isOfflineMode) return '#FF9500';
    return '#34C759';
  };

  const getStatusText = () => {
    if (!isConnected) return 'No Connection';
    if (isOfflineMode) return 'Offline Mode';
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isConnected) return 'cloud-offline-outline';
    if (isOfflineMode) return 'cloud-offline';
    return 'cloud-done';
  };

  if (position === 'footer') {
    return (
      <>
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[styles.footerStatus, { backgroundColor: getStatusColor() }]}
            onPress={handleShowDetails}
          >
            <Ionicons name={getStatusIcon() as any} size={16} color="#fff" />
            <Text style={styles.footerStatusText}>{getStatusText()}</Text>
            {hasPendingChanges && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{eventOperations.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {hasPendingChanges && isConnected && !isSyncing && (
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSync}
            >
              <Ionicons name="sync" size={16} color="#fff" />
              <Text style={styles.syncButtonText}>Sync</Text>
            </TouchableOpacity>
          )}

          {isSyncing && (
            <View style={styles.syncingIndicator}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.syncingText}>
                {syncProgress.current}/{syncProgress.total}
              </Text>
            </View>
          )}
        </View>

        <Modal visible={showModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Offline Mode</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#1a1a1a" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <View style={[styles.statusCard, { backgroundColor: getStatusColor() }]}>
                  <Ionicons name={getStatusIcon() as any} size={32} color="#fff" />
                  <Text style={styles.statusCardTitle}>{getStatusText()}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Connection Status</Text>
                  <Text style={styles.infoText}>
                    {isConnected ? '✓ Connected to Internet' : '✗ No Internet Connection'}
                  </Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoTitle}>Pending Changes</Text>
                  <Text style={styles.infoText}>
                    {eventOperations.length > 0
                      ? `${eventOperations.length} change${eventOperations.length !== 1 ? 's' : ''} waiting to sync`
                      : 'No pending changes'}
                  </Text>
                </View>

                {eventOperations.length > 0 && (
                  <View style={styles.operationsList}>
                    <Text style={styles.operationsTitle}>Pending Operations:</Text>
                    {eventOperations.slice(0, 5).map(op => (
                      <View key={op.id} style={styles.operationItem}>
                        <Text style={styles.operationType}>{op.type.replace('_', ' ')}</Text>
                        <Text style={styles.operationTime}>
                          {new Date(op.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                    ))}
                    {eventOperations.length > 5 && (
                      <Text style={styles.moreText}>
                        +{eventOperations.length - 5} more
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: isOfflineMode ? '#34C759' : '#FF9500' },
                    ]}
                    onPress={() => {
                      setShowModal(false);
                      handleToggleOfflineMode();
                    }}
                  >
                    <Text style={styles.actionButtonText}>
                      {isOfflineMode ? 'Go Online' : 'Go Offline'}
                    </Text>
                  </TouchableOpacity>

                  {hasPendingChanges && isConnected && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#1976D2' }]}
                      onPress={() => {
                        setShowModal(false);
                        handleSync();
                      }}
                      disabled={isSyncing}
                    >
                      <Ionicons name="sync" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Sync Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.headerToggle, { backgroundColor: getStatusColor() }]}
      onPress={handleShowDetails}
    >
      <Ionicons name={getStatusIcon() as any} size={16} color="#fff" />
      {hasPendingChanges && (
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{eventOperations.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  footerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerStatus: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  footerStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1976D2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  syncingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  syncingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalContent: {
    padding: 20,
  },
  statusCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  operationsList: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  operationsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  operationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  operationType: {
    fontSize: 13,
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  operationTime: {
    fontSize: 12,
    color: '#999',
  },
  moreText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
