import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { trpcClient } from '@/lib/trpc';

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
};

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo>(DEFAULT_ORG_INFO);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('📥 [SettingsContext] Fetching settings via tRPC...');
      
      const settings = await trpcClient.settings.getSettings.query();
      console.log('✅ [SettingsContext] Successfully fetched settings');
      
      const settingsWithDefaults: OrganizationInfo = {
        ...DEFAULT_ORG_INFO,
        ...settings,
      };
      setOrgInfo(settingsWithDefaults);
    } catch (error) {
      console.error('❌ [SettingsContext] Failed to fetch settings:', error);
      setOrgInfo(DEFAULT_ORG_INFO);
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

      await trpcClient.settings.updateSettings.mutate(updates);
      console.log('✅ [SettingsContext] Settings updated successfully');
      await fetchSettings();
    } catch (error) {
      console.error('❌ [SettingsContext] Exception updating settings:', error);
      throw error;
    }
  }, [fetchSettings]);

  return useMemo(() => ({
    orgInfo,
    isLoading,
    refreshOrganizationInfo,
    updateOrganizationInfo,
  }), [orgInfo, isLoading, refreshOrganizationInfo, updateOrganizationInfo]);
});
