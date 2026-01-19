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
import { X, Trash2, AlertCircle } from 'lucide-react-native';
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
  const { templates, createAlert, refreshAlerts, alerts, deleteAlert } = useAlerts();
  const { events } = useEvents();
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [type, setType] = useState<'organizational' | 'event'>('organizational');
  const [priority, setPriority] = useState<'normal' | 'critical'>('normal');
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(preSelectedEventId);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(24);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setMessage('');
      setType(preSelectedEventId ? 'event' : 'organizational');
      setPriority('normal');
      setSelectedEventId(preSelectedEventId);
      setSelectedTemplate(null);
      setExpiresIn(24);
      setActiveTab('create');
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
      const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString();

      await createAlert({
        title: title.trim(),
        message: message.trim(),
        type,
        priority,
        eventId: type === 'event' ? selectedEventId : undefined,
        createdBy: currentUser.id,
        expiresAt,
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

  const handleDeleteAll = async () => {
    Alert.alert(
      'Delete All Alerts',
      'Are you sure you want to delete ALL alerts? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              
              for (const alert of alerts) {
                await deleteAlert(alert.id);
              }
              
              Alert.alert('Success', `Deleted ${alerts.length} alert(s)`);
              await refreshAlerts();
            } catch (error) {
              console.error('Failed to delete alerts:', error);
              Alert.alert('Error', 'Failed to delete some alerts');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteSingle = async (alertId: string) => {
    try {
      await deleteAlert(alertId);
      await refreshAlerts();
    } catch (error) {
      console.error('Failed to delete alert:', error);
      Alert.alert('Error', 'Failed to delete alert');
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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
            <Text style={styles.headerTitle}>Alerts</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'create' && styles.tabActive]}
              onPress={() => setActiveTab('create')}
            >
              <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
                Create Alert
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'manage' && styles.tabActive]}
              onPress={() => setActiveTab('manage')}
            >
              <Text style={[styles.tabText, activeTab === 'manage' && styles.tabTextActive]}>
                Manage Alerts
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'create' ? (
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
                    Critical
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
              <Text style={styles.label}>Expires In</Text>
              <View style={styles.expiresButtons}>
                {[6, 12, 24, 48, 72].map((hours) => (
                  <TouchableOpacity
                    key={hours}
                    style={[
                      styles.expiresButton,
                      expiresIn === hours && styles.expiresButtonActive
                    ]}
                    onPress={() => setExpiresIn(hours)}
                  >
                    <Text style={[
                      styles.expiresButtonText,
                      expiresIn === hours && styles.expiresButtonTextActive
                    ]}>
                      {hours}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.manageHeader}>
                <Text style={styles.manageTitle}>
                  All Alerts ({alerts.length})
                </Text>
                {alerts.length > 0 && (
                  <TouchableOpacity
                    style={[styles.deleteAllButton, isDeleting && styles.deleteAllButtonDisabled]}
                    onPress={handleDeleteAll}
                    disabled={isDeleting}
                  >
                    <Trash2 size={16} color="#ffffff" />
                    <Text style={styles.deleteAllButtonText}>
                      {isDeleting ? 'Deleting...' : 'Delete All'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {alerts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No alerts created yet</Text>
                </View>
              ) : (
                alerts.map((alert) => (
                  <View key={alert.id} style={styles.alertItem}>
                    <View style={styles.alertItemHeader}>
                      <View style={styles.alertItemTitleRow}>
                        {alert.priority === 'critical' && (
                          <AlertCircle size={16} color="#ef4444" />
                        )}
                        <Text style={styles.alertItemTitle}>{alert.title}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteSingle(alert.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.alertItemMessage} numberOfLines={2}>
                      {alert.message}
                    </Text>
                    <View style={styles.alertItemFooter}>
                      <View style={styles.alertItemBadges}>
                        <View style={[styles.badge, alert.type === 'organizational' ? styles.badgeOrg : styles.badgeEvent]}>
                          <Text style={styles.badgeText}>{alert.type}</Text>
                        </View>
                        {alert.priority === 'critical' && (
                          <View style={[styles.badge, styles.badgeCritical]}>
                            <Text style={styles.badgeText}>Critical</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.alertItemDate}>{formatDate(alert.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  manageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  manageTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteAllButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  deleteAllButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  alertItem: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  alertItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  alertItemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
    flex: 1,
  },
  alertItemMessage: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  alertItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertItemBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeOrg: {
    backgroundColor: '#dbeafe',
  },
  badgeEvent: {
    backgroundColor: '#f3e8ff',
  },
  badgeCritical: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#374151',
  },
  alertItemDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  expiresButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  expiresButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  expiresButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  expiresButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  expiresButtonTextActive: {
    color: '#1e40af',
  },
});
