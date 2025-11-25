import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/integrations/supabase/client';

export default function DebugDataScreen() {
  const router = useRouter();
  const [directQueryResult, setDirectQueryResult] = useState<any>(null);
  const [directQueryLoading, setDirectQueryLoading] = useState(false);
  
  const membersQuery = trpc.members.getAll.useQuery();
  const eventsQuery = trpc.events.getAll.useQuery();

  const testDirectSupabaseConnection = async () => {
    setDirectQueryLoading(true);
    try {
      console.log('🔍 Testing direct Supabase connection...');
      
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*');
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*');
      
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('*');

      setDirectQueryResult({
        members: {
          count: membersData?.length || 0,
          data: membersData,
          error: membersError,
        },
        events: {
          count: eventsData?.length || 0,
          data: eventsData,
          error: eventsError,
        },
        registrations: {
          count: registrationsData?.length || 0,
          data: registrationsData,
          error: registrationsError,
        },
      });
      
      console.log('✅ Direct Supabase query results:', {
        membersCount: membersData?.length,
        eventsCount: eventsData?.length,
        registrationsCount: registrationsData?.length,
      });
    } catch (error) {
      console.error('❌ Direct Supabase query failed:', error);
      setDirectQueryResult({ error: String(error) });
    } finally {
      setDirectQueryLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Debug Data',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <Text style={{ color: '#007AFF', fontSize: 16 }}>← Back</Text>
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Data Debugging Tool</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔌 Backend Connection</Text>
          <Text style={styles.label}>Base URL:</Text>
          <Text style={styles.value}>{process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'NOT SET'}</Text>
          <Text style={styles.label}>tRPC Endpoint:</Text>
          <Text style={styles.value}>{process.env.EXPO_PUBLIC_RORK_API_BASE_URL}/api/trpc</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Members (via tRPC)</Text>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, { color: membersQuery.isLoading ? '#FF9500' : membersQuery.isError ? '#FF3B30' : '#34C759' }]}>
            {membersQuery.isLoading ? '⏳ Loading...' : membersQuery.isError ? '❌ Error' : '✅ Loaded'}
          </Text>
          
          {membersQuery.isError && (
            <>
              <Text style={styles.label}>Error:</Text>
              <Text style={[styles.value, styles.errorText]}>{String(membersQuery.error)}</Text>
            </>
          )}
          
          <Text style={styles.label}>Count:</Text>
          <Text style={styles.value}>{membersQuery.data?.length || 0} members</Text>
          
          {membersQuery.data && membersQuery.data.length > 0 && (
            <>
              <Text style={styles.label}>Sample Member:</Text>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>
                  {JSON.stringify(membersQuery.data[0], null, 2)}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Events (via tRPC)</Text>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, { color: eventsQuery.isLoading ? '#FF9500' : eventsQuery.isError ? '#FF3B30' : '#34C759' }]}>
            {eventsQuery.isLoading ? '⏳ Loading...' : eventsQuery.isError ? '❌ Error' : '✅ Loaded'}
          </Text>
          
          {eventsQuery.isError && (
            <>
              <Text style={styles.label}>Error:</Text>
              <Text style={[styles.value, styles.errorText]}>{String(eventsQuery.error)}</Text>
            </>
          )}
          
          <Text style={styles.label}>Count:</Text>
          <Text style={styles.value}>{eventsQuery.data?.length || 0} events</Text>
          
          {eventsQuery.data && eventsQuery.data.length > 0 && (
            <>
              <Text style={styles.label}>Sample Event:</Text>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>
                  {JSON.stringify(eventsQuery.data[0], null, 2)}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Direct Supabase Query</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={testDirectSupabaseConnection}
            disabled={directQueryLoading}
          >
            {directQueryLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Test Direct Connection</Text>
            )}
          </TouchableOpacity>
          
          {directQueryResult && (
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>
                {JSON.stringify(directQueryResult, null, 2)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Troubleshooting Tips</Text>
          <Text style={styles.tip}>1. Check that EXPO_PUBLIC_RORK_API_BASE_URL is set in your env file</Text>
          <Text style={styles.tip}>2. Verify Supabase credentials in integrations/supabase/client.ts</Text>
          <Text style={styles.tip}>3. Check Supabase RLS policies allow reading</Text>
          <Text style={styles.tip}>4. Use the Direct Query button to test Supabase connection</Text>
          <Text style={styles.tip}>5. Check the console logs for detailed error messages</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    color: '#1a1a1a',
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    color: '#FF3B30',
  },
  codeBlock: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    maxHeight: 300,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  tip: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
});
