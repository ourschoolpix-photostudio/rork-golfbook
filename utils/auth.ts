import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';

const STORAGE_KEY = '@golf_current_user';

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      const user = JSON.parse(data);
      return {
        id: user.id,
        username: user.username || user.name,
        isAdmin: user.isAdmin || false,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  async setCurrentUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting current user:', error);
      throw error;
    }
  },

  async clearCurrentUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing current user:', error);
      throw error;
    }
  },
};
