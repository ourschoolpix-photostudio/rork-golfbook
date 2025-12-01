import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

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
      url: `${getBaseUrl()}/trpc`,
      transformer: superjson,
      fetch: async (url, options) => {
        try {
          const response = await Promise.race([
            fetch(url, options),
            new Promise<Response>((_, reject) =>
              setTimeout(() => reject(new Error('Request timeout')), 60000)
            ),
          ]);

          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            const htmlText = await response.text();
            console.error('❌ [tRPC] Server returned HTML instead of JSON:', htmlText.substring(0, 200));
            throw new Error(
              'Backend server is not responding correctly. Please ensure the backend is deployed and running.'
            );
          }

          return response;
        } catch (error) {
          if (error instanceof Error && error.message === 'Request timeout') {
            console.error('❌ [tRPC] Request timeout');
            throw new Error('Request timed out. Please check your connection.');
          }
          throw error;
        }
      },
    }),
  ],
});
