import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
}

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

const getPayPalConfig = async (): Promise<PayPalConfig> => {
  try {
    console.log('[PayPal Config] 🔍 Fetching PayPal config from database...');
    
    const { data, error } = await supabase
      .from('organization_settings')
      .select('paypal_client_id, paypal_client_secret, paypal_mode')
      .eq('id', SETTINGS_ID)
      .single();

    if (error) {
      console.error('[PayPal Config] ❌ Error fetching from database:', error);
      throw error;
    }

    const clientId = (data?.paypal_client_id || '').trim();
    const clientSecret = (data?.paypal_client_secret || '').trim();
    const mode = (data?.paypal_mode || 'sandbox') as 'sandbox' | 'live';

    console.log('========================================');
    console.log('[PayPal Config] 🔑 Using database credentials');
    console.log('[PayPal Config] CLIENT_ID exists:', !!clientId);
    console.log('[PayPal Config] CLIENT_ID (first 20 chars):', clientId?.substring(0, 20));
    console.log('[PayPal Config] CLIENT_ID (last 10 chars):', clientId?.substring(clientId.length - 10));
    console.log('[PayPal Config] CLIENT_SECRET exists:', !!clientSecret);
    console.log('[PayPal Config] CLIENT_SECRET length:', clientSecret?.length);
    console.log('[PayPal Config] ⚠️⚠️⚠️ CURRENT MODE:', mode);
    console.log('[PayPal Config] ⚠️⚠️⚠️ WILL USE:', mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
    console.log('========================================');

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured in database');
    }

    return {
      clientId,
      clientSecret,
      mode,
    };
  } catch (error) {
    console.error('[PayPal Config] ❌ Error loading config from database:', error);
    throw new Error('Failed to load PayPal configuration from database');
  }
};

