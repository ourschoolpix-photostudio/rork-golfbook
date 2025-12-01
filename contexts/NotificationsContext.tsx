import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { RegistrationNotification } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';

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
        console.log('📥 [NotificationsContext] Fetching notifications from Supabase...');
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('member_id', memberId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const fetchedNotifications = (data || []).map((n: any) => ({
          id: n.id,
          memberId: n.member_id,
          eventId: n.event_id,
          type: n.type,
          title: n.title,
          message: n.message,
          isRead: n.is_read,
          metadata: n.metadata,
          createdAt: n.created_at,
        }));
        
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
          const { error } = await supabase.from('notifications').insert({
            member_id: notification.memberId,
            event_id: notification.eventId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            metadata: notification.metadata,
            is_read: false,
          });
          
          if (error) throw error;
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
          const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
          
          if (error) throw error;
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
          const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);
          
          if (error) throw error;
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
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('member_id', memberId);
        
        if (error) throw error;
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
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('member_id', memberId);
        
        if (error) throw error;
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
