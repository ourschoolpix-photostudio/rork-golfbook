import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Check } from 'lucide-react-native';
import { scorecardPhotoService } from '@/utils/scorecardPhotoService';

interface ScorecardVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  groupLabel: string;
  eventId: string;
  day?: number;
  tee?: string;
  holeRange?: string;
}

export default function ScorecardVerificationModal({
  visible,
  onClose,
  groupLabel,
  eventId,
  day,
  tee,
  holeRange,
}: ScorecardVerificationModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  const takePhoto = async () => {
    try {
      console.log('[ScorecardPhoto] Opening camera...');
      
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        console.log('[ScorecardPhoto] Camera permission denied');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.95,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[ScorecardPhoto] Photo captured:', result.assets[0].uri);
        setCapturedUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[ScorecardPhoto] Error taking photo:', error);
    }
  };

  const savePhoto = async () => {
    if (!capturedUri || isSaving) return;

    try {
      console.log('[ScorecardPhoto] Saving photo...');
      setIsSaving(true);
      
      const saved = await scorecardPhotoService.savePhoto(
        eventId,
        groupLabel,
        capturedUri,
        { day, tee, holeRange }
      );
      
      if (saved) {
        console.log('✅ Photo saved successfully');
        setCapturedUri(null);
        onClose();
      } else {
        console.error('❌ Failed to save photo');
      }
    } catch (error) {
      console.error('[ScorecardPhoto] Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setCapturedUri(null);
    onClose();
  };

  const retakePhoto = () => {
    setCapturedUri(null);
    takePhoto();
  };

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{groupLabel}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {capturedUri ? (
              <View style={styles.previewContainer}>
                <Image 
                  source={{ uri: capturedUri }} 
                  style={styles.previewImage} 
                  resizeMode="contain"
                />
                
                {isSaving ? (
                  <View style={styles.savingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.savingText}>Saving photo...</Text>
                  </View>
                ) : (
                  <View style={styles.previewActions}>
                    <TouchableOpacity style={styles.retakeBtn} onPress={retakePhoto}>
                      <Camera size={20} color="#fff" />
                      <Text style={styles.retakeBtnText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={savePhoto}>
                      <Check size={20} color="#fff" />
                      <Text style={styles.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.captureContainer}>
                <Camera size={64} color="#1B5E20" />
                <Text style={styles.captureTitle}>Capture Scorecard</Text>
                <Text style={styles.captureSubtitle}>
                  Take a photo of the scorecard for verification
                </Text>
                <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                  <Camera size={24} color="#fff" />
                  <Text style={styles.captureBtnText}>Open Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  captureContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  captureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E20',
  },
  captureSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  captureBtn: {
    backgroundColor: '#1B5E20',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 8,
    gap: 10,
  },
  captureBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: '#666',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retakeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  savingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
