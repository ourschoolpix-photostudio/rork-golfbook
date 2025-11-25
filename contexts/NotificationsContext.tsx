import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo } from 'react';
import { RegistrationNotification } from '@/types';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export const [NotificationsProvider, useNotifications] = createContextHook(() => {
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
