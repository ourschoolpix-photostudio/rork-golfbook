import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useEffect, useRef, useState } from 'react';

export default function Index() {
  const { currentUser, isLoading } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    console.log('[Index] Auth state:', { isLoading, hasUser: !!currentUser, hasRedirected: hasRedirectedRef.current });
    
    if (!isLoading && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      setShouldRedirect(true);
    }
  }, [isLoading, currentUser]);

  if (isLoading) {
    console.log('[Index] Showing loading state');
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!shouldRedirect) {
    console.log('[Index] Waiting to redirect...');
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (currentUser) {
    console.log('[Index] Redirecting to dashboard');
    return <Redirect href="/(tabs)/dashboard" />;
  }

  console.log('[Index] Redirecting to login');
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});
