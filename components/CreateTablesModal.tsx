import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CreateTablesModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateTables: (count: number, label: string) => void;
}

export function CreateTablesModal({
  visible,
  onClose,
  onCreateTables,
}: CreateTablesModalProps) {
  const [tableCount, setTableCount] = useState<string>('');
  const [tableLabel, setTableLabel] = useState<string>('');

  const handleCreate = () => {
    const count = parseInt(tableCount, 10);
    
    if (!tableLabel.trim()) {
      Alert.alert('Error', 'Please enter a table label');
      return;
    }
    
    if (isNaN(count) || count < 1 || count > 50) {
      Alert.alert('Error', 'Please enter a valid number between 1 and 50');
      return;
    }
    
    onCreateTables(count, tableLabel.trim().toUpperCase());
    setTableCount('');
    setTableLabel('');
    onClose();
  };

  const handleCancel = () => {
    setTableCount('');
    setTableLabel('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Tables</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Table Label</Text>
              <Text style={styles.inputHint}>
                (e.g., &quot;B&quot; will create tables B1, B2, B3...)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter label (A, B, C, etc.)"
                value={tableLabel}
                onChangeText={setTableLabel}
                autoCapitalize="characters"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Number of Tables</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter number of tables"
                value={tableCount}
                onChangeText={setTableCount}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalBtn, styles.createBtn]}
              onPress={handleCreate}
            >
              <Text style={styles.createBtnText}>Create</Text>
            </TouchableOpacity>
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
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#333',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#666',
  },
  createBtn: {
    backgroundColor: '#1B5E20',
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
