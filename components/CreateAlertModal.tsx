import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useAlerts } from '@/contexts/AlertsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
import { Event } from '@/types';

interface CreateAlertModalProps {
  visible: boolean;
  onClose: () => void;
  preSelectedEventId?: string;
}

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({
  visible,
  onClose,
  preSelectedEventId,
}) => {
  const { currentUser } = useAuth();
  const { templates, createAlert, refreshAlerts } = useAlerts();
  const { events } = useEvents();
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [type, setType] = useState<'organizational' | 'event'>('organizational');
  const [priority, setPriority] = useState<'normal' | 'critical'>('normal');
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(preSelectedEventId);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setMessage('');
      setType(preSelectedEventId ? 'event' : 'organizational');
      setPriority('normal');
      setSelectedEventId(preSelectedEventId);
      setSelectedTemplate(null);
    }
  }, [visible, preSelectedEventId]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setTitle(template.title);
      setMessage(template.message);
      setPriority(template.priority);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an alert title');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please enter an alert message');
      return;
    }

    if (type === 'event' && !selectedEventId) {
      Alert.alert('Error', 'Please select an event for this alert');
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to create alerts');
      return;
    }

    try {
      setIsCreating(true);
      await createAlert({
        title: title.trim(),
        message: message.trim(),
        type,
        priority,
        eventId: type === 'event' ? selectedEventId : undefined,
        createdBy: currentUser.id,
      });

      Alert.alert('Success', 'Alert created successfully');
      await refreshAlerts();
      onClose();
    } catch (error) {
      console.error('Failed to create alert:', error);
      Alert.alert('Error', 'Failed to create alert. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const activeEvents = events?.filter(e => !e.archived) || [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Alert</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Templates</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateChip,
                      selectedTemplate === template.id && styles.selectedTemplateChip
                    ]}
                    onPress={() => handleTemplateSelect(template.id)}
                  >
                    <Text style={[
                      styles.templateChipText,
                      selectedTemplate === template.id && styles.selectedTemplateChipText
                    ]}>
                      {template.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Alert Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'organizational' && styles.typeButtonActive
                  ]}
                  onPress={() => setType('organizational')}
                  disabled={!!preSelectedEventId}
                >
                  <Text style={[
                    styles.typeButtonText,
                    type === 'organizational' && styles.typeButtonTextActive
                  ]}>
                    Organizational
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'event' && styles.typeButtonActive
                  ]}
                  onPress={() => setType('event')}
                  disabled={!!preSelectedEventId}
                >
                  <Text style={[
                    styles.typeButtonText,
                    type === 'event' && styles.typeButtonTextActive
                  ]}>
                    Event Specific
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {type === 'event' && !preSelectedEventId && (
              <View style={styles.section}>
                <Text style={styles.label}>Select Event</Text>
                <ScrollView style={styles.eventsList}>
                  {activeEvents.map((event: Event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.eventItem,
                        selectedEventId === event.id && styles.selectedEventItem
                      ]}
                      onPress={() => setSelectedEventId(event.id)}
                    >
                      <Text style={[
                        styles.eventItemText,
                        selectedEventId === event.id && styles.selectedEventItemText
                      ]}>
                        {event.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityButtons}>
                <TouchableOpacity
                  style={[
                    styles.priorityButton,
                    priority === 'normal' && styles.priorityButtonNormal
                  ]}
                  onPress={() => setPriority('normal')}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    priority === 'normal' && styles.priorityButtonTextActive
                  ]}>
                    Normal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.priorityButton,
                    priority === 'critical' && styles.priorityButtonCritical
                  ]}
                  onPress={() => setPriority('critical')}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    priority === 'critical' && styles.priorityButtonTextActive
                  ]}>
                    Critical (Auto-Opens)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter alert title"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Enter alert message"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={isCreating}
            >
              <Text style={styles.createButtonText}>
                {isCreating ? 'Creating...' : 'Create Alert'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  templatesScroll: {
    flexDirection: 'row',
  },
  templateChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  selectedTemplateChip: {
    backgroundColor: '#3b82f6',
  },
  templateChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
  },
  selectedTemplateChipText: {
    color: '#ffffff',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  eventsList: {
    maxHeight: 150,
  },
  eventItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedEventItem: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  eventItemText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedEventItemText: {
    fontWeight: '600' as const,
    color: '#1e40af',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priorityButtonNormal: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  priorityButtonCritical: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  priorityButtonTextActive: {
    color: '#111827',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
});
