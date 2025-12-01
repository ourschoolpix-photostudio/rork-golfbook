import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'registration_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

export interface CachedRegistration {
  id: string;
  eventId: string;
  memberId: string;
  adjustedHandicap: string | null;
  playerPhone: string | null;
  status: string;
  paymentStatus: string | null;
  numberOfGuests: number;
  guestNames: string | null;
  isSponsor: boolean;
  registeredAt: string;
  cachedAt: number;
}

export interface RegistrationCacheData {
  registrations: CachedRegistration[];
  timestamp: number;
}

export const registrationCache = {
  async cacheRegistrations(eventId: string, registrations: any[]): Promise<void> {
    try {
      const cacheData: RegistrationCacheData = {
        registrations: registrations.map(reg => ({
          id: reg.id,
          eventId: reg.eventId || eventId,
          memberId: reg.memberId,
          adjustedHandicap: reg.adjustedHandicap,
          playerPhone: reg.playerPhone,
          status: reg.status,
          paymentStatus: reg.paymentStatus,
          numberOfGuests: reg.numberOfGuests || 0,
          guestNames: reg.guestNames,
          isSponsor: reg.isSponsor || false,
          registeredAt: reg.registeredAt,
          cachedAt: Date.now(),
        })),
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        `${CACHE_KEY_PREFIX}${eventId}`,
        JSON.stringify(cacheData)
      );
      console.log('[RegistrationCache] ✅ Cached', registrations.length, 'registrations for event', eventId);
    } catch (error) {
      console.error('[RegistrationCache] ❌ Failed to cache registrations:', error);
    }
  },

  async getCachedRegistrations(eventId: string): Promise<CachedRegistration[] | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${eventId}`);
      if (!cached) {
        console.log('[RegistrationCache] No cached registrations found for event', eventId);
        return null;
      }

      const cacheData: RegistrationCacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;

      if (age > CACHE_EXPIRY) {
        console.log('[RegistrationCache] Cache expired for event', eventId);
        await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${eventId}`);
        return null;
      }

      console.log('[RegistrationCache] ✅ Retrieved', cacheData.registrations.length, 'cached registrations for event', eventId);
      return cacheData.registrations;
    } catch (error) {
      console.error('[RegistrationCache] ❌ Failed to retrieve cached registrations:', error);
      return null;
    }
  },

  async getPlayerHandicap(eventId: string, memberId: string): Promise<string | null> {
    const cached = await this.getCachedRegistrations(eventId);
    if (!cached) return null;

    const registration = cached.find(reg => reg.memberId === memberId);
    return registration?.adjustedHandicap || null;
  },

  async clearCache(eventId?: string): Promise<void> {
    try {
      if (eventId) {
        await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${eventId}`);
        console.log('[RegistrationCache] ✅ Cleared cache for event', eventId);
      } else {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
        await AsyncStorage.multiRemove(cacheKeys);
        console.log('[RegistrationCache] ✅ Cleared all registration caches');
      }
    } catch (error) {
      console.error('[RegistrationCache] ❌ Failed to clear cache:', error);
    }
  },

  async getAllCachedEvents(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys
        .filter(key => key.startsWith(CACHE_KEY_PREFIX))
        .map(key => key.replace(CACHE_KEY_PREFIX, ''));
    } catch (error) {
      console.error('[RegistrationCache] ❌ Failed to get cached events:', error);
      return [];
    }
  },
};
