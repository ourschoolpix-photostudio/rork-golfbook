import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getPayPalConfigProcedure = publicProcedure
  .query(async () => {
    try {
      const orgInfoData = await AsyncStorage.getItem('@organization_info');
      
      if (!orgInfoData) {
        return {
          clientId: '',
          clientSecret: '',
          mode: 'sandbox' as const,
        };
      }

      const orgInfo = JSON.parse(orgInfoData);

      return {
        clientId: orgInfo.paypalClientId || '',
        clientSecret: orgInfo.paypalClientSecret || '',
        mode: (orgInfo.paypalMode || 'sandbox') as 'sandbox' | 'live',
      };
    } catch (error) {
      console.error('[PayPal Config] Error fetching PayPal config:', error);
      return {
        clientId: '',
        clientSecret: '',
        mode: 'sandbox' as const,
      };
    }
  });

export default createTRPCRouter({
  getPayPalConfig: getPayPalConfigProcedure,
});
