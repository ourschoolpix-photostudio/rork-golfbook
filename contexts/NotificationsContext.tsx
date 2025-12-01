import { useCallback, useMemo, createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { RegistrationNotification } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type NotificationsContextType = {
  notifications: RegistrationNotification[];
  unreadCount: number;
  isLoading: boolean;
  addNotification: (notification: Omit<RegistrationNotification, 'id' | 'isRead' | 'createdAt'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const memberId = currentUser?.id;
  const isUserLoggedIn = !!memberId;

  const [notifications, setNotifications] = useState<RegistrationNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    if (!isUserLoggedIn) return;
    
    try {
      setIsLoading(true);
      console.log('⏳ [NotificationsContext] Loading notifications from Supabase...');
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [NotificationsContext] Failed to fetch notifications:', error);
        return;
      }

      console.log('✅ [NotificationsContext] Successfully fetched notifications:', data?.length || 0);
      setNotifications(data || []);
    } catch (error) {
      console.error('❌ [NotificationsContext] Exception fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [memberId, isUserLoggedIn]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const addNotification = useCallback(
    async (notification: Omit<RegistrationNotification, 'id' | 'isRead' | 'createdAt'>) => {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          member_id: memberId,
          event_id: notification.eventId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata,
          is_read: false,
        }]);

      if (error) {
        console.error('❌ [NotificationsContext] Failed to add notification:', error);
        throw error;
      }

      await fetchNotifications();
    },
    [memberId, fetchNotifications]
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ [NotificationsContext] Failed to mark as read:', error);
        throw error;
      }

      await fetchNotifications();
    },
    [fetchNotifications]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('❌ [NotificationsContext] Failed to delete notification:', error);
        throw error;
      }

      await fetchNotifications();
    },
    [fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('member_id', memberId);

    if (error) {
      console.error('❌ [NotificationsContext] Failed to mark all as read:', error);
      throw error;
    }

    await fetchNotifications();
  }, [memberId, fetchNotifications]);

  const clearAll = useCallback(async () => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('member_id', memberId);

    if (error) {
      console.error('❌ [NotificationsContext] Failed to clear all notifications:', error);
      throw error;
    }

    await fetchNotifications();
  }, [memberId, fetchNotifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    addNotification,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAll,
  }), [notifications, unreadCount, isLoading, addNotification, markAsRead, deleteNotification, markAllAsRead, clearAll]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextType {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
