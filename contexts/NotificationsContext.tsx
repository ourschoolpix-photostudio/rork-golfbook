import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RegistrationNotification } from '@/types';

const NOTIFICATIONS_KEY = 'registration_notifications';

export const [NotificationsProvider, useNotifications] = createContextHook(() => {
  const [notifications, setNotifications] = useState<RegistrationNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotifications = async (notifs: RegistrationNotification[]) => {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
      setNotifications(notifs);
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const addNotification = useCallback(
    async (notification: Omit<RegistrationNotification, 'id' | 'isRead' | 'createdAt'>) => {
      const newNotification: RegistrationNotification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      const updated = [newNotification, ...notifications];
      await saveNotifications(updated);
    },
    [notifications]
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const updated = notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      await saveNotifications(updated);
    },
    [notifications]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const updated = notifications.filter(n => n.id !== notificationId);
      await saveNotifications(updated);
    },
    [notifications]
  );

  const markAllAsRead = useCallback(async () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    await saveNotifications(updated);
  }, [notifications]);

  const clearAll = useCallback(async () => {
    await saveNotifications([]);
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  return useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    addNotification,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAll,
  }), [notifications, unreadCount, isLoading, addNotification, markAsRead, deleteNotification, markAllAsRead, clearAll]);
});
