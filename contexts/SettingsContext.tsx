import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

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
  const settingsQuery = trpc.settings.getSettings.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      console.log('✅ [SettingsContext] Successfully fetched settings');
    }
    if (settingsQuery.error) {
      console.error('❌ [SettingsContext] Failed to fetch settings:', settingsQuery.error);
    }
  }, [settingsQuery.data, settingsQuery.error]);

  const orgInfo = useMemo(() => {
    if (settingsQuery.data) {
      return {
        ...DEFAULT_ORG_INFO,
        ...settingsQuery.data,
      };
    }
    return DEFAULT_ORG_INFO;
  }, [settingsQuery.data]);

  const updateSettingsMutation = trpc.settings.updateSettings.useMutation({
    onSuccess: () => {
      console.log('✅ [SettingsContext] Settings updated successfully');
      settingsQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [SettingsContext] Failed to update settings:', error);
    },
  });

  const refreshOrganizationInfo = useCallback(async () => {
    await settingsQuery.refetch();
  }, [settingsQuery]);

  const updateOrganizationInfo = useCallback(async (updates: Partial<OrganizationInfo>) => {
    try {
      await updateSettingsMutation.mutateAsync(updates);
    } catch (error) {
      console.error('❌ [SettingsContext] Exception updating settings:', error);
      throw error;
    }
  }, [updateSettingsMutation]);

  return useMemo(() => ({
    orgInfo,
    isLoading: settingsQuery.isLoading,
    refreshOrganizationInfo,
    updateOrganizationInfo,
  }), [orgInfo, settingsQuery.isLoading, refreshOrganizationInfo, updateOrganizationInfo]);
});
