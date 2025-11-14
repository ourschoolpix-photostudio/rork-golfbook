import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { X, Trash2, CheckCheck } from 'lucide-react-native';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useRouter } from 'expo-router';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
}) => {
  const { notifications, markAsRead, deleteNotification, markAllAsRead, clearAll } = useNotifications();
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      markAllAsRead();
    }
  }, [visible]);

  const handleNotificationPress = (eventId: string) => {
    onClose();
    router.push(`/(event)/${eventId}/registration`);
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
            <Text style={styles.title}>Registration Notifications</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.closeIconContainer}>
                <X size={20} color="#ffffff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>

          {notifications.length > 0 && (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={clearAll}
                style={styles.clearButton}
              >
                <CheckCheck size={16} color="#10b981" />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.scrollView}>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No registration notifications</Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <View
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.isRead && styles.unreadCard,
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleNotificationPress(notification.eventId)}
                    style={styles.notificationContent}
                  >
                    <View style={styles.notificationHeader}>
                      <Text style={styles.eventName} numberOfLines={1}>
                        {notification.eventName}
                      </Text>
                      <Text style={styles.timestamp}>
                        {formatDate(notification.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.playerName}>{notification.playerName}</Text>
                    {notification.playerPhone && (
                      <Text style={styles.playerPhone}>{notification.playerPhone}</Text>
                    )}
                    <View style={styles.paymentBadge}>
                      <Text style={[
                        styles.paymentText,
                        notification.paymentMethod === 'paypal' && styles.paypalText
                      ]}>
                        {notification.paymentMethod === 'zelle' ? 'Zelle - Unpaid' : 'PayPal - Paid'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteNotification(notification.id)}
                    style={styles.deleteButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={18} color="#ef4444" />
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10b981',
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
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  unreadCard: {
    backgroundColor: '#eff6ff',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#374151',
  },
  playerPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  paymentText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#f59e0b',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#fffbeb',
    borderRadius: 6,
    overflow: 'hidden' as const,
  },
  paypalText: {
    color: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});
