import { useCallback, useMemo, createContext, useContext, ReactNode, useEffect } from 'react';
import { RegistrationNotification } from '@/types';
import { trpc } from '@/lib/trpc';
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

  const notificationsQuery = trpc.notifications.getAll.useQuery(
    memberId ? { memberId } : undefined,
    {
      enabled: !!memberId,
      staleTime: 1000 * 60 * 5,
    }
  );

  useEffect(() => {
    if (notificationsQuery.data) {
      console.log('✅ [NotificationsContext] Successfully fetched notifications:', notificationsQuery.data.length);
    }
    if (notificationsQuery.error) {
      console.error('❌ [NotificationsContext] Failed to fetch notifications:', notificationsQuery.error);
    }
  }, [notificationsQuery.data, notificationsQuery.error]);

  const notifications = useMemo(() => notificationsQuery.data || [], [notificationsQuery.data]);

  const createNotificationMutation = trpc.notifications.create.useMutation({
    onSuccess: () => {
      console.log('✅ [NotificationsContext] Notification created successfully');
      notificationsQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [NotificationsContext] Failed to create notification:', error);
    },
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      console.log('✅ [NotificationsContext] Notification marked as read');
      notificationsQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [NotificationsContext] Failed to mark as read:', error);
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      console.log('✅ [NotificationsContext] All notifications marked as read');
      notificationsQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [NotificationsContext] Failed to mark all as read:', error);
    },
  });

  const deleteNotificationMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      console.log('✅ [NotificationsContext] Notification deleted');
      notificationsQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [NotificationsContext] Failed to delete notification:', error);
    },
  });

  const clearAllMutation = trpc.notifications.clearAll.useMutation({
    onSuccess: () => {
      console.log('✅ [NotificationsContext] All notifications cleared');
      notificationsQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [NotificationsContext] Failed to clear all notifications:', error);
    },
  });

  const addNotification = useCallback(
    async (notification: Omit<RegistrationNotification, 'id' | 'isRead' | 'createdAt'>) => {
      await createNotificationMutation.mutateAsync({
        memberId: notification.memberId,
        eventId: notification.eventId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
      });
    },
    [createNotificationMutation]
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await markAsReadMutation.mutateAsync({ notificationId });
    },
    [markAsReadMutation]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      await deleteNotificationMutation.mutateAsync({ notificationId });
    },
    [deleteNotificationMutation]
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync(memberId ? { memberId } : {});
  }, [memberId, markAllAsReadMutation]);

  const clearAll = useCallback(async () => {
    await clearAllMutation.mutateAsync(memberId ? { memberId } : {});
  }, [memberId, clearAllMutation]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    addNotification,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAll,
  }), [notifications, unreadCount, notificationsQuery.isLoading, addNotification, markAsRead, deleteNotification, markAllAsRead, clearAll]);

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
