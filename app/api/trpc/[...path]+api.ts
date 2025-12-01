import app from "@/backend/hono";

const handleRequest = async (request: Request) => {
  try {
    const url = new URL(request.url);
    console.log('🚀 [API] Handling request:', request.method, url.pathname);
    console.log('🚀 [API] Search params:', url.search);

    const honoUrl = new URL(request.url);
    honoUrl.protocol = 'http:';
    honoUrl.host = 'localhost';
    
    honoUrl.pathname = url.pathname;
    
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