const getPayPalAccessToken = async (): Promise<string> => {
  const config = await getPayPalConfig();
  const PAYPAL_API_BASE = config.mode === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
  console.log('[PayPal] Getting access token...');
  
  if (!config.clientId || !config.clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  console.log('[PayPal] Client ID (first 20):', config.clientId.substring(0, 20) + '...');
  console.log('[PayPal] Client ID (last 10):', '...' + config.clientId.substring(config.clientId.length - 10));
  console.log('[PayPal] Client Secret length:', config.clientSecret.length);
  console.log('[PayPal] Auth endpoint:', `${PAYPAL_API_BASE}/v1/oauth2/token`);

  const authString = `${config.clientId}:${config.clientSecret}`;
  console.log('[PayPal] Auth string length (before encoding):', authString.length);
  const auth = Buffer.from(authString).toString('base64');
  console.log('[PayPal] Auth header (base64) length:', auth.length);
  console.log('[PayPal] Auth header (first 30):', auth.substring(0, 30) + '...');
  
  try {
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    console.log('[PayPal] Token response status:', response.status);
    console.log('[PayPal] Token response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[PayPal] Token response body:', responseText);

    if (!response.ok) {
      console.error('[PayPal] Failed to get access token. Status:', response.status);
      console.error('[PayPal] Error response:', responseText);
      
      let errorDetails = '';
      try {
        const errorData = JSON.parse(responseText);
        errorDetails = JSON.stringify(errorData, null, 2);
        console.error('[PayPal] Parsed error data:', errorDetails);
      } catch (_e) {
        errorDetails = responseText;
      }
      
      throw new Error(`Failed to get PayPal access token. Status: ${response.status}, Details: ${errorDetails}`);
    }

    const data = JSON.parse(responseText);
    console.log('[PayPal] Access token obtained successfully');
    console.log('[PayPal] Token type:', data.token_type);
    console.log('[PayPal] Expires in:', data.expires_in);
    return data.access_token;
  } catch (error) {
    console.error('[PayPal] Exception during token fetch:', error);
    console.error('[PayPal] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    if (error instanceof Error) {
      console.error('[PayPal] Error message:', error.message);
      console.error('[PayPal] Error stack:', error.stack);
    }
    throw error;
  }
};

export const createPaymentProcedure = publicProcedure
  .input(z.object({
    amount: z.number(),
    eventName: z.string(),
    eventId: z.string(),
    playerEmail: z.string().email(),
  }))
  .mutation(async ({ input }) => {
    const config = await getPayPalConfig();
    const PAYPAL_API_BASE = config.mode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    console.log('========================================');
    console.log('[PayPal] ⚠️ CURRENT MODE:', config.mode);
    console.log('[PayPal] ⚠️ API BASE URL:', PAYPAL_API_BASE);
    console.log('[PayPal] Creating payment order:', {
      amount: input.amount,
      eventName: input.eventName,
      eventId: input.eventId,
      mode: config.mode,
      apiBase: PAYPAL_API_BASE,
    });
    console.log('========================================');

    try {
      const accessToken = await getPayPalAccessToken();
      console.log('[PayPal] Access token obtained, length:', accessToken.length);

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: input.amount.toFixed(2),
          },
          description: `Registration for ${input.eventName}`,
          custom_id: input.eventId,
        }],
        application_context: {
          brand_name: 'Golf Tournament',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: 'https://api.j382mhvmbvtqiifrytg5g.rork.app',
          cancel_url: 'https://api.j382mhvmbvtqiifrytg5g.rork.app',
        },
      };

      console.log('[PayPal] Order data:', JSON.stringify(orderData, null, 2));

      const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      console.log('[PayPal] Order creation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PayPal] Failed to create order. Status:', response.status);
        console.error('[PayPal] Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('[PayPal] Parsed error:', JSON.stringify(errorData, null, 2));
        } catch (_e) {
          console.error('[PayPal] Could not parse error as JSON');
        }
        throw new Error(`Failed to create PayPal order: ${response.status} - ${errorText}`);
      }

      const order = await response.json();
      console.log('[PayPal] Order created successfully:', order.id);
      console.log('[PayPal] Full order response:', JSON.stringify(order, null, 2));

      const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href;
      console.log('[PayPal] Approval URL:', approvalUrl);
      console.log('[PayPal] ⚠️⚠️⚠️ APPROVAL URL DOMAIN:', approvalUrl?.includes('sandbox') ? 'SANDBOX' : 'LIVE');

      if (!approvalUrl) {
        console.error('[PayPal] No approval URL found in order links:', order.links);
        throw new Error('PayPal did not return an approval URL');
      }

      return {
        orderId: order.id,
        approvalUrl,
        status: order.status,
      };
    } catch (error) {
      console.error('[PayPal] Error creating payment:', error);
      console.error('[PayPal] Error details:', error instanceof Error ? error.stack : 'Unknown error');
      throw new Error(`PayPal payment creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

export const capturePaymentProcedure = publicProcedure
  .input(z.object({
    orderId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const config = await getPayPalConfig();
    const PAYPAL_API_BASE = config.mode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    console.log('[PayPal] Capturing payment for order:', input.orderId);
    console.log('[PayPal] Using API base:', PAYPAL_API_BASE);

    try {
      const accessToken = await getPayPalAccessToken();
      console.log('[PayPal] Access token obtained for capture');

      const captureUrl = `${PAYPAL_API_BASE}/v2/checkout/orders/${input.orderId}/capture`;
      console.log('[PayPal] Capture URL:', captureUrl);

      const response = await fetch(captureUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[PayPal] Capture response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PayPal] Failed to capture payment. Status:', response.status);
        console.error('[PayPal] Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          console.error('[PayPal] Parsed error:', JSON.stringify(errorData, null, 2));
        } catch (_e) {
          console.error('[PayPal] Could not parse error as JSON');
        }
        throw new Error(`Failed to capture PayPal payment: ${response.status} - ${errorText}`);
      }

      const capture = await response.json();
      console.log('[PayPal] Payment captured successfully');
      console.log('[PayPal] Full capture response:', JSON.stringify(capture, null, 2));

      return {
        success: true,
        captureId: capture.id,
        status: capture.status,
        payerId: capture.payer?.payer_id,
        payerEmail: capture.payer?.email_address,
      };
    } catch (error) {
      console.error('[PayPal] Error capturing payment:', error);
      console.error('[PayPal] Error details:', error instanceof Error ? error.stack : 'Unknown error');
      throw new Error(`PayPal payment capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

export default createTRPCRouter({
  createPayment: createPaymentProcedure,
  capturePayment: capturePaymentProcedure,
});
