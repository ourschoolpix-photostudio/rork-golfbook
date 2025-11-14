import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useMemo, useCallback } from 'react';

interface OrganizationInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  zellePhone: string;
  logoUrl: string;
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
};

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo>(DEFAULT_ORG_INFO);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadOrganizationInfo();
  }, []);

  const loadOrganizationInfo = async () => {
    try {
      setIsLoading(true);
      const data = await AsyncStorage.getItem('@organization_info');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setOrgInfo(parsed);
        } catch (parseError) {
          console.error('Error parsing organization info, resetting to default:', parseError);
          await AsyncStorage.removeItem('@organization_info');
          setOrgInfo(DEFAULT_ORG_INFO);
        }
      }
    } catch (error) {
      console.error('Error loading organization info in context:', error);
      setOrgInfo(DEFAULT_ORG_INFO);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshOrganizationInfo = useCallback(async () => {
    await loadOrganizationInfo();
  }, []);

  return useMemo(() => ({
    orgInfo,
    isLoading,
    refreshOrganizationInfo,
  }), [orgInfo, isLoading, refreshOrganizationInfo]);
});
