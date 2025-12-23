import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/integrations/supabase/client';

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
  fullMembershipPrice: string;
  basicMembershipPrice: string;
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
  fullMembershipPrice: '',
  basicMembershipPrice: '',
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
      
      console.log('📥 [SettingsContext] Fetching settings from Supabase...');
      const { data, error } = await supabase.from('organization_settings').select('*').single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      console.log('📥 [SettingsContext] Raw data from Supabase:', data);
      console.log('📥 [SettingsContext] PayPal fields:', {
        paypal_client_id: data?.paypal_client_id,
        paypal_client_secret: data?.paypal_client_secret,
        paypal_mode: data?.paypal_mode,
      });
      
      const settings = data ? {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zip_code,
        phone: data.phone,
        zellePhone: data.zelle_phone,
        logoUrl: data.logo_url,
        paypalClientId: (data.paypal_client_id || '').trim(),
        paypalClientSecret: (data.paypal_client_secret || '').trim(),
        paypalMode: data.paypal_mode || 'sandbox',
        rolexPlacementPoints: data.rolex_placement_points,
        rolexAttendancePoints: data.rolex_attendance_points,
        rolexBonusPoints: data.rolex_bonus_points,
        fullMembershipPrice: data.full_membership_price || '',
        basicMembershipPrice: data.basic_membership_price || '',
      } : {};
      
      console.log('✅ [SettingsContext] Successfully fetched settings');
      console.log('✅ [SettingsContext] Mapped settings:', {
        hasPaypalClientId: !!settings.paypalClientId,
        paypalClientIdLength: settings.paypalClientId?.length || 0,
        hasPaypalClientSecret: !!settings.paypalClientSecret,
        paypalClientSecretLength: settings.paypalClientSecret?.length || 0,
        paypalMode: settings.paypalMode,
      });
      
      const settingsWithDefaults: OrganizationInfo = {
        ...DEFAULT_ORG_INFO,
        ...settings,
      };
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsWithDefaults));
      setOrgInfo(settingsWithDefaults);
    } catch (error) {
      console.error('❌ [SettingsContext] Failed to fetch settings:', error instanceof Error ? error.message : JSON.stringify(error));
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
        console.error('❌ [SettingsContext] Failed to read from local storage:', storageError instanceof Error ? storageError.message : JSON.stringify(storageError));
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
        const supabaseUpdates: any = {};
        if (updates.name !== undefined) supabaseUpdates.name = updates.name;
        if (updates.address !== undefined) supabaseUpdates.address = updates.address;
        if (updates.city !== undefined) supabaseUpdates.city = updates.city;
        if (updates.state !== undefined) supabaseUpdates.state = updates.state;
        if (updates.zipCode !== undefined) supabaseUpdates.zip_code = updates.zipCode;
        if (updates.phone !== undefined) supabaseUpdates.phone = updates.phone;
        if (updates.zellePhone !== undefined) supabaseUpdates.zelle_phone = updates.zellePhone;
        if (updates.logoUrl !== undefined) supabaseUpdates.logo_url = updates.logoUrl;
        if (updates.paypalClientId !== undefined) supabaseUpdates.paypal_client_id = updates.paypalClientId;
        if (updates.paypalClientSecret !== undefined) supabaseUpdates.paypal_client_secret = updates.paypalClientSecret;
        if (updates.paypalMode !== undefined) supabaseUpdates.paypal_mode = updates.paypalMode;
        if (updates.rolexPlacementPoints !== undefined) supabaseUpdates.rolex_placement_points = updates.rolexPlacementPoints;
        if (updates.rolexAttendancePoints !== undefined) supabaseUpdates.rolex_attendance_points = updates.rolexAttendancePoints;
        if (updates.rolexBonusPoints !== undefined) supabaseUpdates.rolex_bonus_points = updates.rolexBonusPoints;
        if (updates.fullMembershipPrice !== undefined) supabaseUpdates.full_membership_price = updates.fullMembershipPrice;
        if (updates.basicMembershipPrice !== undefined) supabaseUpdates.basic_membership_price = updates.basicMembershipPrice;
        
        const { data: existingData } = await supabase.from('organization_settings').select('*').limit(1).single();
        
        if (existingData) {
          const { error } = await supabase.from('organization_settings').update(supabaseUpdates).eq('id', existingData.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('organization_settings').insert(supabaseUpdates);
          if (error) throw error;
        }
        
        console.log('✅ [SettingsContext] Settings updated successfully (backend)');
      } else {
        console.log('✅ [SettingsContext] Settings updated successfully (local storage)');
      }
      
      await fetchSettings();
    } catch (error) {
      console.error('❌ [SettingsContext] Exception updating settings:', error instanceof Error ? error.message : JSON.stringify(error));
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
