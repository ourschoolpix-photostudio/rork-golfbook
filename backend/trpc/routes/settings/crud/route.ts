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

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.city !== undefined) updateData.city = input.city;
      if (input.state !== undefined) updateData.state = input.state;
      if (input.zipCode !== undefined) updateData.zip_code = input.zipCode;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.zellePhone !== undefined) updateData.zelle_phone = input.zellePhone;
      if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl;
      if (input.paypalClientId !== undefined) updateData.paypal_client_id = input.paypalClientId;
      if (input.paypalClientSecret !== undefined) updateData.paypal_client_secret = input.paypalClientSecret;
      if (input.paypalMode !== undefined) updateData.paypal_mode = input.paypalMode;
      if (input.rolexPlacementPoints !== undefined) updateData.rolex_placement_points = input.rolexPlacementPoints;
      if (input.rolexAttendancePoints !== undefined) updateData.rolex_attendance_points = input.rolexAttendancePoints;
      if (input.rolexBonusPoints !== undefined) updateData.rolex_bonus_points = input.rolexBonusPoints;

      console.log('[Settings] Update data prepared:', { ...updateData, paypal_client_secret: updateData.paypal_client_secret ? '[REDACTED]' : undefined });

      const { error } = await supabase
        .from('organization_settings')
        .update(updateData)
        .eq('id', SETTINGS_ID);

      if (error) {
        console.error('[Settings] Error updating settings:', error);
        console.error('[Settings] Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to update settings: ${error.message}`);
      }

      console.log('[Settings] ✅ Settings updated successfully');
      console.log('[Settings] PayPal mode is now:', input.paypalMode);

      return { success: true };
    } catch (error: any) {
      console.error('[Settings] Exception updating settings:', error);
      const message = error?.message || 'Failed to update settings';
      throw new Error(message);
    }
  });

export default createTRPCRouter({
  getSettings: getSettingsProcedure,
  updateSettings: updateSettingsProcedure,
});
