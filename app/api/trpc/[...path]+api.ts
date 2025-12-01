import app from "@/backend/hono";

const handleRequest = async (request: Request) => {
  try {
    const url = new URL(request.url);
    console.log('🚀 [API] ========== NEW REQUEST ==========');
    console.log('🚀 [API] Method:', request.method);
    console.log('🚀 [API] Full URL:', request.url);
    console.log('🚀 [API] Pathname:', url.pathname);
    console.log('🚀 [API] Search:', url.search);
    console.log('🚀 [API] Headers:', Object.fromEntries(request.headers.entries()));

    const honoRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
    });
    
    console.log('🔧 [API] Forwarding to Hono app.fetch()...');
    
    const response = await app.fetch(honoRequest);
    
    console.log('✅ [API] Response received from Hono');
    console.log('✅ [API] Status:', response.status);
    console.log('✅ [API] Status text:', response.statusText);
    
    return response;
  } catch (error) {
    console.error('❌ [API] ========== ERROR ==========');
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
