import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";

console.log('[PayPal Config Debug] process.env.PAYPAL_CLIENT_ID:', process.env.PAYPAL_CLIENT_ID);
console.log('[PayPal Config Debug] process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID:', process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID);
console.log('[PayPal Config Debug] All env keys with PAYPAL:', Object.keys(process.env).filter(k => k.includes('PAYPAL')));

const PAYPAL_CLIENT_ID = (process.env.PAYPAL_CLIENT_ID || process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID || '').trim().replace(/\r/g, '');
const PAYPAL_CLIENT_SECRET = (process.env.PAYPAL_CLIENT_SECRET || process.env.EXPO_PUBLIC_PAYPAL_CLIENT_SECRET || '').trim().replace(/\r/g, '');
const PAYPAL_MODE = (process.env.PAYPAL_MODE || process.env.EXPO_PUBLIC_PAYPAL_MODE || 'sandbox').trim();
const PAYPAL_API_BASE = PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

console.log('[PayPal Config] CLIENT_ID exists:', !!PAYPAL_CLIENT_ID);
console.log('[PayPal Config] CLIENT_ID (first 20 chars):', PAYPAL_CLIENT_ID?.substring(0, 20));
console.log('[PayPal Config] CLIENT_ID length:', PAYPAL_CLIENT_ID?.length);
console.log('[PayPal Config] CLIENT_SECRET exists:', !!PAYPAL_CLIENT_SECRET);
console.log('[PayPal Config] CLIENT_SECRET (last 4 chars):', PAYPAL_CLIENT_SECRET ? '...' + PAYPAL_CLIENT_SECRET.slice(-4) : 'none');
console.log('[PayPal Config] CLIENT_SECRET length:', PAYPAL_CLIENT_SECRET?.length);
console.log('[PayPal Config] MODE:', PAYPAL_MODE);
console.log('[PayPal Config] API_BASE:', PAYPAL_API_BASE);

const getPayPalAccessToken = async (): Promise<string> => {
  console.log('[PayPal] Getting access token...');
  
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  console.log('[PayPal] Client ID (first 20):', PAYPAL_CLIENT_ID.substring(0, 20) + '...');
  console.log('[PayPal] Client ID (last 10):', '...' + PAYPAL_CLIENT_ID.substring(PAYPAL_CLIENT_ID.length - 10));
  console.log('[PayPal] Client Secret length:', PAYPAL_CLIENT_SECRET.length);
  console.log('[PayPal] Auth endpoint:', `${PAYPAL_API_BASE}/v1/oauth2/token`);

  const authString = `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`;
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
    console.log('[PayPal] Creating payment order:', {
      amount: input.amount,
      eventName: input.eventName,
      eventId: input.eventId,
      mode: PAYPAL_MODE,
      apiBase: PAYPAL_API_BASE,
    });

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
