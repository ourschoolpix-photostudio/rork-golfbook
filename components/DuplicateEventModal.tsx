import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '@/types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

interface DuplicateEventModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
  onDuplicate: (newEvent: Event) => Promise<void>;
}

export const DuplicateEventModal: React.FC<DuplicateEventModalProps> = ({
  visible,
  event,
  onClose,
  onDuplicate,
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (event && visible) {
      setStartDate(event.date || '');
      setEndDate(event.endDate || event.date || '');
    }
  }, [event, visible]);

  const handleDuplicate = async () => {
    if (!event) return;
    
    if (!startDate || !startDate.trim()) {
      Alert.alert('Validation Error', 'Please enter a start date (YYYY-MM-DD)');
      return;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(startDate)) {
      Alert.alert('Validation Error', 'Start date must be in YYYY-MM-DD format');
      return;
    }

    if (endDate && !datePattern.test(endDate)) {
      Alert.alert('Validation Error', 'End date must be in YYYY-MM-DD format');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const newEventId = uuidv4();
      
      const duplicatedEvent: Event = {
        ...event,
        id: newEventId,
        date: startDate,
        startDate: startDate,
        endDate: endDate || startDate,
        createdAt: new Date().toISOString(),
        archived: false,
        archivedAt: undefined,
        registeredPlayers: [],
      };

      await onDuplicate(duplicatedEvent);
      
      Alert.alert('Success', 'Event duplicated successfully');
      onClose();
    } catch (error) {
      console.error('Error duplicating event:', error);
      Alert.alert('Error', 'Failed to duplicate event');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DUPLICATE EVENT</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EVENT TO DUPLICATE</Text>
            <View style={styles.detailCard}>
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventDetail}>Original Date: {event.date}</Text>
              {event.endDate && event.endDate !== event.date && (
                <Text style={styles.eventDetail}>End Date: {event.endDate}</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEW EVENT DATES</Text>
            <View style={styles.detailCard}>
              <Text style={styles.inputLabel}>Start Date *</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
              
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>End Date</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD (optional)"
                placeholderTextColor="#999"
              />

              <Text style={styles.helpText}>
                Date format: YYYY-MM-DD (e.g., 2025-12-31)
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.warningTitle}>Note:</Text>
            <Text style={styles.warningText}>
              This will create a new event with all the same settings as the original event, 
              but with the new dates you specify. Registrations, scores, and groupings will 
              NOT be copied.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.buttonFooter}>
          <TouchableOpacity
            style={[styles.duplicateButton, isSubmitting && styles.disabledButton]}
            onPress={handleDuplicate}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.duplicateButtonText}>DUPLICATE EVENT</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailCard: {
    backgroundColor: '#D9D9D9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  eventDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FF9800',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  buttonFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  duplicateButton: {
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  duplicateButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
});
