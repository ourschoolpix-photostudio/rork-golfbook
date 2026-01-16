import AsyncStorage from '@react-native-async-storage/async-storage';
import { Member, Event, PersonalGame, RegistrationNotification, Alert, AlertTemplate, AlertDismissal } from '@/types';

const STORAGE_KEYS = {
  MEMBERS: '@golf_local_members',
  EVENTS: '@golf_local_events',
  GAMES: '@golf_local_games',
  NOTIFICATIONS: '@golf_local_notifications',
  ALERTS: '@golf_local_alerts',
  ALERT_TEMPLATES: '@golf_local_alert_templates',
  ALERT_DISMISSALS: '@golf_local_alert_dismissals',
} as const;

export const localStorageService = {
  members: {
    async getAll(): Promise<Member[]> {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.MEMBERS);
        if (!data) return [];
        
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          console.error('❌ [LocalStorage] Members data is not an array, resetting');
          await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
          return [];
        } catch (parseError) {
          console.error('❌ [LocalStorage] Failed to parse members JSON:', parseError);
          console.error('❌ [LocalStorage] Corrupted data:', data?.substring(0, 100));
          await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
          return [];
        }
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to get members:', error);
        return [];
      }
    },

    async create(member: Member): Promise<void> {
      try {
        const members = await this.getAll();
        const exists = members.find(m => m.id === member.id);
        if (exists) {
          throw new Error(`Member with id ${member.id} already exists`);
        }
        members.push(member);
        await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
        console.log('✅ [LocalStorage] Member created:', member.name);
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to create member:', error);
        throw error;
      }
    },

    async update(memberId: string, updates: Partial<Member>): Promise<void> {
      try {
        const members = await this.getAll();
        const index = members.findIndex(m => m.id === memberId);
        if (index === -1) {
          throw new Error(`Member with id ${memberId} not found`);
        }
        members[index] = { ...members[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
        console.log('✅ [LocalStorage] Member updated:', memberId);
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to update member:', error);
        throw error;
      }
    },

    async delete(memberId: string): Promise<void> {
      try {
        const members = await this.getAll();
        const filtered = members.filter(m => m.id !== memberId);
        await AsyncStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(filtered));
        console.log('✅ [LocalStorage] Member deleted:', memberId);
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to delete member:', error);
        throw error;
      }
    },
  },

  events: {
    async getAll(): Promise<Event[]> {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
        if (!data) return [];
        
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          console.error('❌ [LocalStorage] Events data is not an array, resetting');
          await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
          return [];
        } catch (parseError) {
          console.error('❌ [LocalStorage] Failed to parse events JSON:', parseError);
          console.error('❌ [LocalStorage] Corrupted data:', data?.substring(0, 100));
          await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
          return [];
        }
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to get events:', error);
        return [];
      }
    },

    async create(event: Event): Promise<void> {
      try {
        const events = await this.getAll();
        const exists = events.find(e => e.id === event.id);
        if (exists) {
          throw new Error(`Event with id ${event.id} already exists`);
        }
        events.push(event);
        await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
        console.log('✅ [LocalStorage] Event created:', event.name);
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to create event:', error);
        throw error;
      }
    },

    async update(eventId: string, updates: Partial<Event>): Promise<void> {
      try {
        const events = await this.getAll();
        const index = events.findIndex(e => e.id === eventId);
        if (index === -1) {
          throw new Error(`Event with id ${eventId} not found`);
        }
        events[index] = { ...events[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
        console.log('✅ [LocalStorage] Event updated:', eventId);
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to update event:', error);
        throw error;
      }
    },

    async delete(eventId: string): Promise<void> {
      try {
        const events = await this.getAll();
        const filtered = events.filter(e => e.id !== eventId);
        await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(filtered));
        console.log('✅ [LocalStorage] Event deleted:', eventId);
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to delete event:', error);
        throw error;
      }
    },
  },

  games: {
    async getAll(memberId?: string): Promise<PersonalGame[]> {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.GAMES);
        if (!data) return [];
        
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          console.error('❌ [LocalStorage] Games data is not an array, resetting');
          await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify([]));
          return [];
        } catch (parseError) {
          console.error('❌ [LocalStorage] Failed to parse games JSON:', parseError);
          console.error('❌ [LocalStorage] Corrupted data:', data?.substring(0, 100));
          await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify([]));
          return [];
        }
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to get games:', error);
        return [];
      }
    },

    async create(game: PersonalGame): Promise<{ id: string }> {
      try {
        const games = await this.getAll();
        games.push(game);
        await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
        console.log('✅ [LocalStorage] Game created:', game.id);
        return { id: game.id };
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to create game:', error);
        throw error;
      }
    },

    async update(gameId: string, updates: Partial<PersonalGame>): Promise<void> {
      try {
        const games = await this.getAll();
        const index = games.findIndex(g => g.id === gameId);
        if (index === -1) {
          throw new Error(`Game with id ${gameId} not found`);
        }
        games[index] = { ...games[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
        console.log('✅ [LocalStorage] Game updated:', gameId);
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to update game:', error);
        throw error;
      }
    },

    async delete(gameId: string): Promise<void> {
      try {
        const games = await this.getAll();
        const filtered = games.filter(g => g.id !== gameId);
        await AsyncStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(filtered));
        console.log('✅ [LocalStorage] Game deleted:', gameId);
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to delete game:', error);
        throw error;
      }
    },
  },

  notifications: {
    async getAll(memberId?: string): Promise<RegistrationNotification[]> {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        if (!data) return [];
        
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            const allNotifications = parsed;
            if (memberId) {
              return allNotifications.filter(n => n.memberId === memberId);
            }
            return allNotifications;
          }
          console.error('❌ [LocalStorage] Notifications data is not an array, resetting');
          await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
          return [];
        } catch (parseError) {
          console.error('❌ [LocalStorage] Failed to parse notifications JSON:', parseError);
          console.error('❌ [LocalStorage] Corrupted data:', data?.substring(0, 100));
          await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
          return [];
        }
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to get notifications:', error);
        return [];
      }
    },

    async create(notification: RegistrationNotification): Promise<void> {
      try {
        const notifications = await this.getAll();
        notifications.push(notification);
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        console.log('✅ [LocalStorage] Notification created');
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to create notification:', error);
        throw error;
      }
    },

    async markAsRead(notificationId: string): Promise<void> {
      try {
        const notifications = await this.getAll();
        const index = notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
          notifications[index].isRead = true;
          await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
          console.log('✅ [LocalStorage] Notification marked as read');
        }
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to mark notification as read:', error);
        throw error;
      }
    },

    async markAllAsRead(memberId?: string): Promise<void> {
      try {
        const notifications = await this.getAll();
        const updated = notifications.map(n => {
          if (!memberId || n.memberId === memberId) {
            return { ...n, isRead: true };
          }
          return n;
        });
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
        console.log('✅ [LocalStorage] All notifications marked as read');
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to mark all as read:', error);
        throw error;
      }
    },

    async delete(notificationId: string): Promise<void> {
      try {
        const notifications = await this.getAll();
        const filtered = notifications.filter(n => n.id !== notificationId);
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(filtered));
        console.log('✅ [LocalStorage] Notification deleted');
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to delete notification:', error);
        throw error;
      }
    },

    async clearAll(memberId?: string): Promise<void> {
      try {
        if (memberId) {
          const notifications = await this.getAll();
          const filtered = notifications.filter(n => n.memberId !== memberId);
          await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(filtered));
        } else {
          await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
        }
        console.log('✅ [LocalStorage] Notifications cleared');
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to clear notifications:', error);
        throw error;
      }
    },
  },

  alerts: {
    async getAll(): Promise<Alert[]> {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.ALERTS);
        if (!data) return [];
        
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          console.error('❌ [LocalStorage] Alerts data is not an array, resetting');
          await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify([]));
          return [];
        } catch (parseError) {
          console.error('❌ [LocalStorage] Failed to parse alerts JSON:', parseError);
          await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify([]));
          return [];
        }
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to get alerts:', error);
        return [];
      }
    },

    async create(alert: Alert): Promise<void> {
      try {
        const alerts = await this.getAll();
        alerts.push(alert);
        await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
        console.log('✅ [LocalStorage] Alert created');
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to create alert:', error);
        throw error;
      }
    },

    async delete(alertId: string): Promise<void> {
      try {
        const alerts = await this.getAll();
        const filtered = alerts.filter(a => a.id !== alertId);
        await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(filtered));
        console.log('✅ [LocalStorage] Alert deleted');
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to delete alert:', error);
        throw error;
      }
    },
  },

  alertTemplates: {
    async getAll(): Promise<AlertTemplate[]> {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.ALERT_TEMPLATES);
        if (!data) {
          const defaultTemplates: AlertTemplate[] = [
            {
              id: 'template-1',
              name: 'Rule Change',
              title: 'Important Rule Change',
              message: 'Please note the following rule change for this tournament: [INSERT RULE CHANGE]',
              priority: 'critical',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'template-2',
              name: 'Schedule Update',
              title: 'Schedule Update',
              message: 'The tournament schedule has been updated. Please review the new times.',
              priority: 'normal',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'template-3',
              name: 'Weather Alert',
              title: 'Weather Alert',
              message: 'Weather conditions may affect play. Please check with tournament officials.',
              priority: 'critical',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'template-4',
              name: 'Payment Reminder',
              title: 'Payment Due',
              message: 'Reminder: Payment is due for this event. Please settle your balance.',
              priority: 'normal',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'template-5',
              name: 'General Announcement',
              title: 'Announcement',
              message: '[INSERT ANNOUNCEMENT MESSAGE]',
              priority: 'normal',
              createdAt: new Date().toISOString(),
            },
          ];
          await AsyncStorage.setItem(STORAGE_KEYS.ALERT_TEMPLATES, JSON.stringify(defaultTemplates));
          return defaultTemplates;
        }
        
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          console.error('❌ [LocalStorage] Alert templates data is not an array, resetting');
          await AsyncStorage.setItem(STORAGE_KEYS.ALERT_TEMPLATES, JSON.stringify([]));
          return [];
        } catch (parseError) {
          console.error('❌ [LocalStorage] Failed to parse alert templates JSON:', parseError);
          await AsyncStorage.setItem(STORAGE_KEYS.ALERT_TEMPLATES, JSON.stringify([]));
          return [];
        }
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to get alert templates:', error);
        return [];
      }
    },

    async create(template: AlertTemplate): Promise<void> {
      try {
        const templates = await this.getAll();
        templates.push(template);
        await AsyncStorage.setItem(STORAGE_KEYS.ALERT_TEMPLATES, JSON.stringify(templates));
        console.log('✅ [LocalStorage] Alert template created');
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to create alert template:', error);
        throw error;
      }
    },

    async delete(templateId: string): Promise<void> {
      try {
        const templates = await this.getAll();
        const filtered = templates.filter(t => t.id !== templateId);
        await AsyncStorage.setItem(STORAGE_KEYS.ALERT_TEMPLATES, JSON.stringify(filtered));
        console.log('✅ [LocalStorage] Alert template deleted');
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to delete alert template:', error);
        throw error;
      }
    },
  },

  alertDismissals: {
    async getAll(): Promise<AlertDismissal[]> {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.ALERT_DISMISSALS);
        if (!data) return [];
        
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          console.error('❌ [LocalStorage] Alert dismissals data is not an array, resetting');
          await AsyncStorage.setItem(STORAGE_KEYS.ALERT_DISMISSALS, JSON.stringify([]));
          return [];
        } catch (parseError) {
          console.error('❌ [LocalStorage] Failed to parse alert dismissals JSON:', parseError);
          await AsyncStorage.setItem(STORAGE_KEYS.ALERT_DISMISSALS, JSON.stringify([]));
          return [];
        }
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to get alert dismissals:', error);
        return [];
      }
    },

    async getByMember(memberId: string): Promise<AlertDismissal[]> {
      try {
        const dismissals = await this.getAll();
        return dismissals.filter(d => d.memberId === memberId);
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to get alert dismissals by member:', error);
        return [];
      }
    },

    async create(dismissal: AlertDismissal): Promise<void> {
      try {
        const dismissals = await this.getAll();
        const exists = dismissals.find(d => d.alertId === dismissal.alertId && d.memberId === dismissal.memberId);
        if (!exists) {
          dismissals.push(dismissal);
          await AsyncStorage.setItem(STORAGE_KEYS.ALERT_DISMISSALS, JSON.stringify(dismissals));
          console.log('✅ [LocalStorage] Alert dismissal created');
        }
      } catch (error) {
        console.error('❌ [LocalStorage] Failed to create alert dismissal:', error);
        throw error;
      }
    },
  },
};
