import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback, useEffect, useState } from 'react';
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('📥 [SettingsContext] Fetching settings from Supabase...');
      
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ [SettingsContext] No settings found, using defaults');
          setOrgInfo(DEFAULT_ORG_INFO);
          return;
        }
        console.error('❌ [SettingsContext] Failed to fetch settings:', error);
        throw error;
      }

      const settings: OrganizationInfo = {
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
        paypalMode: data.paypal_mode || 'sandbox',
        rolexPlacementPoints: data.rolex_placement_points || Array(30).fill(''),
        rolexAttendancePoints: data.rolex_attendance_points || '',
        rolexBonusPoints: data.rolex_bonus_points || '',
      };

      console.log('✅ [SettingsContext] Successfully fetched settings');
      setOrgInfo(settings);
    } catch (error) {
      console.error('❌ [SettingsContext] Exception fetching settings:', error);
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

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.zipCode !== undefined) updateData.zip_code = updates.zipCode;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.zellePhone !== undefined) updateData.zelle_phone = updates.zellePhone;
      if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;
      if (updates.paypalClientId !== undefined) updateData.paypal_client_id = updates.paypalClientId;
      if (updates.paypalClientSecret !== undefined) updateData.paypal_client_secret = updates.paypalClientSecret;
      if (updates.paypalMode !== undefined) updateData.paypal_mode = updates.paypalMode;
      if (updates.rolexPlacementPoints !== undefined) updateData.rolex_placement_points = updates.rolexPlacementPoints;
      if (updates.rolexAttendancePoints !== undefined) updateData.rolex_attendance_points = updates.rolexAttendancePoints;
      if (updates.rolexBonusPoints !== undefined) updateData.rolex_bonus_points = updates.rolexBonusPoints;

      updateData.updated_at = new Date().toISOString();

      const { data: existingSettings } = await supabase
        .from('settings')
        .select('id')
        .single();

      if (existingSettings) {
        const { error } = await supabase
          .from('settings')
          .update(updateData)
          .eq('id', existingSettings.id);

        if (error) {
          console.error('❌ [SettingsContext] Failed to update settings:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({
            ...updateData,
            id: 'org-settings',
          });

        if (error) {
          console.error('❌ [SettingsContext] Failed to create settings:', error);
          throw error;
        }
      }

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
