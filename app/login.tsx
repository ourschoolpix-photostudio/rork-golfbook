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
  TouchableWithoutFeedback,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fingerprint } from 'lucide-react-native';

import { Member } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { PlayerEditModal } from '@/components/PlayerEditModal';

const BIOMETRIC_USER_KEY = '@golf_biometric_user';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinChangeModal, setShowPinChangeModal] = useState(false);
  const [userToUpdate, setUserToUpdate] = useState<Member | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasSavedBiometric, setHasSavedBiometric] = useState(false);
  const router = useRouter();
  const { login: authLogin, updateMember, members } = useAuth();
  const { orgInfo, isLoading: loadingOrg } = useSettings();

  useEffect(() => {
    ensureAdminExists();
    checkBiometricAvailability();
  }, []);

  const ensureAdminExists = async () => {
    console.log('Login - Admin initialization is handled by AuthContext');
  };

  const checkBiometricAvailability = async () => {
    if (Platform.OS === 'web') {
      setBiometricAvailable(false);
      return;
    }

    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      const savedUser = await AsyncStorage.getItem(BIOMETRIC_USER_KEY);
      setHasSavedBiometric(!!savedUser);

      console.log('Biometric available:', compatible && enrolled);
      console.log('Has saved biometric user:', !!savedUser);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Biometric authentication is not available on web');
      return;
    }

    try {
      const savedUserData = await AsyncStorage.getItem(BIOMETRIC_USER_KEY);
      if (!savedUserData) {
        Alert.alert('No Saved User', 'Please login with username and PIN first to enable biometric login');
        return;
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFaceID = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      const hasFingerprint = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

      let promptMessage = 'Authenticate to login';
      if (hasFaceID) {
        promptMessage = 'Authenticate with Face ID';
      } else if (hasFingerprint) {
        promptMessage = 'Authenticate with Fingerprint';
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        const { username: savedUsername, pin: savedPin } = JSON.parse(savedUserData);
        setLoading(true);
        const loggedIn = await authLogin(savedUsername, savedPin);
        
        if (loggedIn) {
          console.log('Biometric login - Success!');
          router.replace('/(tabs)/dashboard');
        } else {
          Alert.alert('Login Failed', 'User credentials are no longer valid. Please login with username and PIN.');
          await AsyncStorage.removeItem(BIOMETRIC_USER_KEY);
          setHasSavedBiometric(false);
        }
        setLoading(false);
      } else {
        console.log('Biometric authentication failed or cancelled');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'Failed to authenticate with biometrics');
    }
  };

  const saveBiometricCredentials = async (username: string, pin: string) => {
    if (Platform.OS === 'web') return;
    
    try {
      await AsyncStorage.setItem(BIOMETRIC_USER_KEY, JSON.stringify({ username, pin }));
      setHasSavedBiometric(true);
      console.log('Biometric credentials saved');
    } catch (error) {
      console.error('Error saving biometric credentials:', error);
    }
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
        console.log('Login - Success!');
        
        if (pin.trim() === '1111') {
          console.log('Login - User has default PIN, prompting change...');
          console.log('=== LOGIN END (PIN CHANGE REQUIRED) ===');
          const member = members.find((m: Member) => 
            (m.username?.toLowerCase() === username.trim().toLowerCase() || 
             m.name?.toLowerCase() === username.trim().toLowerCase()) && 
            m.pin === pin.trim()
          );
          if (member) {
            setUserToUpdate(member);
            setShowPinChangeModal(true);
          }
        } else {
          if (biometricAvailable && !hasSavedBiometric) {
            Alert.alert(
              'Enable Biometric Login',
              'Would you like to enable facial recognition or fingerprint login for faster access?',
              [
                {
                  text: 'No Thanks',
                  style: 'cancel',
                  onPress: () => router.replace('/(tabs)/dashboard'),
                },
                {
                  text: 'Enable',
                  onPress: async () => {
                    await saveBiometricCredentials(username.trim(), pin.trim());
                    router.replace('/(tabs)/dashboard');
                  },
                },
              ]
            );
          } else {
            console.log('Login - Navigating to dashboard...');
            console.log('=== LOGIN END (SUCCESS) ===');
            router.replace('/(tabs)/dashboard');
          }
        }
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

  const handlePinChange = async (member: Member) => {
    try {
      if (member.pin === '1111') {
        Alert.alert('Error', 'You must change your PIN from the default value');
        return;
      }

      console.log('Login - Updating user PIN...');
      await updateMember(member.id, { pin: member.pin, username: member.username });
      console.log('Login - PIN updated successfully');
      
      setShowPinChangeModal(false);
      setUserToUpdate(null);
      
      Alert.alert('Success', 'Your PIN has been changed and saved successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/dashboard'),
        },
      ]);
    } catch (error) {
      console.error('Error updating PIN:', error);
      Alert.alert('Error', 'Failed to update PIN. Please try again.');
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
            <View style={styles.content}>
              {loadingOrg ? (
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
              ) : (
                <>
                  {orgInfo?.logoUrl ? (
                    <Image source={{ uri: orgInfo.logoUrl }} style={styles.logo} />
                  ) : null}
                  <Text style={styles.title} numberOfLines={1}>
                    {orgInfo?.name || 'DMV Vietnamese Golf Association'}
                  </Text>
                </>
              )}

              <View style={styles.form}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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

                {biometricAvailable && hasSavedBiometric && (
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleBiometricLogin}
                    disabled={loading}
                  >
                    <Fingerprint size={24} color="#007AFF" />
                    <Text style={styles.biometricButtonText}>Login with Biometrics</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeAreaView>

    <PlayerEditModal
      visible={showPinChangeModal}
      member={userToUpdate}
      onClose={() => {
        setShowPinChangeModal(false);
        setUserToUpdate(null);
      }}
      onSave={handlePinChange}
      isLimitedMode={true}
      pinChangeMode={true}
    />
    </>
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
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginTop: 0,
    marginBottom: 40,
    paddingTop: 0,
    textAlign: 'center',
  },
  form: {
    width: '100%',
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
    marginBottom: 0,
    resizeMode: 'contain' as const,
    aspectRatio: 1,
  },
  loader: {
    marginBottom: 20,
  },
  biometricButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  biometricButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
