import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { X, AlertCircle, Info } from 'lucide-react-native';
import { useAlerts } from '@/contexts/AlertsContext';
import { Alert } from '@/types';
import { soundService } from '@/utils/soundService';

interface AlertsModalProps {
  visible: boolean;
  onClose: () => void;
  eventId?: string;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  visible,
  onClose,
  eventId,
}) => {
  const { getAlertsForEvent, getUndismissedAlerts, dismissAlert } = useAlerts();
  const [displayAlerts, setDisplayAlerts] = useState<Alert[]>([]);
  const hasCriticalAlerts = displayAlerts.some(a => a.priority === 'critical');
  const hasNonCriticalAlerts = displayAlerts.some(a => a.priority !== 'critical');
  const hasPlayedEmergencySound = useRef(false);
  const hasPlayedBellSound = useRef(false);

  useEffect(() => {
    if (visible) {
      if (eventId) {
        const eventAlerts = getAlertsForEvent(eventId);
        setDisplayAlerts(eventAlerts.filter(a => !a.isDismissed));
      } else {
        const allAlerts = getUndismissedAlerts();
        setDisplayAlerts(allAlerts);
      }
    } else {
      hasPlayedEmergencySound.current = false;
      hasPlayedBellSound.current = false;
    }
  }, [visible, eventId, getAlertsForEvent, getUndismissedAlerts]);

  useEffect(() => {
    if (visible && hasCriticalAlerts && !hasPlayedEmergencySound.current) {
      console.log('[AlertsModal] Critical alert detected, playing emergency sound');
      soundService.playEmergencySound();
      hasPlayedEmergencySound.current = true;
    }
  }, [visible, hasCriticalAlerts]);

  useEffect(() => {
    if (visible && eventId && hasNonCriticalAlerts && !hasCriticalAlerts && !hasPlayedBellSound.current) {
      console.log('[AlertsModal] Event-specific non-critical alert detected, playing bell notification');
      soundService.playBellNotification();
      hasPlayedBellSound.current = true;
    }
  }, [visible, eventId, hasNonCriticalAlerts, hasCriticalAlerts]);

  const handleDismiss = async (alertId: string) => {
    try {
      await dismissAlert(alertId);
      const updatedAlerts = displayAlerts.filter(a => a.id !== alertId);
      setDisplayAlerts(updatedAlerts);
      
      if (updatedAlerts.length === 0) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Alerts</Text>
            <TouchableOpacity
              onPress={hasCriticalAlerts ? undefined : onClose}
              style={[styles.closeButton, hasCriticalAlerts && styles.disabledButton]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={hasCriticalAlerts}
            >
              <View style={[styles.closeIconContainer, hasCriticalAlerts && styles.disabledIcon]}>
                <X size={20} color="#ffffff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>

          {hasCriticalAlerts && (
            <View style={styles.criticalNotice}>
              <AlertCircle size={18} color="#dc2626" strokeWidth={2.5} />
              <Text style={styles.criticalNoticeText}>
                Critical alerts must be dismissed individually before closing this panel.
              </Text>
            </View>
          )}

          <ScrollView style={styles.scrollView}>
            {displayAlerts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No alerts at this time</Text>
              </View>
            ) : (
              displayAlerts.map((alert) => (
                <View
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    alert.priority === 'critical' && styles.criticalCard,
                  ]}
                >
                  <View style={styles.alertContent}>
                    <View style={styles.alertHeader}>
                      <View style={styles.alertTitleRow}>
                        {alert.priority === 'critical' ? (
                          <AlertCircle size={20} color="#ef4444" strokeWidth={2.5} />
                        ) : (
                          <Info size={20} color="#3b82f6" strokeWidth={2.5} />
                        )}
                        <Text style={[
                          styles.alertTitle,
                          alert.priority === 'critical' && styles.criticalTitle
                        ]}>
                          {alert.title}
                        </Text>
                      </View>
                      <Text style={styles.timestamp}>
                        {formatDate(alert.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    {alert.priority === 'critical' && (
                      <View style={styles.criticalInstruction}>
                        <Text style={styles.criticalInstructionText}>
                          ⚠️ You must dismiss this critical alert to continue
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDismiss(alert.id)}
                    style={styles.dismissButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.dismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  alertCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  criticalCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  alertContent: {
    marginBottom: 12,
  },
  alertHeader: {
    marginBottom: 8,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#111827',
    flex: 1,
  },
  criticalTitle: {
    color: '#dc2626',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  alertMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  orgBadge: {
    backgroundColor: '#dbeafe',
  },
  eventBadge: {
    backgroundColor: '#f3e8ff',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#374151',
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#dc2626',
  },
  dismissButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.4,
  },
  disabledIcon: {
    backgroundColor: '#9ca3af',
  },
  criticalNotice: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  criticalNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#dc2626',
    lineHeight: 18,
  },
  criticalInstruction: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  criticalInstructionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#dc2626',
    textAlign: 'center',
  },
});
