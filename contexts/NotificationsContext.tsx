import { useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
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
  const isUserLoggedIn = !!memberId;

  const notificationsQuery = trpc.notifications.getAll.useQuery(
    { memberId },
    { enabled: isUserLoggedIn }
  );

  const createNotificationMutation = trpc.notifications.create.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
    },
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
    },
  });

  const deleteNotificationMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
    },
  });

  const clearAllMutation = trpc.notifications.clearAll.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
    },
  });

  const addNotification = useCallback(
    async (notification: Omit<RegistrationNotification, 'id' | 'isRead' | 'createdAt'>) => {
      await createNotificationMutation.mutateAsync({
        memberId,
        eventId: notification.eventId,
        type: notification.type as any,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
      });
    },
    [memberId, createNotificationMutation]
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
    await markAllAsReadMutation.mutateAsync({ memberId });
  }, [memberId, markAllAsReadMutation]);

  const clearAll = useCallback(async () => {
    await clearAllMutation.mutateAsync({ memberId });
  }, [memberId, clearAllMutation]);

  const notifications = useMemo(() => notificationsQuery.data || [], [notificationsQuery.data]);
  const isLoading = notificationsQuery.isLoading;
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
