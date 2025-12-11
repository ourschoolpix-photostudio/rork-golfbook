import { Platform } from 'react-native';

interface CreatePayPalOrderRequest {
  amount: number;
  eventName: string;
  eventId: string;
  playerEmail: string;
  paypalClientId: string;
  paypalClientSecret: string;
  paypalMode: 'sandbox' | 'live';
}

interface CreatePayPalOrderResponse {
  orderId: string;
  approvalUrl: string;
}

const PAYPAL_API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

function base64Encode(str: string): string {
  if (Platform.OS === 'web' && typeof btoa !== 'undefined') {
    return btoa(str);
  }
  
  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    result += base64chars.charAt((bitmap >> 18) & 63);
    result += base64chars.charAt((bitmap >> 12) & 63);
    result += base64chars.charAt(i - 2 < str.length ? (bitmap >> 6) & 63 : 64);
    result += base64chars.charAt(i - 1 < str.length ? bitmap & 63 : 64);
  }
  
  return result;
}

async function getPayPalAccessToken(
  clientId: string,
  clientSecret: string,
  mode: 'sandbox' | 'live'
): Promise<string> {
  console.log('[PayPalService] Getting PayPal access token...');
  console.log('[PayPalService] Mode:', mode);
  console.log('[PayPalService] Client ID length (raw):', clientId?.length || 0);
  console.log('[PayPalService] Client Secret length (raw):', clientSecret?.length || 0);
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal Client ID and Secret are required');
  }
  
  const trimmedClientId = clientId.trim();
  const trimmedClientSecret = clientSecret.trim();
  
  console.log('[PayPalService] Client ID length (trimmed):', trimmedClientId.length);
  console.log('[PayPalService] Client Secret length (trimmed):', trimmedClientSecret.length);
  console.log('[PayPalService] Client ID first 10 chars:', trimmedClientId.substring(0, 10) + '...');
  console.log('[PayPalService] Client ID last 10 chars: ...', trimmedClientId.substring(trimmedClientId.length - 10));
  console.log('[PayPalService] Client Secret first 10 chars:', trimmedClientSecret.substring(0, 10) + '...');
  console.log('[PayPalService] Client Secret last 10 chars: ...', trimmedClientSecret.substring(trimmedClientSecret.length - 10));
  
  if (trimmedClientId === '' || trimmedClientSecret === '') {
    throw new Error('PayPal credentials cannot be empty after trimming');
  }
  
  if (trimmedClientId.length < 40) {
    console.warn('[PayPalService] ⚠️ WARNING: Client ID seems too short. PayPal Client IDs are typically 60-80 characters long.');
  }
  
  if (trimmedClientSecret.length < 40) {
    console.warn('[PayPalService] ⚠️ WARNING: Client Secret seems too short. PayPal Client Secrets are typically 60-80 characters long.');
  }
  
  const authString = `${trimmedClientId}:${trimmedClientSecret}`;
  const auth = base64Encode(authString);
  console.log('[PayPalService] Auth credentials string length:', authString.length);
  console.log('[PayPalService] Base64 auth length:', auth.length);
  const baseUrl = PAYPAL_API_BASE[mode];
  console.log('[PayPalService] Requesting token from:', `${baseUrl}/v1/oauth2/token`);
  console.log('[PayPalService] Using mode:', mode, '| Base URL:', baseUrl);
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[PayPalService] ❌ Failed to get access token');
    console.error('[PayPalService] Response status:', response.status);
    console.error('[PayPalService] Response error:', errorText);
    console.error('[PayPalService] Base URL used:', baseUrl);
    console.error('[PayPalService] Mode used:', mode);
    
    let errorDetails = '';
    try {
      const errorJson = JSON.parse(errorText);
      errorDetails = errorJson.error_description || errorJson.error || errorText;
    } catch {
      errorDetails = errorText;
    }
    
    console.error('[PayPalService] 🔍 TROUBLESHOOTING TIPS:');
    console.error('[PayPalService] 1. Verify credentials match the selected mode (Sandbox vs Live)');
    console.error('[PayPalService] 2. Go to https://developer.paypal.com/dashboard');
    console.error('[PayPalService] 3. Select the correct environment tab:', mode === 'sandbox' ? 'Sandbox' : 'Live');
    console.error('[PayPalService] 4. Go to "My Apps & Credentials"');
    console.error('[PayPalService] 5. Create a new app or select existing app');
    console.error('[PayPalService] 6. Copy Client ID and Secret (show/reveal the secret)');
    console.error('[PayPalService] 7. Make sure there are NO extra spaces when pasting');
    console.error('[PayPalService] 8. Save the credentials in Admin Settings');
    console.error('[PayPalService] 9. Try again');
    
    if (mode === 'live') {
      console.error('[PayPalService] ⚠️ You are using LIVE mode. Make sure your PayPal account is approved for live transactions.');
    }
    
    throw new Error(`Failed to get PayPal access token: ${errorDetails}. Check console logs for troubleshooting tips.`);
  }

  const data = await response.json();
  console.log('[PayPalService] ✅ Got access token');
  return data.access_token;
}

export async function createPayPalOrder(
  request: CreatePayPalOrderRequest
): Promise<CreatePayPalOrderResponse> {
  try {
    console.log('[PayPalService] Creating PayPal order...', {
      amount: request.amount,
      eventName: request.eventName,
      mode: request.paypalMode,
    });

    const accessToken = await getPayPalAccessToken(
      request.paypalClientId,
      request.paypalClientSecret,
      request.paypalMode
    );

    const baseUrl = PAYPAL_API_BASE[request.paypalMode];

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: `Registration for ${request.eventName}`,
          amount: {
            currency_code: 'USD',
            value: request.amount.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: Platform.OS === 'web' ? `${window.location.origin}/payment/success` : 'golfapp://payment/success',
        cancel_url: Platform.OS === 'web' ? `${window.location.origin}/payment/cancel` : 'golfapp://payment/cancel',
        brand_name: 'Golf Tournament Registration',
        user_action: 'PAY_NOW',
      },
    };

    console.log('[PayPalService] Creating order with data:', JSON.stringify(orderData, null, 2));

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PayPalService] Failed to create order:', errorText);
      throw new Error(`Failed to create PayPal order: ${response.statusText}`);
    }

    const order = await response.json();
    console.log('[PayPalService] Order created:', order);

    const approvalUrl = order.links.find((link: any) => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      throw new Error('No approval URL returned from PayPal');
    }

    console.log('[PayPalService] ✅ Order created successfully');
    return {
      orderId: order.id,
      approvalUrl,
    };
  } catch (error) {
    console.error('[PayPalService] ❌ Error creating PayPal order:', error);
    throw error;
  }
}
