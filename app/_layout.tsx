import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, View, Platform } from "react-native";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EventsProvider } from "@/contexts/EventsContext";
import { GamesProvider } from "@/contexts/GamesContext";
import { OfflineModeProvider } from "@/contexts/OfflineModeContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { trpc, trpcClient } from "@/lib/trpc";


console.log('🚀 [App] Starting application...');
console.log('🔧 [App] Environment variables:', {
  hasApiBaseUrl: !!process.env.EXPO_PUBLIC_RORK_API_BASE_URL,
  apiBaseUrl: process.env.EXPO_PUBLIC_RORK_API_BASE_URL,
  hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
  platform: Platform.OS,
});

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('polyfill') || args[0].includes('Polyfill'))
  ) {
    return;
  }
  originalWarn(...args);
};

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
      onError: (error) => {
        console.error('[QueryClient] Mutation error:', error);
      },
    },
  },
});

function RootLayoutNav() {
  const { isLoading: authLoading } = useAuth();
  const [isHydrated, setIsHydrated] = useState(Platform.OS === 'web');
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      setIsHydrated(true);
    }
  }, [isHydrated]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('[RootLayoutNav] Hydration timeout reached, forcing render');
      setTimeoutReached(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!authLoading && Platform.OS !== 'web' && isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [authLoading, isHydrated]);

  if (!isHydrated || (authLoading && !timeoutReached)) {
    return <View style={styles.loading} />;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(event)/[eventId]" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="(game)/[gameId]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {


  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.container}>
          <OfflineModeProvider>
            <SettingsProvider>
              <AuthProvider>
                <NotificationsProvider>
                  <EventsProvider>
                    <GamesProvider>
                      <RootLayoutNav />
                    </GamesProvider>
                  </EventsProvider>
                </NotificationsProvider>
              </AuthProvider>
            </SettingsProvider>
          </OfflineModeProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
