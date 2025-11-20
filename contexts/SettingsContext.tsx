import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback } from 'react';
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
  const settingsQuery = trpc.settings.getSettings.useQuery();

  const updateSettingsMutation = trpc.settings.updateSettings.useMutation({
    onSuccess: () => {
      settingsQuery.refetch();
    },
  });

  const orgInfo = settingsQuery.data || DEFAULT_ORG_INFO;
  const isLoading = settingsQuery.isLoading;

  const refreshOrganizationInfo = useCallback(async () => {
    await settingsQuery.refetch();
  }, [settingsQuery]);

  const updateOrganizationInfo = useCallback(async (updates: Partial<OrganizationInfo>) => {
    await updateSettingsMutation.mutateAsync(updates);
  }, [updateSettingsMutation]);

  return useMemo(() => ({
    orgInfo,
    isLoading,
    refreshOrganizationInfo,
    updateOrganizationInfo,
  }), [orgInfo, isLoading, refreshOrganizationInfo, updateOrganizationInfo]);
});
