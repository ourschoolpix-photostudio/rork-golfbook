import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, CheckCircle, Camera, ImageIcon, Save } from 'lucide-react-native';
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
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowCamera(false);
      setPhotoSaved(false);
      setImageUri(null);
    }
  }, [visible]);

  const handleStopCamera = useCallback(() => {
    setShowCamera(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      console.log('[ScorecardPhoto] Capturing photo...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        skipProcessing: false,
      });

      if (photo && photo.uri) {
        setImageUri(photo.uri);
        setShowCamera(false);
      }
    } catch (error) {
      console.error('[ScorecardPhoto] Error capturing photo:', error);
    }
  }, []);



  const handleSelectFromGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.log('Gallery permission denied');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
      }
    } catch (error) {
      console.error('[ScorecardPhoto] Error selecting photo:', error);
    }
  }, []);

  const handleStartCamera = async () => {
    if (Platform.OS === 'web') {
      handleSelectFromGallery();
      return;
    }

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        console.log('Camera permission denied');
        return;
      }
    }

    setShowCamera(true);
  };

  const handleClose = () => {
    handleStopCamera();
    setImageUri(null);
    setShowCamera(false);
    setPhotoSaved(false);
    onClose();
  };

  const handleSavePhoto = async () => {
    if (!imageUri) return;
    
    setIsSavingPhoto(true);
    try {
      const saved = await scorecardPhotoService.savePhoto(
        eventId,
        groupLabel,
        imageUri,
        {
          day,
          tee,
          holeRange,
        }
      );
      
      if (saved) {
        console.log('✅ Photo saved for future reference');
        setPhotoSaved(true);
      }
    } catch (error) {
      console.error('❌ Error saving photo:', error);
    } finally {
      setIsSavingPhoto(false);
    }
  };



  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Scorecard Photo - {groupLabel}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {showCamera && (
              <View style={styles.cameraContainer}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                />
                <View style={styles.cameraOverlay}>
                  <View style={styles.cameraButtons}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={handleStopCamera}
                    >
                      <X size={20} color="#fff" />
                      <Text style={styles.cameraBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.captureBtn}
                      onPress={capturePhoto}
                    >
                      <Camera size={20} color="#fff" />
                      <Text style={styles.cameraBtnText}>Capture</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {!showCamera && !imageUri && (
              <View style={styles.actionsContainer}>
                <Text style={styles.instruction}>
                  Take a photo of the scorecard to save for future reference
                </Text>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleStartCamera}
                >
                  <Camera size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {Platform.OS === 'web' ? 'Choose Photo' : 'Take Photo'}
                  </Text>
                </TouchableOpacity>

                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={handleSelectFromGallery}
                  >
                    <ImageIcon size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {imageUri && (
              <View style={styles.photoContainer}>
                <Image source={{ uri: imageUri }} style={styles.photoImage} />

                <View style={styles.photoActions}>
                  {!photoSaved && (
                    <TouchableOpacity
                      style={styles.savePhotoButton}
                      onPress={handleSavePhoto}
                      disabled={isSavingPhoto}
                    >
                      <Save size={18} color="#fff" />
                      <Text style={styles.savePhotoButtonText}>
                        {isSavingPhoto ? 'Saving...' : 'Save Photo'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {photoSaved && (
                    <View style={styles.savedIndicator}>
                      <CheckCircle size={18} color="#4CAF50" />
                      <Text style={styles.savedIndicatorText}>Photo Saved</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.takeAnotherButton}
                  onPress={() => {
                    setImageUri(null);
                    setPhotoSaved(false);
                    handleStartCamera();
                  }}
                >
                  <Text style={styles.takeAnotherButtonText}>Take Another Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
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
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  actionsContainer: {
    gap: 16,
    paddingVertical: 20,
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  actionButton: {
    backgroundColor: '#1B5E20',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoContainer: {
    alignItems: 'center',
    gap: 16,
  },
  photoImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  cameraContainer: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 32,
  },
  cameraButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  cameraBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoActions: {
    width: '100%',
    marginVertical: 8,
  },
  savePhotoButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 6,
  },
  savePhotoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  savedIndicatorText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  takeAnotherButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  takeAnotherButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
