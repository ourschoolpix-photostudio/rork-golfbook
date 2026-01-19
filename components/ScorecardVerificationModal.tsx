import React, { useState, useRef, useEffect } from 'react';
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
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsSaving(false);
      if (!permission?.granted && Platform.OS !== 'web') {
        requestPermission();
      }
    }
  }, [visible, permission?.granted, requestPermission]);

  const capturePhoto = async () => {
    if (!cameraRef.current || isSaving) return;

    try {
      console.log('[ScorecardPhoto] Capturing photo...');
      setIsSaving(true);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
      });

      if (photo?.uri) {
        console.log('[ScorecardPhoto] Saving photo...');
        const saved = await scorecardPhotoService.savePhoto(
          eventId,
          groupLabel,
          photo.uri,
          { day, tee, holeRange }
        );
        
        if (saved) {
          console.log('✅ Photo saved successfully');
          onClose();
        } else {
          console.error('❌ Failed to save photo');
          setIsSaving(false);
        }
      }
    } catch (error) {
      console.error('[ScorecardPhoto] Error:', error);
      setIsSaving(false);
    }
  };

  if (Platform.OS === 'web') {
    return null;
  }

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="fade" transparent={false}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Camera size={64} color="#1B5E20" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              Allow camera access to capture scorecard photos
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.cameraFullscreen}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraTitle}>{groupLabel}</Text>
            <Text style={styles.cameraSubtitle}>Scorecard Photo</Text>
          </View>

          <View style={styles.cameraFooter}>
            {isSaving ? (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.savingText}>Saving photo...</Text>
              </View>
            ) : (
              <View style={styles.cameraButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                >
                  <X size={24} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={capturePhoto}
                >
                  <View style={styles.captureCircle} />
                </TouchableOpacity>
                
                <View style={styles.placeholderBtn} />
              </View>
            )}
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B5E20',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#1B5E20',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraFullscreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
  },
  cameraTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cameraSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cameraFooter: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
  },
  cameraButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  cancelBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  placeholderBtn: {
    width: 50,
    height: 50,
  },
  savingIndicator: {
    alignItems: 'center',
    gap: 12,
  },
  savingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
