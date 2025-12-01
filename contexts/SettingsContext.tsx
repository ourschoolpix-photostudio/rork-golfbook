import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { trpcClient } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@golf_settings';

export interface OrganizationInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  zellePhone: string;
  logoUrl: string;
  paypalClientId: string;
  paypalClientSecret: string;
  paypalMode: 'sandbox' | 'live';
  rolexPlacementPoints: string[];
  rolexAttendancePoints: string;
  rolexBonusPoints: string;
  useLocalStorage?: boolean;
}

const DEFAULT_ORG_INFO: OrganizationInfo = {
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  zellePhone: '',
  logoUrl: '',
  paypalClientId: '',
  paypalClientSecret: '',
  paypalMode: 'sandbox',
  rolexPlacementPoints: Array(30).fill(''),
  rolexAttendancePoints: '',
  rolexBonusPoints: '',
  useLocalStorage: false,
};

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo>(DEFAULT_ORG_INFO);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const localStorageStr = await AsyncStorage.getItem(STORAGE_KEY);
      const localSettings = localStorageStr ? JSON.parse(localStorageStr) : null;
      
      if (localSettings?.useLocalStorage) {
        console.log('📥 [SettingsContext] Using local storage mode');
        setOrgInfo(localSettings);
        return;
      }
      
      console.log('📥 [SettingsContext] Fetching settings via tRPC...');
      const settings = await trpcClient.settings.getSettings.query();
      console.log('✅ [SettingsContext] Successfully fetched settings');
      
      const settingsWithDefaults: OrganizationInfo = {
        ...DEFAULT_ORG_INFO,
        ...settings,
      };
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsWithDefaults));
      setOrgInfo(settingsWithDefaults);
    } catch (error) {
      console.error('❌ [SettingsContext] Failed to fetch settings:', error);
      console.log('📥 [SettingsContext] Falling back to local storage or defaults');
      
      try {
        const localStorageStr = await AsyncStorage.getItem(STORAGE_KEY);
        const localSettings = localStorageStr ? JSON.parse(localStorageStr) : null;
        
        if (localSettings) {
          console.log('📥 [SettingsContext] Using cached settings from local storage');
          setOrgInfo(localSettings);
        } else {
          console.log('📥 [SettingsContext] Using default settings');
          setOrgInfo(DEFAULT_ORG_INFO);
        }
      } catch (storageError) {
        console.error('❌ [SettingsContext] Failed to read from local storage:', storageError);
        setOrgInfo(DEFAULT_ORG_INFO);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const refreshOrganizationInfo = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  const updateOrganizationInfo = useCallback(async (updates: Partial<OrganizationInfo>) => {
    try {
      console.log('✏️ [SettingsContext] Updating settings...');
      const newSettings = { ...orgInfo, ...updates };
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      
      if (!newSettings.useLocalStorage) {
        await trpcClient.settings.updateSettings.mutate(updates);
        console.log('✅ [SettingsContext] Settings updated successfully (backend)');
      } else {
        console.log('✅ [SettingsContext] Settings updated successfully (local storage)');
      }
      
      await fetchSettings();
    } catch (error) {
      console.error('❌ [SettingsContext] Exception updating settings:', error);
      throw error;
    }
  }, [fetchSettings, orgInfo]);

  return useMemo(() => ({
    orgInfo,
    isLoading,
    refreshOrganizationInfo,
    updateOrganizationInfo,
  }), [orgInfo, isLoading, refreshOrganizationInfo, updateOrganizationInfo]);
});
