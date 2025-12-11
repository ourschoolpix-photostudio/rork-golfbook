import app from '@/backend/hono';

console.log('🚀 [API Route] tRPC API route handler loaded');
console.log('🚀 [API Route] This handler serves all /api/trpc/* requests');

export async function GET(request: Request) {
  console.log('📨 [API Route] GET request received:', request.url);
  return app.fetch(request);
}

export async function POST(request: Request) {
  console.log('📨 [API Route] POST request received:', request.url);
  const url = new URL(request.url);
  console.log('📨 [API Route] Path:', url.pathname);
  console.log('📨 [API Route] Search params:', url.search);
  return app.fetch(request);
}

export async function PUT(request: Request) {
  console.log('📨 [API Route] PUT request received:', request.url);
  return app.fetch(request);
}

export async function DELETE(request: Request) {
  console.log('📨 [API Route] DELETE request received:', request.url);
  return app.fetch(request);
}

export async function OPTIONS(request: Request) {
  console.log('📨 [API Route] OPTIONS request received:', request.url);
  return app.fetch(request);
}
