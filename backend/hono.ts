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

console.log('🔧 [Hono] Setting up tRPC server for PayPal routes');
console.log('🔧 [Hono] tRPC will be available at: /api/trpc/*');

app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`❌ [tRPC] Error in ${path}:`, error);
    },
  })
);

app.get("/api", (c) => {
  console.log('🏠 [Hono] API root endpoint hit');
  return c.json({ 
    status: "ok", 
    message: "API is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (c) => {
  console.log('🏫 [Hono] Health check endpoint hit');
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    message: 'Backend is healthy',
    env: {
      hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }
  });
});

app.onError((err, c) => {
  console.error('❌ [Hono] Server error:', err);
  console.error('❌ [Hono] Error stack:', err.stack);
  return c.json({
    error: {
      message: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }
  }, 500);
});

app.notFound((c) => {
  console.warn('⚠️ [Hono] 404 Not Found:', c.req.url);
  console.warn('⚠️ [Hono] Path:', c.req.path);
  console.warn('⚠️ [Hono] Method:', c.req.method);
  return c.json({
    error: 'Not Found',
    path: c.req.url,
    method: c.req.method,
    message: 'The requested endpoint does not exist',
    availableRoutes: ['/api', '/api/health', '/api/trpc/*']
  }, 404);
});

console.log('✅ [Hono] Server configuration complete');
console.log('✅ [Hono] Registered routes: /api, /api/health, /api/trpc/*');

export default app;
