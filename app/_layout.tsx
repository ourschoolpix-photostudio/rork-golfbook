import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, View, Platform, Alert } from "react-native";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EventsProvider } from "@/contexts/EventsContext";
import { GamesProvider } from "@/contexts/GamesContext";
import { OfflineModeProvider } from "@/contexts/OfflineModeContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { trpc, trpcClient } from "@/lib/trpc";
import * as Linking from 'expo-linking';
import { supabase } from '@/integrations/supabase/client';



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
  const { isLoading: authLoading, refreshMembers } = useAuth();
  const [isHydrated, setIsHydrated] = useState(Platform.OS === 'web');
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log('[RootLayoutNav] Deep link received:', event.url);
      
      const { path, queryParams } = Linking.parse(event.url);
      console.log('[RootLayoutNav] Parsed path:', path);
      console.log('[RootLayoutNav] Query params:', queryParams);

      if (path === 'paypal/success') {
        const orderId = (queryParams?.token || queryParams?.Token) as string;
        
        if (!orderId) {
          console.error('[RootLayoutNav] No order ID found in PayPal callback');
          Alert.alert(
            'Payment Error',
            'Unable to process payment. Order ID not found.',
            [{ text: 'OK' }]
          );
          return;
        }
        console.log('[RootLayoutNav] Processing PayPal success for order:', orderId);
        
        try {
          const { data: paypalConfig, error: configError } = await supabase
            .from('organization_settings')
            .select('paypal_client_id, paypal_client_secret, paypal_mode')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();

          if (configError || !paypalConfig) {
            throw new Error('Failed to load PayPal configuration');
          }

          const mode = (paypalConfig.paypal_mode || 'sandbox') as 'sandbox' | 'live';
          const baseUrl = mode === 'live' 
            ? 'https://api-m.paypal.com' 
            : 'https://api-m.sandbox.paypal.com';

          const authString = `${paypalConfig.paypal_client_id}:${paypalConfig.paypal_client_secret}`;
          
          function base64Encode(str: string): string {
            if (Platform.OS === 'web' && typeof btoa !== 'undefined') {
              return btoa(str);
            }
            
            const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            let result = '';
            let i = 0;
            
            while (i < str.length) {
              const a = str.charCodeAt(i++);
              const b = i < str.length ? str.charCodeAt(i++) : 0;
              const c = i < str.length ? str.charCodeAt(i++) : 0;
              
              const bitmap = (a << 16) | (b << 8) | c;
              
              result += base64chars.charAt((bitmap >> 18) & 63);
              result += base64chars.charAt((bitmap >> 12) & 63);
              result += (i - 1 < str.length ? base64chars.charAt((bitmap >> 6) & 63) : '=');
              result += (i < str.length ? base64chars.charAt(bitmap & 63) : '=');
            }
            
            return result;
          }
          
          const auth = base64Encode(authString);

          const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${auth}`,
            },
            body: 'grant_type=client_credentials',
          });

          if (!tokenResponse.ok) {
            throw new Error('Failed to get PayPal access token');
          }

          const tokenData = await tokenResponse.json();
          const accessToken = tokenData.access_token;

          console.log('[RootLayoutNav] Capturing PayPal payment...');
          const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!captureResponse.ok) {
            const errorText = await captureResponse.text();
            console.error('[RootLayoutNav] Capture failed:', errorText);
            throw new Error('Failed to capture payment');
          }

          const captureData = await captureResponse.json();
          console.log('[RootLayoutNav] Payment captured:', captureData);

          const { data: membershipPayment } = await supabase
            .from('membership_payments')
            .select('member_id')
            .eq('paypal_order_id', orderId)
            .single();

          if (membershipPayment) {
            console.log('[RootLayoutNav] Updating membership payment and member status...');
            
            await supabase
              .from('membership_payments')
              .update({ 
                payment_status: 'completed',
                paypal_capture_id: captureData.id,
              })
              .eq('paypal_order_id', orderId);

            await supabase
              .from('members')
              .update({ membershipType: 'active' })
              .eq('id', membershipPayment.member_id);

            if (refreshMembers) {
              await refreshMembers();
            }

            Alert.alert(
              'Payment Successful',
              'Your membership has been activated! Thank you.',
              [{ text: 'OK' }]
            );
          } else {
            const { error: registrationError } = await supabase
              .from('event_registrations')
              .update({ 
                paymentStatus: 'paid',
                paypalCaptureId: captureData.id,
              })
              .eq('paypalOrderId', orderId);

            if (!registrationError) {
              Alert.alert(
                'Payment Successful',
                'Your registration payment has been completed!',
                [{ text: 'OK' }]
              );
            }
          }
        } catch (error) {
          console.error('[RootLayoutNav] Error processing PayPal callback:', error);
          Alert.alert(
            'Payment Processing',
            'There was an issue processing your payment. Please check your membership status or contact support.',
            [{ text: 'OK' }]
          );
        }
      } else if (path === 'paypal/cancel') {
        console.log('[RootLayoutNav] PayPal payment cancelled');
        Alert.alert(
          'Payment Cancelled',
          'Your payment was cancelled. You can try again later.',
          [{ text: 'OK' }]
        );
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[RootLayoutNav] Initial URL:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshMembers]);

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
      SplashScreen.hideAsync().catch((error) => {
        console.log('[RootLayoutNav] SplashScreen.hideAsync error (safe to ignore):', error.message);
      });
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
      <Stack.Screen name="paypal" options={{ headerShown: false }} />
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
