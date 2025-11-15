import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Member } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OrganizationInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  zellePhone: string;
  logoUrl: string;
}

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
  const router = useRouter();
  const { login: authLogin } = useAuth();

  useEffect(() => {
    ensureAdminExists();
    loadOrganizationInfo();
  }, []);

  const loadOrganizationInfo = async () => {
    try {
      const data = await AsyncStorage.getItem('@organization_info');
      if (data) {
        setOrgInfo(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading organization info:', error);
    } finally {
      setLoadingOrg(false);
    }
  };

  const ensureAdminExists = async () => {
    console.log('Login - Admin initialization is handled by AuthContext');
  };

  const handleLogin = async () => {
    if (!username.trim() || !pin.trim()) {
      Alert.alert('Error', 'Please enter username and PIN');
      return;
    }

    setLoading(true);
    try {
      console.log('=== LOGIN START ===');
      console.log('Login - Input username:', username);
      console.log('Login - Input pin:', pin);
      
      console.log('Login - Calling authLogin with username:', username.trim(), 'and pin:', pin.trim());
      const loggedIn = await authLogin(username.trim(), pin.trim());
      console.log('Login - Auth login result:', loggedIn);
      
      if (loggedIn) {
        console.log('Login - Success! Navigating to dashboard...');
        console.log('=== LOGIN END (SUCCESS) ===');
        router.replace('/(tabs)/dashboard');
      } else {
        console.log('Login - authLogin returned false');
        console.log('=== LOGIN END (AUTH FAILED) ===');
        Alert.alert('Login Failed', 'Invalid username or PIN. Make sure the player exists in the database.');
        setPin('');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.log('=== LOGIN END (ERROR) ===');
      Alert.alert('Error', 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <View style={styles.content}>
            {loadingOrg ? (
              <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            ) : (
              <>
                {orgInfo?.logoUrl ? (
                  <Image source={{ uri: orgInfo.logoUrl }} style={styles.logo} />
                ) : null}
                <Text style={styles.title}>
                  {orgInfo?.name || 'DMV Vietnamese Golf Association'}
                </Text>
              </>
            )}

            <View style={styles.form}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                value={username}
                onChangeText={setUsername}
                editable={!loading}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <Text style={styles.label}>PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
                editable={!loading}
                blurOnSubmit={false}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.appInfo}>
              <Text style={styles.appInfoTitle}>Global App Settings</Text>
              <Text style={styles.appInfoText}>
                This app allows customization of various aspects including:
              </Text>
              <View style={styles.appInfoFeatures}>
                <Text style={styles.appInfoFeature}>• Color palette for screens</Text>
                <Text style={styles.appInfoFeature}>• Header and footer customization</Text>
                <Text style={styles.appInfoFeature}>• Theme preferences</Text>
              </View>
              <Text style={styles.appInfoNote}>Configuration options available in Settings</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  logo: {
    width: 240,
    height: 288,
    marginBottom: 24,
    resizeMode: 'contain' as const,
    aspectRatio: 1,
  },
  loader: {
    marginBottom: 20,
  },
  appInfo: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    width: '100%',
  },
  appInfoTitle: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#999',
    marginBottom: 4,
    textAlign: 'center',
  },
  appInfoText: {
    fontSize: 9,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 12,
    marginBottom: 6,
  },
  appInfoFeatures: {
    alignItems: 'center',
    marginBottom: 6,
  },
  appInfoFeature: {
    fontSize: 8,
    color: '#bbb',
    marginVertical: 2,
  },
  appInfoNote: {
    fontSize: 8,
    color: '#ccc',
    fontStyle: 'italic' as const,
    textAlign: 'center',
  },
});
