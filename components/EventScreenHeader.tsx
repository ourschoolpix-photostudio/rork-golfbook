import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { RefreshCw, FileText } from 'lucide-react-native';
import { Event } from '@/types';

interface HeaderAction {
  icon: 'refresh' | 'pdf' | 'custom';
  label: string;
  onPress: () => void;
  disabled?: boolean;
  customIcon?: React.ReactNode;
}

interface EventScreenHeaderProps {
  title: string;
  event?: Event | null;
  actions?: HeaderAction[];
  showEventPhoto?: boolean;
  onViewDetails?: () => void;
}

export const EventScreenHeader: React.FC<EventScreenHeaderProps> = ({
  title,
  event,
  actions = [],
  showEventPhoto = true,
  onViewDetails,
}) => {
  const renderActionIcon = (action: HeaderAction) => {
    if (action.customIcon) {
      return action.customIcon;
    }
    
    switch (action.icon) {
      case 'refresh':
        return <RefreshCw size={16} color="#333" style={action.disabled ? styles.iconDisabled : undefined} />;
      case 'pdf':
        return <FileText size={16} color="#333" style={action.disabled ? styles.iconDisabled : undefined} />;
      default:
        return null;
    }
  };

  return (
    <>
      <View style={styles.header}>
        {actions.length > 0 && (
          <View style={styles.headerButtonsRow}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={action.onPress}
                style={styles.headerActionButton}
                activeOpacity={0.7}
                disabled={action.disabled}
              >
                {renderActionIcon(action)}
                <Text style={styles.headerActionButtonText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={styles.titleText}>{title}</Text>
      </View>

      {showEventPhoto && event && event.photoUrl && (
        <View style={styles.eventPhotoContainer}>
          <Image source={{ uri: event.photoUrl }} style={styles.eventPhoto} />
          <View style={styles.darkOverlay} />
          {onViewDetails && (
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={onViewDetails}
              activeOpacity={0.8}
            >
              <Text style={styles.viewDetailsButtonText}>View Details</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.eventNameOverlay}>{event.name}</Text>
          <View style={styles.bottomInfoOverlay}>
            <Text style={styles.eventLocationOverlay}>{event.location}</Text>
            <Text style={styles.eventDateOverlay}>
              {event.date}
              {event.endDate && event.endDate !== event.date ? ` - ${event.endDate}` : ''}
            </Text>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#5A0015',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 6.75,
    gap: 10,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerButtonsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    width: '100%',
  },
  headerActionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFD54F',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  headerActionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#333',
  },
  iconDisabled: {
    opacity: 0.5,
  },
  eventPhotoContainer: {
    position: 'relative' as const,
    width: '100%',
    height: 80,
  },
  eventPhoto: {
    width: '100%',
    height: 80,
    resizeMode: 'cover' as const,
  },
  darkOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  eventNameOverlay: {
    position: 'absolute' as const,
    top: 4,
    left: 0,
    right: 0,
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center' as const,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomInfoOverlay: {
    position: 'absolute' as const,
    bottom: 8,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center' as const,
    gap: 2,
  },
  eventLocationOverlay: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eventDateOverlay: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  viewDetailsButton: {
    position: 'absolute' as const,
    top: 6,
    left: 12,
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 10,
  },
  viewDetailsButtonText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
