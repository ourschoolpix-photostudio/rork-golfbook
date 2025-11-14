import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://becvczcatdwhvrrizort.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlY3ZjemNhdGR3aHZycml6b3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MjE0NDUsImV4cCI6MjA3NjM5NzQ0NX0.vHJWldnsyYTSLr9thaOpMYM9lnkohlSyBajKV7Jf0K4';

console.log('🔧 Supabase config:', { url: supabaseUrl, hasKey: !!supabaseAnonKey });

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration. Please restart the development server.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'x-my-custom-header': 'golf-app',
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000),
      });
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});
