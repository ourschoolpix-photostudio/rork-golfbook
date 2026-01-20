import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { X, Trash2, ImageIcon } from 'lucide-react-native';
import { scorecardPhotoService, ScorecardPhoto } from '@/utils/scorecardPhotoService';
import { formatDistanceToNow } from 'date-fns';

interface ScorecardPhotosModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  groupLabel?: string;
}

export default function ScorecardPhotosModal({
  visible,
  onClose,
  eventId,
  groupLabel,
}: ScorecardPhotosModalProps) {
  const [photos, setPhotos] = useState<ScorecardPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ScorecardPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, eventId, groupLabel]);

  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      let fetchedPhotos: ScorecardPhoto[];
      if (groupLabel) {
        fetchedPhotos = await scorecardPhotoService.getPhotosByGroup(eventId, groupLabel);
      } else {
        fetchedPhotos = await scorecardPhotoService.getPhotosByEvent(eventId);
      }
      setPhotos(fetchedPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePhoto = async (photo: ScorecardPhoto) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this scorecard photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const success = await scorecardPhotoService.deletePhoto(photo.id, photo.photo_url);
            setIsDeleting(false);
            if (success) {
              setPhotos(photos.filter(p => p.id !== photo.id));
              setSelectedPhoto(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllPhotos = async () => {
    Alert.alert(
      'Delete All Photos',
      groupLabel
        ? `Delete all scorecard photos for ${groupLabel}?`
        : 'Delete all scorecard photos for this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            if (groupLabel) {
              for (const photo of photos) {
                await scorecardPhotoService.deletePhoto(photo.id, photo.photo_url);
              }
              setPhotos([]);
            } else {
              const success = await scorecardPhotoService.deleteAllEventPhotos(eventId);
              if (success) {
                setPhotos([]);
              }
            }
            setIsDeleting(false);
            setSelectedPhoto(null);
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setSelectedPhoto(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {groupLabel ? `${groupLabel} - Scorecards` : 'Event Scorecards'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {!selectedPhoto ? (
            <View style={styles.body}>
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1B5E20" />
                  <Text style={styles.loadingText}>Loading photos...</Text>
                </View>
              )}

              {!isLoading && photos.length === 0 && (
                <View style={styles.emptyContainer}>
                  <ImageIcon size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No scorecard photos saved</Text>
                  <Text style={styles.emptySubtext}>
                    Take a photo of a scorecard to save it for future reference
                  </Text>
                </View>
              )}

              {!isLoading && photos.length > 0 && (
                <>
                  <View style={styles.photosGrid}>
                    {photos.map((photo) => (
                      <TouchableOpacity
                        key={photo.id}
                        style={styles.photoCard}
                        onPress={() => {
                          console.log('[ScorecardPhotosModal] Photo tapped:', photo.id);
                          setSelectedPhoto(photo);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.thumbnailContainer} pointerEvents="none">
                          <Image 
                            source={{ uri: photo.photo_url }} 
                            style={styles.thumbnail}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={styles.photoInfo} pointerEvents="none">
                          <Text style={styles.photoLabel} numberOfLines={1}>
                            {photo.group_label}
                          </Text>
                          {photo.day && (
                            <Text style={styles.photoMeta}>Day {photo.day}</Text>
                          )}
                          <Text style={styles.photoDate}>
                            {formatDistanceToNow(new Date(photo.created_at), { addSuffix: true })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.deleteAllButton}
                    onPress={handleDeleteAllPhotos}
                    disabled={isDeleting}
                  >
                    <Trash2 size={18} color="#fff" />
                    <Text style={styles.deleteAllButtonText}>
                      {isDeleting ? 'Deleting...' : 'Delete Photo'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.photoDetailContainer}>
              <ZoomableImage photoUrl={selectedPhoto.photo_url} />
              <View style={styles.photoDetailInfo}>
                <Text style={styles.detailText}>
                  {selectedPhoto.group_label}
                  {selectedPhoto.day ? ` • Day ${selectedPhoto.day}` : ''}
                  {selectedPhoto.tee ? ` • ${selectedPhoto.tee}` : ''}
                </Text>
                <Text style={styles.detailDate}>
                  {formatDistanceToNow(new Date(selectedPhoto.created_at), { addSuffix: true })}
                </Text>
              </View>
              <View style={styles.photoDetailActions}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedPhoto(null)}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePhoto(selectedPhoto)}
                  disabled={isDeleting}
                >
                  <Trash2 size={18} color="#fff" />
                  <Text style={styles.deleteButtonText}>
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ZoomableImage({ photoUrl }: { photoUrl: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const baseScale = useRef(1);
  const lastScale = useRef(1);
  const pinchRef = useRef<number | null>(null);

  const getDistance = (touches: { pageX: number; pageY: number }[]) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.numberActiveTouches === 2;
      },
      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          pinchRef.current = getDistance(evt.nativeEvent.touches as any);
          baseScale.current = lastScale.current;
        }
      },
      onPanResponderMove: (evt) => {
        if (evt.nativeEvent.touches.length === 2 && pinchRef.current !== null) {
          const currentDistance = getDistance(evt.nativeEvent.touches as any);
          const newScale = (currentDistance / pinchRef.current) * baseScale.current;
          const clampedScale = Math.min(Math.max(newScale, 0.5), 4);
          scale.setValue(clampedScale);
        }
      },
      onPanResponderRelease: () => {
        lastScale.current = (scale as any)._value || 1;
        pinchRef.current = null;
      },
      onPanResponderTerminate: () => {
        lastScale.current = (scale as any)._value || 1;
        pinchRef.current = null;
      },
    })
  ).current;

  const lastTap = useRef(0);

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap - reset zoom
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
      lastScale.current = 1;
      baseScale.current = 1;
    }
    lastTap.current = now;
  };

  return (
    <View style={styles.zoomContainer} {...panResponder.panHandlers}>
      <TouchableOpacity activeOpacity={1} onPress={onTap} style={styles.zoomTouchable}>
        <Animated.Image
          source={{ uri: photoUrl }}
          style={[
            styles.fullImage,
            { transform: [{ scale }] },
          ]}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <Text style={styles.zoomHint}>Pinch to zoom • Double tap to reset</Text>
    </View>
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  photosGrid: {
    gap: 12,
  },
  photoCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  photoInfo: {
    padding: 12,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 4,
  },
  photoMeta: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  photoDate: {
    fontSize: 12,
    color: '#999',
  },
  deleteAllButton: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  deleteAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoDetailContainer: {
    flex: 1,
  },
  zoomContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: Dimensions.get('window').width * 0.85,
    height: Dimensions.get('window').height * 0.45,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 8,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  photoDetailInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  photoDetailActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
