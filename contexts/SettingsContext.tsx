import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('⏳ [SettingsContext] Loading settings from Supabase...');
      
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('⚠️ [SettingsContext] No settings found, using defaults');
          return;
        }
        console.error('❌ [SettingsContext] Failed to fetch settings:', error);
        return;
      }

      console.log('✅ [SettingsContext] Successfully fetched settings');
      if (data) {
        setOrgInfo({
          name: data.name || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zip_code || '',
          phone: data.phone || '',
          zellePhone: data.zelle_phone || '',
          logoUrl: data.logo_url || '',
          paypalClientId: data.paypal_client_id || '',
          paypalClientSecret: data.paypal_client_secret || '',
          paypalMode: (data.paypal_mode as 'sandbox' | 'live') || 'sandbox',
          rolexPlacementPoints: data.rolex_placement_points || Array(30).fill(''),
          rolexAttendancePoints: data.rolex_attendance_points || '',
          rolexBonusPoints: data.rolex_bonus_points || '',
        });
      }
    } catch (error) {
      console.error('❌ [SettingsContext] Exception fetching settings:', error);
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
    const settingsData: any = {};
    if (updates.name !== undefined) settingsData.name = updates.name;
    if (updates.address !== undefined) settingsData.address = updates.address;
    if (updates.city !== undefined) settingsData.city = updates.city;
    if (updates.state !== undefined) settingsData.state = updates.state;
    if (updates.zipCode !== undefined) settingsData.zip_code = updates.zipCode;
    if (updates.phone !== undefined) settingsData.phone = updates.phone;
    if (updates.zellePhone !== undefined) settingsData.zelle_phone = updates.zellePhone;
    if (updates.logoUrl !== undefined) settingsData.logo_url = updates.logoUrl;
    if (updates.paypalClientId !== undefined) settingsData.paypal_client_id = updates.paypalClientId;
    if (updates.paypalClientSecret !== undefined) settingsData.paypal_client_secret = updates.paypalClientSecret;
    if (updates.paypalMode !== undefined) settingsData.paypal_mode = updates.paypalMode;
    if (updates.rolexPlacementPoints !== undefined) settingsData.rolex_placement_points = updates.rolexPlacementPoints;
    if (updates.rolexAttendancePoints !== undefined) settingsData.rolex_attendance_points = updates.rolexAttendancePoints;
    if (updates.rolexBonusPoints !== undefined) settingsData.rolex_bonus_points = updates.rolexBonusPoints;

    const { data: existing } = await supabase
      .from('organization_settings')
      .select('id')
      .single();

    let error;
    if (existing) {
      const result = await supabase
        .from('organization_settings')
        .update(settingsData)
        .eq('id', existing.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('organization_settings')
        .insert([settingsData]);
      error = result.error;
    }

    if (error) {
      console.error('❌ [SettingsContext] Failed to update settings:', error);
      throw error;
    }

    await fetchSettings();
  }, [fetchSettings]);



  return useMemo(() => ({
    orgInfo,
    isLoading,
    refreshOrganizationInfo,
    updateOrganizationInfo,
  }), [orgInfo, isLoading, refreshOrganizationInfo, updateOrganizationInfo]);
});
