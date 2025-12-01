import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "@/backend/trpc/app-router";
import { createContext } from "@/backend/trpc/create-context";

const app = new Hono();

app.use("*", cors());

app.onError((err, c) => {
  console.error('❌ [Hono] Server error:', err);
  return c.json({
    error: {
      message: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }
  }, 500);
});

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: '/trpc',
    onError({ error, path }) {
      console.error('❌ [tRPC] Error on path', path, ':', error);
    },
  })
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }
  });
});

export default app;
