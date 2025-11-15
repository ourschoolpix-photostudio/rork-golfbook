import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AdminFooter } from '@/components/AdminFooter';
import { storageService } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { photoService } from '@/utils/photoService';
import { useSettings } from '@/contexts/SettingsContext';
import { formatPhoneNumber } from '@/utils/phoneFormatter';

interface OrganizationInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  zellePhone: string;
  logoUrl: string;
  paypalClientId: string;
  paypalClientSecret: string;
  paypalMode: 'sandbox' | 'live';
}

export default function SettingsScreen() {
  const router = useRouter();
  const { refreshOrganizationInfo } = useSettings();
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo>({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    zellePhone: '',
    logoUrl: '',
    paypalClientId: '',
    paypalClientSecret: '',
    paypalMode: 'sandbox',
  });

  useEffect(() => {
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
      setIsLoading(false);
    }
  };

  const saveOrganizationInfo = async () => {
    try {
      setIsSaving(true);
      await AsyncStorage.setItem('@organization_info', JSON.stringify(orgInfo));
      await refreshOrganizationInfo();
      Alert.alert('Success', 'Organization information saved successfully.');
    } catch (error) {
      console.error('Error saving organization info:', error);
      Alert.alert('Error', 'Failed to save organization information.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoSelect = async () => {
    try {
      setIsUploadingLogo(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('📏 Selected image, starting upload...');
        const uploadedUrl = await photoService.uploadPhoto(result.assets[0], 'organization', true);
        console.log('✅ Upload completed, URL:', uploadedUrl);
        
        const updatedInfo = { ...orgInfo, logoUrl: uploadedUrl };
        setOrgInfo(updatedInfo);
        await AsyncStorage.setItem('@organization_info', JSON.stringify(updatedInfo));
        Alert.alert('Success', 'Logo uploaded successfully');
      }
    } catch (error: any) {
      console.error('Error selecting logo:', error);
      const errorMessage = error.message || 'Failed to upload logo';
      Alert.alert('Upload Error', errorMessage);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    Alert.alert(
      'Remove Logo',
      'Are you sure you want to remove the logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedInfo = { ...orgInfo, logoUrl: '' };
              setOrgInfo(updatedInfo);
              await AsyncStorage.setItem('@organization_info', JSON.stringify(updatedInfo));
              Alert.alert('Success', 'Logo removed successfully');
            } catch (error) {
              console.error('Error removing logo:', error);
              Alert.alert('Error', 'Failed to remove logo');
            }
          },
        },
      ]
    );
  };

  const handleNormalizeNames = async () => {
    Alert.alert(
      'Normalize Member Names',
      'This will convert all member names to proper case (first letter capitalized). Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Normalize',
          onPress: async () => {
            try {
              setIsNormalizing(true);
              await storageService.normalizeAllMemberNames();
              Alert.alert('Success', 'All member names have been normalized to proper case.');
            } catch (error) {
              console.error('Error normalizing names:', error);
              Alert.alert('Error', 'Failed to normalize member names.');
            } finally {
              setIsNormalizing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.customHeaderWrapper}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organization Information</Text>
              
              <Text style={styles.fieldLabel}>Organization Logo</Text>
              <View style={styles.logoContainer}>
                <View style={styles.previewFrame}>
                  {isUploadingLogo ? (
                    <View style={styles.uploadingContainer}>
                      <ActivityIndicator size="large" color="#007AFF" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  ) : orgInfo.logoUrl ? (
                    <Image source={{ uri: orgInfo.logoUrl }} style={styles.logoPreviewInFrame} />
                  ) : (
                    <View style={styles.logoPlaceholderFrame}>
                      <Ionicons name="business" size={40} color="#999" />
                      <Text style={styles.logoPlaceholderText}>No logo uploaded</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.previewLabel}>Login Screen Preview</Text>
                <View style={styles.logoButtonsRow}>
                  <TouchableOpacity
                    style={[styles.uploadButton, isUploadingLogo && styles.uploadButtonDisabled]}
                    onPress={handleLogoSelect}
                    disabled={isUploadingLogo}
                  >
                    <Ionicons name="cloud-upload" size={20} color={isUploadingLogo ? "#999" : "#007AFF"} />
                    <Text style={[styles.uploadButtonText, isUploadingLogo && styles.uploadButtonTextDisabled]}>
                      {isUploadingLogo ? 'Uploading...' : orgInfo.logoUrl ? 'Change Logo' : 'Upload Logo'}
                    </Text>
                  </TouchableOpacity>
                  {orgInfo.logoUrl && !isUploadingLogo && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={handleRemoveLogo}
                    >
                      <Ionicons name="trash" size={20} color="#FF3B30" />
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={styles.fieldLabel}>Logo URL (for debugging)</Text>
              <TextInput
                style={[styles.input, styles.urlInput]}
                value={orgInfo.logoUrl}
                editable={false}
                placeholder="No logo URL"
                multiline
              />

              <Text style={styles.fieldLabel}>Organization Name</Text>
              <TextInput
                style={styles.input}
                value={orgInfo.name}
                onChangeText={(text) => setOrgInfo({ ...orgInfo, name: text })}
                placeholder="Enter organization name"
              />

              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                style={styles.input}
                value={orgInfo.address}
                onChangeText={(text) => setOrgInfo({ ...orgInfo, address: text })}
                placeholder="Enter street address"
              />

              <View style={styles.row}>
                <View style={styles.flexInput}>
                  <Text style={styles.fieldLabel}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={orgInfo.city}
                    onChangeText={(text) => setOrgInfo({ ...orgInfo, city: text })}
                    placeholder="City"
                  />
                </View>
                <View style={styles.smallInput}>
                  <Text style={styles.fieldLabel}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={orgInfo.state}
                    onChangeText={(text) => setOrgInfo({ ...orgInfo, state: text })}
                    placeholder="ST"
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.mediumInput}>
                  <Text style={styles.fieldLabel}>ZIP Code</Text>
                  <TextInput
                    style={styles.input}
                    value={orgInfo.zipCode}
                    onChangeText={(text) => setOrgInfo({ ...orgInfo, zipCode: text })}
                    placeholder="ZIP"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={orgInfo.phone}
                onChangeText={(text) => setOrgInfo({ ...orgInfo, phone: formatPhoneNumber(text) })}
                placeholder="(123) 456-7890"
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Zelle Phone Number</Text>
              <TextInput
                style={styles.input}
                value={orgInfo.zellePhone}
                onChangeText={(text) => setOrgInfo({ ...orgInfo, zellePhone: formatPhoneNumber(text) })}
                placeholder="(123) 456-7890"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PayPal Configuration</Text>
              <Text style={styles.sectionDescription}>
                Configure your PayPal credentials to accept payments. You can use sandbox mode for testing or live mode for production.
              </Text>

              <Text style={styles.fieldLabel}>PayPal Mode</Text>
              <View style={styles.modeSelector}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    orgInfo.paypalMode === 'sandbox' && styles.modeButtonActive,
                  ]}
                  onPress={() => setOrgInfo({ ...orgInfo, paypalMode: 'sandbox' })}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      orgInfo.paypalMode === 'sandbox' && styles.modeButtonTextActive,
                    ]}
                  >
                    Sandbox (Testing)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    orgInfo.paypalMode === 'live' && styles.modeButtonActive,
                  ]}
                  onPress={() => setOrgInfo({ ...orgInfo, paypalMode: 'live' })}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      orgInfo.paypalMode === 'live' && styles.modeButtonTextActive,
                    ]}
                  >
                    Live (Production)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>PayPal Client ID</Text>
              <TextInput
                style={styles.input}
                value={orgInfo.paypalClientId}
                onChangeText={(text) => setOrgInfo({ ...orgInfo, paypalClientId: text })}
                placeholder="Enter PayPal Client ID"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.fieldLabel}>PayPal Client Secret</Text>
              <TextInput
                style={styles.input}
                value={orgInfo.paypalClientSecret}
                onChangeText={(text) => setOrgInfo({ ...orgInfo, paypalClientSecret: text })}
                placeholder="Enter PayPal Client Secret"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />

              {orgInfo.paypalMode === 'live' && (orgInfo.paypalClientId || orgInfo.paypalClientSecret) && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={20} color="#FF9500" />
                  <Text style={styles.warningText}>
                    You are using LIVE mode. Make sure you have entered your production credentials from PayPal.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={saveOrganizationInfo}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save All Settings</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, isNormalizing && styles.actionButtonDisabled]}
            onPress={handleNormalizeNames}
            disabled={isNormalizing}
          >
            <Ionicons name="text" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              {isNormalizing ? 'Normalizing...' : 'Normalize Member Names'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.actionDescription}>
            Convert all member names to proper case (first letter capitalized)
          </Text>
        </View>
      </ScrollView>

      <AdminFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customHeaderWrapper: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 145,
    zIndex: 1000,
    backgroundColor: '#003366',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#003366',
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute' as 'absolute',
    left: 16,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 145,
  },
  scrollContent: {
    padding: 16,
  },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#999',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewFrame: {
    width: 240,
    height: 288,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  logoPreviewInFrame: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain' as const,
  },
  logoPlaceholderFrame: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic' as const,
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flexInput: {
    flex: 1,
  },
  smallInput: {
    width: 60,
  },
  mediumInput: {
    width: 100,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  uploadButtonDisabled: {
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  uploadButtonTextDisabled: {
    color: '#999',
  },
  uploadingContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    gap: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600' as const,
  },
  logoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  urlInput: {
    backgroundColor: '#f9f9f9',
    color: '#666',
    fontSize: 12,
    minHeight: 60,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#007AFF',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
});
