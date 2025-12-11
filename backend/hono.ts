import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from '@/backend/trpc/app-router';
import { createContext } from '@/backend/trpc/create-context';

const app = new Hono();

app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

console.log('🔧 [Hono] Mounting tRPC handler for PayPal routes');

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`❌ [tRPC] Error in ${path}:`, error);
    },
  })
);

app.get("/", (c) => {
  console.log('🏠 [Hono] Root endpoint hit');
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/health", (c) => {
  console.log('🏫 [Hono] Health check hit');
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }
  });
});

app.onError((err, c) => {
  console.error('❌ [Hono] Server error:', err);
  return c.json({
    error: {
      message: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }
  }, 500);
});

app.notFound((c) => {
  console.warn('⚠️ [Hono] 404 Not Found:', c.req.url);
  return c.json({
    error: 'Not Found',
    path: c.req.url,
    method: c.req.method,
    registeredRoutes: ['/', '/health']
  }, 404);
});

export default app;
