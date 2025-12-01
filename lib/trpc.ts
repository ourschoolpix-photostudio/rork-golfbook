import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    console.log('🔧 [tRPC] Using configured API URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  if (Platform.OS === 'web') {
    console.log('🔧 [tRPC] Using same-origin URL for web');
    return '';
  }

  if (__DEV__) {
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':').shift();
    if (debuggerHost) {
      const devUrl = `http://${debuggerHost}:8081`;
      console.log('🔧 [tRPC] Using dev server URL:', devUrl);
      return devUrl;
    }
  }

  console.log('⚠️ [tRPC] No backend URL configured');
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
    const response = await fetch(`${getBaseUrl()}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    isBackendAvailable = response.ok;
    lastBackendCheck = now;
    console.log(`🏥 [tRPC] Backend health check: ${isBackendAvailable ? '✅' : '❌'}`);
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
              console.error('❌ [tRPC] 404 Error - Backend endpoint not found. Check if backend is running and API_BASE_URL is correct.');
              console.error('❌ [tRPC] Expected endpoint:', `${getBaseUrl()}/api/trpc`);
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
