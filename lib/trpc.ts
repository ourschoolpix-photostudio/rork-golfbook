import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
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
          const response = await fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('📡 [tRPC] Response status:', response.status);
          
          if (!response.ok) {
            const text = await response.text();
            console.error('❌ [tRPC] Non-OK response:', text);
            
            if (response.status === 404) {
              isBackendAvailable = false;
            }
            
            try {
              const json = JSON.parse(text);
              throw new Error(json.error?.message || `Request failed with status ${response.status}`);
            } catch {
              throw new Error(`Request failed: ${text.substring(0, 200)}`);
            }
          }
          
          return response;
        } catch (error) {
          console.error('❌ [tRPC] Fetch error:', error);
          isBackendAvailable = false;
          throw error;
        }
      },
    }),
  ],
});
