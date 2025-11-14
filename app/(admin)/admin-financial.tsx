import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { storageService } from '@/utils/storage';
import { FinancialRecord } from '@/types';
import { AdminFooter } from '@/components/AdminFooter';

export default function AdminFinancialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', type: 'expense' as 'expense' | 'income' });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const data = await storageService.getFinancials();
    setRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleAddRecord = async () => {
    if (!form.description.trim() || !form.amount.trim()) {
      Alert.alert('Error', 'Description and amount are required');
      return;
    }

    const record: FinancialRecord = {
      id: Date.now().toString(),
      eventId: '',
      description: form.description,
      amount: parseFloat(form.amount),
      date: new Date().toISOString().split('T')[0],
      type: form.type,
    };

    await storageService.addFinancial(record);
    setForm({ description: '', amount: '', type: 'expense' });
    setModalVisible(false);
    loadRecords();
  };

  const totalIncome = records
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpense = records
    .filter((r) => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.customHeaderWrapper}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Financial Summary</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setForm({ description: '', amount: '', type: 'expense' });
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryAmount, { color: '#34C759' }]}>
            ${totalIncome.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Expense</Text>
          <Text style={[styles.summaryAmount, { color: '#FF3B30' }]}>
            ${totalExpense.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text
            style={[
              styles.summaryAmount,
              { color: totalIncome - totalExpense >= 0 ? '#34C759' : '#FF3B30' },
            ]}
          >
            ${(totalIncome - totalExpense).toFixed(2)}
          </Text>
        </View>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.recordCard}>
            <View style={styles.recordContent}>
              <Text style={styles.recordDescription}>{item.description}</Text>
              <Text style={styles.recordDate}>{item.date}</Text>
            </View>
            <Text
              style={[
                styles.recordAmount,
                { color: item.type === 'income' ? '#34C759' : '#FF3B30' },
              ]}
            >
              {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No financial records</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={[styles.modal, { paddingTop: insets.top }]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Record</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Description"
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount"
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={(text) => setForm({ ...form, amount: text })}
            />

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, form.type === 'expense' && styles.typeButtonActive]}
                onPress={() => setForm({ ...form, type: 'expense' })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    form.type === 'expense' && styles.typeButtonTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, form.type === 'income' && styles.typeButtonActive]}
                onPress={() => setForm({ ...form, type: 'income' })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    form.type === 'income' && styles.typeButtonTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddRecord}>
              <Text style={styles.submitText}>Add Record</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <AdminFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customHeaderWrapper: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 145,
    zIndex: 1000,
    backgroundColor: '#003366',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#003366',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute' as 'absolute',
    left: 16,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    position: 'absolute' as 'absolute',
    right: 16,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 161,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordContent: {
    flex: 1,
  },
  recordDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: '#999',
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  modal: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
