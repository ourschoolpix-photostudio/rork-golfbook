import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

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
    result += (i - 1 < str.length ? base64chars.charAt((bitmap >> 6) & 63) : '=');
    result += (i < str.length ? base64chars.charAt(bitmap & 63) : '=');
  }
  
  return result;
}

async function getPayPalAccessToken(
  clientId: string,
  clientSecret: string,
  mode: 'sandbox' | 'live'
): Promise<string> {
  console.log('[PayPalService] 🔐 Getting PayPal access token...');
  console.log('[PayPalService] Mode:', mode);
  console.log('[PayPalService] Client ID length (raw):', clientId?.length || 0);
  console.log('[PayPalService] Client Secret length (raw):', clientSecret?.length || 0);
  console.log('[PayPalService] Client ID (raw first 10 chars):', clientId?.substring(0, 10) + '...');
  console.log('[PayPalService] Client Secret (raw first 10 chars):', clientSecret?.substring(0, 10) + '...');
  
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
  console.log('[PayPalService] 🔑 Auth string length (before encoding):', authString.length);
  console.log('[PayPalService] 🔑 Auth string format check: contains colon:', authString.includes(':'));
  
  const auth = base64Encode(authString);
  console.log('[PayPalService] 🔐 Base64 auth length (after encoding):', auth.length);
  console.log('[PayPalService] 🔐 Base64 auth (first 20 chars):', auth.substring(0, 20) + '...');
  console.log('[PayPalService] 🔐 Base64 auth (last 20 chars): ...' + auth.substring(auth.length - 20));
  const baseUrl = PAYPAL_API_BASE[mode];
  console.log('[PayPalService] Requesting token from:', `${baseUrl}/v1/oauth2/token`);
  console.log('[PayPalService] Using mode:', mode, '| Base URL:', baseUrl);
  
  if (mode === 'live' && (trimmedClientId.toLowerCase().includes('sandbox') || trimmedClientId.startsWith('AZ'))) {
    console.error('[PayPalService] ⚠️⚠️⚠️ CRITICAL ERROR: You are using LIVE mode but your Client ID appears to be from SANDBOX!');
    console.error('[PayPalService] Live Client IDs start with "A" and are ~80 chars. Sandbox IDs start with "AZ" or contain "sandbox".');
    throw new Error('PayPal Configuration Error: Sandbox credentials cannot be used in Live mode. Please:\n\n1. Go to Admin Settings\n2. Switch to Sandbox mode, OR\n3. Enter your Live PayPal credentials from https://developer.paypal.com/dashboard (Live tab)');
  }
  
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
      console.error('[PayPalService] ⚠️ MOST COMMON ISSUE: You are using sandbox credentials in live mode!');
      console.error('[PayPalService] ⚠️ SOLUTION: In Admin Settings, either:');
      console.error('[PayPalService]    • Switch PayPal Mode to "Sandbox", OR');
      console.error('[PayPalService]    • Enter your LIVE credentials from https://developer.paypal.com (Live tab)');
    }
    
    let userMessage = `PayPal Authentication Failed: ${errorDetails}`;
    
    if (response.status === 401 && mode === 'live') {
      userMessage = 'PayPal Authentication Failed.\n\nMOST LIKELY CAUSE: You are using Sandbox credentials in Live mode.\n\nSOLUTION:\n\n1. Open Admin Settings\n2. Scroll to PayPal Configuration\n3. Either:\n   • Change mode to "Sandbox", OR\n   • Enter your Live credentials from https://developer.paypal.com\n\nTo get Live credentials:\n1. Go to https://developer.paypal.com/dashboard\n2. Click "Live" tab (not Sandbox)\n3. Go to "My Apps & Credentials"\n4. Create or select an app\n5. Copy Client ID and Secret\n6. Paste in Admin Settings\n\nCheck console for detailed logs.';
    } else if (response.status === 401 && mode === 'sandbox') {
      userMessage = 'PayPal Authentication Failed.\n\nYour Sandbox credentials appear to be incorrect.\n\nSOLUTION:\n\n1. Go to https://developer.paypal.com/dashboard\n2. Click "Sandbox" tab\n3. Go to "My Apps & Credentials"\n4. Create or select an app\n5. Copy Client ID and Secret (click "Show" to reveal secret)\n6. Paste in Admin Settings\n\nMake sure there are no extra spaces when copying!';
    }
    
    throw new Error(userMessage);
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

    let returnUrl: string;
    let cancelUrl: string;
    
    if (Platform.OS === 'web') {
      const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://rork.app';
      returnUrl = `${appBaseUrl}/paypal/success`;
      cancelUrl = `${appBaseUrl}/paypal/cancel`;
    } else {
      returnUrl = 'rork-app://paypal/success';
      cancelUrl = 'rork-app://paypal/cancel';
    }

    console.log('[PayPalService] Using return URLs:', {
      returnUrl,
      cancelUrl,
      platform: Platform.OS,
    });

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
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: 'Golf Tournament Registration',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    };

    console.log('[PayPalService] Creating order with data:', JSON.stringify(orderData, null, 2));

    console.log('[PayPalService] Sending order creation request to:', `${baseUrl}/v2/checkout/orders`);
    console.log('[PayPalService] Order payload:', JSON.stringify(orderData, null, 2));
    
    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    console.log('[PayPalService] Order creation response status:', response.status);
    console.log('[PayPalService] Order creation response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PayPalService] ❌ Failed to create order. Status:', response.status);
      console.error('[PayPalService] ❌ Error response body:', errorText);
      
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
        console.error('[PayPalService] ❌ Parsed error details:', JSON.stringify(parsedError, null, 2));
      } catch {
        console.error('[PayPalService] ❌ Could not parse error as JSON');
      }
      
      const detailedError = parsedError ? 
        `${parsedError.message || response.statusText}${parsedError.details ? '\n' + JSON.stringify(parsedError.details, null, 2) : ''}` : 
        errorText;
      
      throw new Error(`Failed to create PayPal order (${response.status}): ${detailedError}`);
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error creating PayPal order';
    console.error('[PayPalService] Error details:', errorMessage);
    throw error instanceof Error ? error : new Error(errorMessage);
  }
}
