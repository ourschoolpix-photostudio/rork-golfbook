import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera } from 'lucide-react-native';
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
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  const handleClose = useCallback(() => {
    setShowCamera(false);
    setIsSavingPhoto(false);
    onClose();
  }, [onClose]);

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
        
        setIsSavingPhoto(true);
        try {
          const saved = await scorecardPhotoService.savePhoto(
            eventId,
            groupLabel,
            asset.uri,
            {
              day,
              tee,
              holeRange,
            }
          );
          
          if (saved) {
            console.log('✅ Photo saved and closing modal');
            setTimeout(() => {
              handleClose();
            }, 500);
          }
        } catch (saveError) {
          console.error('❌ Error saving photo:', saveError);
        } finally {
          setIsSavingPhoto(false);
        }
      }
    } catch (error) {
      console.error('[ScorecardPhoto] Error selecting photo:', error);
    }
  }, [eventId, groupLabel, day, tee, holeRange, handleClose]);

  const handleStartCamera = useCallback(async () => {
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
  }, [permission, requestPermission, handleSelectFromGallery]);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      console.log('[ScorecardPhoto] Capturing photo...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        skipProcessing: false,
      });

      if (photo && photo.uri) {
        setShowCamera(false);
        
        setIsSavingPhoto(true);
        try {
          const saved = await scorecardPhotoService.savePhoto(
            eventId,
            groupLabel,
            photo.uri,
            {
              day,
              tee,
              holeRange,
            }
          );
          
          if (saved) {
            console.log('✅ Photo saved and closing modal');
            setTimeout(() => {
              handleClose();
            }, 500);
          }
        } catch (saveError) {
          console.error('❌ Error saving photo:', saveError);
        } finally {
          setIsSavingPhoto(false);
        }
      }
    } catch (error) {
      console.error('[ScorecardPhoto] Error capturing photo:', error);
    }
  }, [eventId, groupLabel, day, tee, holeRange, handleClose]);

  useEffect(() => {
    if (visible) {
      handleStartCamera();
    } else {
      setShowCamera(false);
    }
  }, [visible, handleStartCamera]);

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

          <View style={styles.body}>
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
                      onPress={handleClose}
                    >
                      <X size={20} color="#fff" />
                      <Text style={styles.cameraBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.captureBtn}
                      onPress={capturePhoto}
                      disabled={isSavingPhoto}
                    >
                      <Camera size={20} color="#fff" />
                      <Text style={styles.cameraBtnText}>
                        {isSavingPhoto ? 'Saving...' : 'Capture'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {!showCamera && isSavingPhoto && (
              <View style={styles.savingContainer}>
                <ActivityIndicator size="large" color="#1B5E20" />
                <Text style={styles.savingText}>Saving photo...</Text>
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
    flex: 1,
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
  savingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  savingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
