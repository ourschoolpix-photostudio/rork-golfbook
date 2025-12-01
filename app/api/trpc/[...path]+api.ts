import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "../../../backend/trpc/app-router";
import { createContext } from "../../../backend/trpc/create-context";

const app = new Hono();

app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

console.log('🔧 [API] Registering tRPC middleware');

app.use(
  "*",
  trpcServer({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error('❌ [tRPC] Error on path', path, ':', error);
    },
  })
);

app.get("/health", (c) => {
  console.log('🏫 [API] Health check hit');
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
  });
});

app.onError((err, c) => {
  console.error('❌ [API] Server error:', err);
  return c.json({
    error: {
      message: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }
  }, 500);
});

app.notFound((c) => {
  console.warn('⚠️ [API] 404 Not Found:', c.req.url);
  return c.json({
    error: 'Not Found',
    path: c.req.url,
    method: c.req.method,
  }, 404);
});

const handleRequest = async (request: Request) => {
  try {
    const url = new URL(request.url);
    console.log('🚀 [API] Handling request:', request.method, url.pathname);
    console.log('🚀 [API] Search params:', url.search);

    const honoUrl = new URL(request.url);
    honoUrl.protocol = 'http:';
    honoUrl.host = 'localhost';
    
    const pathWithoutApi = url.pathname.replace('/api/trpc/', '/');
    honoUrl.pathname = pathWithoutApi;
    
    console.log('🔧 [API] Forwarding to Hono:', honoUrl.toString());
    
    const honoRequest = new Request(honoUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
    });

    const response = await app.fetch(honoRequest);
    console.log('✅ [API] Response status:', response.status);
    
    return response;
  } catch (error) {
    console.error('❌ [API] Error:', error);
    console.error('❌ [API] Error stack:', error instanceof Error ? error.stack : 'no stack');
    return new Response(JSON.stringify({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}

export async function PUT(request: Request) {
  return handleRequest(request);
}

export async function DELETE(request: Request) {
  return handleRequest(request);
}

export async function PATCH(request: Request) {
  return handleRequest(request);
}

export async function OPTIONS(request: Request) {
  return handleRequest(request);
}
