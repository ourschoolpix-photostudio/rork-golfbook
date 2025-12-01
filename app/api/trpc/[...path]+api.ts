import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "@/backend/trpc/app-router";
import { createContext } from "@/backend/trpc/create-context";

let app: Hono | null = null;

function getApp() {
  if (app) return app;

  try {
    console.log('🚀 [API] Initializing Hono app...');
    
    app = new Hono();

    app.use("*", cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }));

    app.notFound((c) => {
      console.warn('⚠️ [Hono] 404 Not Found:', c.req.url);
      return c.json({
        error: {
          message: 'Not Found',
          path: c.req.url,
          timestamp: new Date().toISOString(),
        }
      }, 404);
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

    app.use(
      "/*",
      trpcServer({
        router: appRouter,
        createContext,
        endpoint: '/',
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

    console.log('✅ [API] Hono app initialized successfully');
    return app;
  } catch (error) {
    console.error('❌ [API] Failed to initialize Hono app:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const honoApp = getApp();
    return honoApp.fetch(request);
  } catch (error) {
    console.error('❌ [API GET] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server did not start',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: Request) {
  try {
    const honoApp = getApp();
    return honoApp.fetch(request);
  } catch (error) {
    console.error('❌ [API POST] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server did not start',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(request: Request) {
  try {
    const honoApp = getApp();
    return honoApp.fetch(request);
  } catch (error) {
    console.error('❌ [API PUT] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server did not start',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const honoApp = getApp();
    return honoApp.fetch(request);
  } catch (error) {
    console.error('❌ [API DELETE] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server did not start',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const honoApp = getApp();
    return honoApp.fetch(request);
  } catch (error) {
    console.error('❌ [API PATCH] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server did not start',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function OPTIONS(request: Request) {
  try {
    const honoApp = getApp();
    return honoApp.fetch(request);
  } catch (error) {
    console.error('❌ [API OPTIONS] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server did not start',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
