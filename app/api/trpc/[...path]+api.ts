import app from '@/backend/hono';
import { ExpoRequest } from 'expo-router/server';

console.log('📦 [API Init] Hono app imported:', !!app);

const handleRequest = async (request: Request | ExpoRequest) => {
  try {
    const url = new URL(request.url);
    console.log('🚀 [API] Handling request:', request.method, url.pathname);
    console.log('🚀 [API] Search params:', url.search);
    
    if (!app) {
      console.error('❌ [API] Hono app is not initialized');
      return new Response(JSON.stringify({ error: 'Backend app not initialized' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const honoUrl = new URL(request.url);
    honoUrl.protocol = 'http:';
    honoUrl.host = 'localhost';
    
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
