import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/integrations/supabase/client';

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

export default function PayPalSuccessScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    const capturePayment = async () => {
      try {
        console.log('[PayPal Success] Payment callback received');
        console.log('[PayPal Success] All params:', params);
        
        const token = (params.token as string) || (params.PayerID as string);
        console.log('[PayPal Success] Extracted token:', token);

        if (!token) {
          console.error('[PayPal Success] No token found in URL params');
          setStatus('error');
          setMessage('Payment token not found');
          setTimeout(() => {
            router.replace('/(tabs)/dashboard' as any);
          }, 3000);
          return;
        }

        console.log('[PayPal Success] Capturing payment...');
        
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
          const errorText = await tokenResponse.text();
          console.error('[PayPal Success] Token request failed:', errorText);
          throw new Error('Failed to get PayPal access token');
        }

        const tokenText = await tokenResponse.text();
        let tokenData;
        try {
          tokenData = JSON.parse(tokenText);
        } catch {
          console.error('[PayPal Success] Failed to parse token response:', tokenText);
          throw new Error('Invalid response from PayPal token endpoint');
        }
        const accessToken = tokenData.access_token;

        const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${token}/capture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!captureResponse.ok) {
          const errorText = await captureResponse.text();
          console.error('[PayPal Success] Capture failed:', errorText);
          throw new Error('Failed to capture payment');
        }

        const captureText = await captureResponse.text();
        let captureData;
        try {
          captureData = JSON.parse(captureText);
        } catch {
          console.error('[PayPal Success] Failed to parse capture response:', captureText);
          throw new Error('Invalid response from PayPal capture endpoint');
        }
        console.log('[PayPal Success] Payment captured:', captureData);

        const { data: membershipPayment, error: membershipQueryError } = await supabase
          .from('membership_payments')
          .select('member_id')
          .eq('paypal_order_id', token)
          .single();

        if (!membershipQueryError && membershipPayment) {
          console.log('[PayPal Success] Updating membership payment and member status...');
          
          const { error: updateError } = await supabase
            .from('membership_payments')
            .update({ 
              payment_status: 'completed',
              paypal_capture_id: captureData.id,
            })
            .eq('paypal_order_id', token);

          if (updateError) {
            console.error('[PayPal Success] Failed to update membership payment:', updateError);
          } else {
            const { error: memberUpdateError } = await supabase
              .from('members')
              .update({ membershipType: 'active' })
              .eq('id', membershipPayment.member_id);

            if (memberUpdateError) {
              console.error('[PayPal Success] Failed to update member status:', memberUpdateError);
            } else {
              console.log('[PayPal Success] Member status updated to active');
            }
          }
        }

        const { error: registrationError } = await supabase
          .from('event_registrations')
          .update({ 
            paymentStatus: 'paid',
            paypalCaptureId: captureData.id,
          })
          .eq('paypalOrderId', token);

        if (registrationError) {
          console.error('[PayPal Success] Failed to update registration:', registrationError);
        }

        setStatus('success');
        setMessage('Payment completed successfully!');

        Alert.alert(
          'Payment Successful',
          'Your membership payment has been completed successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/(tabs)/dashboard' as any);
              },
            },
          ]
        );

        setTimeout(() => {
          router.replace('/(tabs)/dashboard');
        }, 5000);

      } catch (error) {
        console.error('[PayPal Success] Error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Payment processing failed');
        
        setTimeout(() => {
          router.replace('/(tabs)/dashboard');
        }, 3000);
      }
    };

    if (params && Object.keys(params).length > 0) {
      capturePayment();
    }
  }, [params, router]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'processing' && (
          <>
            <ActivityIndicator size="large" color="#0070BA" />
            <Text style={styles.title}>{message}</Text>
          </>
        )}
        
        {status === 'success' && (
          <>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.subtitle}>Redirecting...</Text>
          </>
        )}
        
        {status === 'error' && (
          <>
            <Ionicons name="close-circle" size={64} color="#DC2626" />
            <Text style={styles.errorTitle}>Payment Failed</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.subtitle}>Redirecting...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginTop: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#10B981',
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#DC2626',
    marginTop: 16,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
