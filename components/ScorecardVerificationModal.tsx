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
  const [error, setError] = useState<string | null>(null);
  const [showManualButton, setShowManualButton] = useState(false);

  const handleClose = useCallback(() => {
    setShowCamera(false);
    setIsSavingPhoto(false);
    setError(null);
    setShowManualButton(false);
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
    try {
      setError(null);
      
      if (Platform.OS === 'web') {
        handleSelectFromGallery();
        return;
      }

      console.log('[ScorecardPhoto] Starting camera...');
      console.log('[ScorecardPhoto] Permission status:', permission);

      if (!permission) {
        console.log('[ScorecardPhoto] Permission object is null, waiting...');
        return;
      }

      if (!permission.granted) {
        console.log('[ScorecardPhoto] Requesting camera permission...');
        const result = await requestPermission();
        console.log('[ScorecardPhoto] Permission result:', result);
        if (!result.granted) {
          console.log('[ScorecardPhoto] Camera permission denied');
          setError('Camera permission denied');
          setTimeout(() => handleClose(), 2000);
          return;
        }
      }

      console.log('[ScorecardPhoto] Setting showCamera to true');
      setShowCamera(true);
    } catch (err) {
      console.error('[ScorecardPhoto] Error starting camera:', err);
      setError('Failed to open camera');
      setTimeout(() => handleClose(), 2000);
    }
  }, [permission, requestPermission, handleSelectFromGallery, handleClose]);

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
      console.log('[ScorecardPhoto] Modal became visible');
      console.log('[ScorecardPhoto] Permission state:', permission);
      setShowCamera(false);
      setError(null);
      setShowManualButton(false);
    } else {
      console.log('[ScorecardPhoto] Modal closed, resetting camera');
      setShowCamera(false);
      setError(null);
      setShowManualButton(false);
    }
  }, [visible, permission]);

  useEffect(() => {
    if (visible && permission !== null) {
      console.log('[ScorecardPhoto] Permissions loaded, starting camera...');
      const timer = setTimeout(() => {
        handleStartCamera();
      }, 300);
      
      const fallbackTimer = setTimeout(() => {
        if (!showCamera) {
          console.log('[ScorecardPhoto] Camera did not open in time, showing manual button');
          setShowManualButton(true);
        }
      }, 3000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(fallbackTimer);
      };
    }
  }, [visible, permission, handleStartCamera, showCamera]);

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
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.errorSubtext}>Closing...</Text>
              </View>
            ) : !showCamera && !isSavingPhoto ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1B5E20" />
                <Text style={styles.loadingText}>Opening camera...</Text>
                {showManualButton && (
                  <TouchableOpacity
                    style={styles.manualOpenButton}
                    onPress={handleStartCamera}
                  >
                    <Camera size={20} color="#fff" />
                    <Text style={styles.manualOpenButtonText}>Open Camera</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {showCamera && Platform.OS !== 'web' && !error && (
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

            {isSavingPhoto && (
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
  },
  manualOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  manualOpenButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
