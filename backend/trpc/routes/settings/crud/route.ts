import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

const organizationSettingsSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  zellePhone: z.string().optional(),
  logoUrl: z.string().optional(),
  paypalClientId: z.string().optional(),
  paypalClientSecret: z.string().optional(),
  paypalMode: z.enum(['sandbox', 'live']).optional(),
  rolexPlacementPoints: z.array(z.string()).optional(),
  rolexAttendancePoints: z.string().optional(),
  rolexBonusPoints: z.string().optional(),
});

export const getSettingsProcedure = publicProcedure
  .query(async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single();

      if (error) {
        console.error('[Settings] Error fetching settings:', error);
        return {
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
          paypalMode: 'sandbox' as const,
        };
      }

      return {
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
        paypalMode: (data.paypal_mode || 'sandbox') as 'sandbox' | 'live',
        rolexPlacementPoints: (data.rolex_placement_points as string[]) || Array(30).fill(''),
        rolexAttendancePoints: data.rolex_attendance_points || '',
        rolexBonusPoints: data.rolex_bonus_points || '',
      };
    } catch (error) {
      console.error('[Settings] Exception fetching settings:', error);
      return {
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
        paypalMode: 'sandbox' as const,
      };
    }
  });

export const updateSettingsProcedure = publicProcedure
  .input(organizationSettingsSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('[Settings] Updating settings:', { ...input, paypalClientSecret: input.paypalClientSecret ? '[REDACTED]' : '' });

      const { error } = await supabase
        .from('organization_settings')
        .update({
          name: input.name,
          address: input.address,
          city: input.city,
          state: input.state,
          zip_code: input.zipCode,
          phone: input.phone,
          zelle_phone: input.zellePhone,
          logo_url: input.logoUrl,
          paypal_client_id: input.paypalClientId,
          paypal_client_secret: input.paypalClientSecret,
          paypal_mode: input.paypalMode,
          rolex_placement_points: input.rolexPlacementPoints,
          rolex_attendance_points: input.rolexAttendancePoints,
          rolex_bonus_points: input.rolexBonusPoints,
          updated_at: new Date().toISOString(),
        })
        .eq('id', SETTINGS_ID);

      if (error) {
        console.error('[Settings] Error updating settings:', error);
        throw new Error('Failed to update settings');
      }

      console.log('[Settings] ✅ Settings updated successfully');
      console.log('[Settings] PayPal mode is now:', input.paypalMode);

      return { success: true };
    } catch (error) {
      console.error('[Settings] Exception updating settings:', error);
      throw new Error('Failed to update settings');
    }
  });

export default createTRPCRouter({
  getSettings: getSettingsProcedure,
  updateSettings: updateSettingsProcedure,
});
