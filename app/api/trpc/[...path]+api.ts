import { appRouter } from "@/backend/trpc/app-router";
import { createContext } from "@/backend/trpc/create-context";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const handleRequest = async (request: Request) => {
  try {
    const url = new URL(request.url);
    console.log('🚀 [tRPC API] ========== NEW REQUEST ==========');
    console.log('🚀 [tRPC API] Method:', request.method);
    console.log('🚀 [tRPC API] Full URL:', request.url);
    console.log('🚀 [tRPC API] Pathname:', url.pathname);
    console.log('🚀 [tRPC API] Search:', url.search);

    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext,
      onError({ error, path }) {
        console.error('❌ [tRPC API] Error on path', path, ':', error);
      },
    });

    console.log('✅ [tRPC API] Response status:', response.status);
    return response;
  } catch (error) {
    console.error('❌ [tRPC API] ========== ERROR ==========');
    console.error('❌ [tRPC API] Error:', error);
    console.error('❌ [tRPC API] Error stack:', error instanceof Error ? error.stack : 'no stack');
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
