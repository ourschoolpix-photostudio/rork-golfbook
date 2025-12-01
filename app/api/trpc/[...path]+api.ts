import app from '@/backend/hono';

export async function GET(request: Request) {
  try {
    console.log('🚀 [API GET] Handling request:', request.url);
    return app.fetch(request);
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
    console.log('🚀 [API POST] Handling request:', request.url);
    return app.fetch(request);
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
    console.log('🚀 [API PUT] Handling request:', request.url);
    return app.fetch(request);
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
    console.log('🚀 [API DELETE] Handling request:', request.url);
    return app.fetch(request);
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
    console.log('🚀 [API PATCH] Handling request:', request.url);
    return app.fetch(request);
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
    console.log('🚀 [API OPTIONS] Handling request:', request.url);
    return app.fetch(request);
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
