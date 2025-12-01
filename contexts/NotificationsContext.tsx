import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { RegistrationNotification } from '@/types';
import { trpcClient } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';

export const [NotificationsProvider, useNotifications] = createContextHook(() => {
  const { currentUser } = useAuth();
  const { orgInfo } = useSettings();
  const useLocalStorage = orgInfo?.useLocalStorage || false;
  const memberId = currentUser?.id;

  const [notifications, setNotifications] = useState<RegistrationNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchNotifications = useCallback(async () => {
    if (!memberId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      if (useLocalStorage) {
        console.log('📥 [NotificationsContext] Fetching notifications from local storage...');
        const fetchedNotifications = await localStorageService.notifications.getAll(memberId);
        console.log('✅ [NotificationsContext] Successfully fetched notifications from local storage:', fetchedNotifications.length);
        setNotifications(fetchedNotifications);
      } else {
        console.log('📥 [NotificationsContext] Fetching notifications via tRPC...');
        const fetchedNotifications = await trpcClient.notifications.getAll.query({ memberId });
        console.log('✅ [NotificationsContext] Successfully fetched notifications:', fetchedNotifications.length);
        setNotifications(fetchedNotifications);
      }
    } catch (error) {
      console.error('❌ [NotificationsContext] Failed to fetch notifications:', error);
      console.log('📥 [NotificationsContext] Falling back to local storage');
      
      try {
        const fallbackNotifications = await localStorageService.notifications.getAll(memberId);
        console.log('✅ [NotificationsContext] Successfully fetched notifications from local storage fallback:', fallbackNotifications.length);
        setNotifications(fallbackNotifications);
      } catch (fallbackError) {
        console.error('❌ [NotificationsContext] Fallback also failed:', fallbackError);
        setNotifications([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [memberId, useLocalStorage]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const addNotification = useCallback(
    async (notification: Omit<RegistrationNotification, 'id' | 'isRead' | 'createdAt'>) => {
      try {
        console.log('➕ [NotificationsContext] Creating notification');
        
        if (useLocalStorage) {
          const newNotification: RegistrationNotification = {
            id: `notification-${Date.now()}`,
            isRead: false,
            createdAt: new Date().toISOString(),
            ...notification,
          };
          await localStorageService.notifications.create(newNotification);
        } else {
          await trpcClient.notifications.create.mutate({
            memberId: notification.memberId,
            eventId: notification.eventId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            metadata: notification.metadata,
          });
        }
        
        console.log('✅ [NotificationsContext] Notification created successfully');
        await fetchNotifications();
      } catch (error) {
        console.error('❌ [NotificationsContext] Failed to create notification:', error);
        throw error;
      }
    },
    [fetchNotifications, useLocalStorage]
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        console.log('✏️ [NotificationsContext] Marking notification as read:', notificationId);
        
        if (useLocalStorage) {
          await localStorageService.notifications.markAsRead(notificationId);
        } else {
          await trpcClient.notifications.markAsRead.mutate({ notificationId });
        }
        
        console.log('✅ [NotificationsContext] Notification marked as read');
        await fetchNotifications();
      } catch (error) {
        console.error('❌ [NotificationsContext] Failed to mark as read:', error);
        throw error;
      }
    },
    [fetchNotifications, useLocalStorage]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        console.log('🗑️ [NotificationsContext] Deleting notification:', notificationId);
        
        if (useLocalStorage) {
          await localStorageService.notifications.delete(notificationId);
        } else {
          await trpcClient.notifications.delete.mutate({ notificationId });
        }
        
        console.log('✅ [NotificationsContext] Notification deleted');
        await fetchNotifications();
      } catch (error) {
        console.error('❌ [NotificationsContext] Failed to delete notification:', error);
        throw error;
      }
    },
    [fetchNotifications, useLocalStorage]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      console.log('✏️ [NotificationsContext] Marking all notifications as read');
      
      if (useLocalStorage) {
        await localStorageService.notifications.markAllAsRead(memberId);
      } else {
        await trpcClient.notifications.markAllAsRead.mutate(memberId ? { memberId } : {});
      }
      
      console.log('✅ [NotificationsContext] All notifications marked as read');
      await fetchNotifications();
    } catch (error) {
      console.error('❌ [NotificationsContext] Failed to mark all as read:', error);
      throw error;
    }
  }, [memberId, fetchNotifications, useLocalStorage]);

  const clearAll = useCallback(async () => {
    try {
      console.log('🗑️ [NotificationsContext] Clearing all notifications');
      
      if (useLocalStorage) {
        await localStorageService.notifications.clearAll(memberId);
      } else {
        await trpcClient.notifications.clearAll.mutate(memberId ? { memberId } : {});
      }
      
      console.log('✅ [NotificationsContext] All notifications cleared');
      await fetchNotifications();
    } catch (error) {
      console.error('❌ [NotificationsContext] Failed to clear all notifications:', error);
      throw error;
    }
  }, [memberId, fetchNotifications, useLocalStorage]);

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
