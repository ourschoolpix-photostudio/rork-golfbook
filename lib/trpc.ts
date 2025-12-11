import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import { Platform } from 'react-native';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    const webUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}`
      : '';
    console.log('🔧 [tRPC] Using web URL:', webUrl);
    return webUrl;
  }

  console.log('⚠️ [tRPC] API routes only work on web platform');
  console.log('⚠️ [tRPC] For native platforms, use direct Supabase calls or edge functions');
  return '';
};

let isBackendAvailable = true;
let lastBackendCheck = 0;
const BACKEND_CHECK_INTERVAL = 60000;

export const checkBackendHealth = async (): Promise<boolean> => {
  const now = Date.now();
  if (now - lastBackendCheck < BACKEND_CHECK_INTERVAL) {
    return isBackendAvailable;
  }

  try {
    const response = await fetch(`${getBaseUrl()}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    isBackendAvailable = response.ok;
    lastBackendCheck = now;
    console.log(`🏥 [tRPC] Backend health check: ${isBackendAvailable ? '✅' : '❌'}`);
    if (response.ok) {
      const data = await response.json();
      console.log('🏥 [tRPC] Health response:', data);
    }
  } catch (error) {
    isBackendAvailable = false;
    lastBackendCheck = now;
    console.log('🏥 [tRPC] Backend health check failed:', error);
  }

  return isBackendAvailable;
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      async fetch(url, options) {
        try {
          console.log('🌐 [tRPC] Making request to:', url);
          console.log('🌐 [tRPC] Request method:', options?.method);
          console.log('🌐 [tRPC] Request body:', options?.body ? JSON.stringify(JSON.parse(options.body as string), null, 2) : 'none');
          
          const response = await fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('📡 [tRPC] Response status:', response.status);
          console.log('📡 [tRPC] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
          
          if (!response.ok) {
            const text = await response.text();
            console.error('❌ [tRPC] Non-OK response body:', text.substring(0, 500));
            
            if (response.status === 404) {
              isBackendAvailable = false;
              if (Platform.OS !== 'web') {
                console.error('❌ [tRPC] API routes are not available on native platforms.');
                console.error('⚠️ [tRPC] Note: This is normal. PayPal and other features use direct Supabase calls instead.');
              } else {
                console.error('❌ [tRPC] 404 Error - Backend endpoint not found.');
                console.error('❌ [tRPC] Expected endpoint:', `${getBaseUrl()}/api/trpc`);
              }
            }
            
            try {
              const json = JSON.parse(text);
              throw new Error(json.error?.message || `Request failed with status ${response.status}`);
            } catch {
              throw new Error(`Request failed: ${text.substring(0, 200)}`);
            }
          }
          
          const responseText = await response.text();
          console.log('✅ [tRPC] Response body preview:', responseText.substring(0, 200));
          
          return new Response(responseText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        } catch (error) {
          console.error('❌ [tRPC] Fetch error:', error);
          console.error('❌ [tRPC] Error stack:', error instanceof Error ? error.stack : 'no stack');
          isBackendAvailable = false;
          throw error;
        }
      },
    }),
  ],
});
