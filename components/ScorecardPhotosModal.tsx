import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Pressable,
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
            <ScrollView style={styles.body}>
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
                      <Pressable
                        key={photo.id}
                        style={styles.photoCard}
                        onPress={() => setSelectedPhoto(photo)}
                      >
                        <View style={styles.thumbnailContainer}>
                          <Image 
                            source={{ uri: photo.photo_url }} 
                            style={styles.thumbnail}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={styles.photoInfo}>
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
                      </Pressable>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.deleteAllButton}
                    onPress={handleDeleteAllPhotos}
                    disabled={isDeleting}
                  >
                    <Trash2 size={18} color="#fff" />
                    <Text style={styles.deleteAllButtonText}>
                      {isDeleting ? 'Deleting...' : `Delete All (${photos.length})`}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.photoDetailContainer}>
              <ScrollView 
                style={styles.photoDetailScroll}
                contentContainerStyle={styles.photoDetailScrollContent}
              >
                <View style={styles.fullImageContainer}>
                  <ScrollView
                    style={styles.zoomScrollView}
                    contentContainerStyle={styles.zoomContentContainer}
                    maximumZoomScale={4}
                    minimumZoomScale={1}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    bouncesZoom={true}
                    centerContent={true}
                    scrollEnabled={true}
                    pinchGestureEnabled={true}
                  >
                    <Image 
                      source={{ uri: selectedPhoto.photo_url }} 
                      style={styles.fullImage}
                      resizeMode="contain"
                    />
                  </ScrollView>
                  <Text style={styles.zoomHint}>Pinch to zoom</Text>
                </View>
                <View style={styles.photoDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Group:</Text>
                    <Text style={styles.detailValue}>{selectedPhoto.group_label}</Text>
                  </View>
                  {selectedPhoto.day && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Day:</Text>
                      <Text style={styles.detailValue}>{selectedPhoto.day}</Text>
                    </View>
                  )}
                  {selectedPhoto.tee && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tee:</Text>
                      <Text style={styles.detailValue}>{selectedPhoto.tee}</Text>
                    </View>
                  )}
                  {selectedPhoto.hole_range && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Holes:</Text>
                      <Text style={styles.detailValue}>{selectedPhoto.hole_range}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Saved:</Text>
                    <Text style={styles.detailValue}>
                      {formatDistanceToNow(new Date(selectedPhoto.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.photoDetailActions}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedPhoto(null)}
                >
                  <Text style={styles.backButtonText}>Back to List</Text>
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
  photoDetailScroll: {
    flex: 1,
  },
  photoDetailScrollContent: {
    flexGrow: 1,
  },
  fullImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  zoomScrollView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  zoomContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  zoomHint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  photoDetails: {
    padding: 20,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
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
