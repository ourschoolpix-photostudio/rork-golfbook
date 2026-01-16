import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://becvczcatdwhvrrizort.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlY3ZjemNhdGR3aHZycml6b3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MjE0NDUsImV4cCI6MjA3NjM5NzQ0NX0.vHJWldnsyYTSLr9thaOpMYM9lnkohlSyBajKV7Jf0K4';

let supabaseClient: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  console.log('🔧 Supabase config:', { 
    url: supabaseUrl, 
    hasKey: !!supabaseAnonKey,
    platform: Platform.OS,
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration. Using fallback values.');
  }

  console.log('✅ Creating Supabase client...');

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (...args) => fetch(...args),
        headers: {
          'x-my-custom-header': 'golf-app',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    console.log('✅ Supabase client created successfully');
    return supabaseClient;
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    throw error;
  }
}

export const supabase = createSupabaseClient();
