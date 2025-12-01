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
          throw error;
        }
      },
    }),
  ],
});
