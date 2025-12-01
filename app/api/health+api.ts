export async function GET() {
  console.log('🏥 [Health API] Health check hit');
  return new Response(JSON.stringify({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    message: "Backend is running",
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
