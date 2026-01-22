import { useAuth } from '@/contexts/AuthContext';
import { canViewFinance, canAddExpensesGains } from '@/utils/rolePermissions';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { EventScreenHeader } from '@/components/EventScreenHeader';
import { EventFooter } from '@/components/EventFooter';
import { useState, useMemo, useCallback } from 'react';
import { useEvents } from '@/contexts/EventsContext';
import { FinancialRecord } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabaseService } from '@/utils/supabaseService';

type ExpenseCategory = 'food' | 'drink' | 'venue' | 'trophy' | 'custom';
type GainCategory = 'donation' | 'sponsorship' | 'merch' | 'custom';

export default function FinanceScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { addFinancial } = useEvents();
  
  const { data: event, refetch: refetchEvent } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => supabaseService.events.get(eventId || ''),
    enabled: !!eventId,
  });
  
  const { data: registrations = [], refetch: refetchRegistrations } = useQuery({
    queryKey: ['registrations', eventId],
    queryFn: () => supabaseService.registrations.getAll(eventId || ''),
    enabled: !!eventId,
  });
  
  const { data: financials = [], refetch: refetchFinancials } = useQuery({
    queryKey: ['financials', eventId],
    queryFn: () => supabaseService.financials.getAll(eventId || ''),
    enabled: !!eventId,
  });

  useFocusEffect(
    useCallback(() => {
      console.log('[finance] 🎯 Page FOCUSED - refetching data');
      refetchEvent();
      refetchRegistrations();
      refetchFinancials();
    }, [refetchEvent, refetchRegistrations, refetchFinancials])
  );
  
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [gainModalVisible, setGainModalVisible] = useState(false);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<ExpenseCategory | null>(null);
  const [selectedGainCategory, setSelectedGainCategory] = useState<GainCategory | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const eventFinancials = useMemo(() => financials || [], [financials]);
  const eventRegistrations = useMemo(() => registrations || [], [registrations]);

  const entryFeeTotal = useMemo(() => {
    const entryFee = Number(event?.entryFee) || 0;
    const paidRegistrations = eventRegistrations.filter(r => r.paymentStatus === 'paid');
    const totalPeople = paidRegistrations.reduce((sum, reg) => {
      const guestCount = reg.numberOfGuests || 0;
      return sum + 1 + guestCount;
    }, 0);
    return totalPeople * entryFee;
  }, [event, eventRegistrations]);

  const expenses = useMemo(() => {
    return eventFinancials.filter(f => f.type === 'expense');
  }, [eventFinancials]);

  const gains = useMemo(() => {
    return eventFinancials.filter(f => f.type === 'income');
  }, [eventFinancials]);

  const expenseTotal = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const gainTotal = useMemo(() => {
    return gains.reduce((sum, g) => sum + g.amount, 0);
  }, [gains]);

  const total = entryFeeTotal + gainTotal;
  const profit = total - expenseTotal;

  const handleAddExpense = async () => {
    if (!selectedExpenseCategory || !amount) {
      Alert.alert('Error', 'Please select a category and enter an amount');
      return;
    }

    if (selectedExpenseCategory === 'custom' && !description.trim()) {
      Alert.alert('Error', 'Please enter a description for custom expense');
      return;
    }

    const categoryLabels: Record<ExpenseCategory, string> = {
      food: 'Food Cost',
      drink: 'Drink Cost',
      venue: 'Venue Cost',
      trophy: 'Trophy Cost',
      custom: description.trim(),
    };

    const newExpense: FinancialRecord = {
      id: Date.now().toString(),
      eventId: eventId!,
      type: 'expense',
      amount: parseFloat(amount),
      description: categoryLabels[selectedExpenseCategory],
      date: new Date().toISOString(),
    };

    await addFinancial(newExpense);
    await refetchFinancials();
    setExpenseModalVisible(false);
    setSelectedExpenseCategory(null);
    setAmount('');
    setDescription('');
  };

  const handleAddGain = async () => {
    if (!selectedGainCategory || !amount) {
      Alert.alert('Error', 'Please select a category and enter an amount');
      return;
    }

    if (selectedGainCategory === 'custom' && !description.trim()) {
      Alert.alert('Error', 'Please enter a description for custom gain');
      return;
    }

    const categoryLabels: Record<GainCategory, string> = {
      donation: 'Donation',
      sponsorship: 'Sponsorship',
      merch: 'Merch Sales',
      custom: description.trim(),
    };

    const newGain: FinancialRecord = {
      id: Date.now().toString(),
      eventId: eventId!,
      type: 'income',
      amount: parseFloat(amount),
      description: categoryLabels[selectedGainCategory],
      date: new Date().toISOString(),
    };

    await addFinancial(newGain);
    await refetchFinancials();
    setGainModalVisible(false);
    setSelectedGainCategory(null);
    setAmount('');
    setDescription('');
  };

  if (!canViewFinance(currentUser)) {
    return (
      <>
        <SafeAreaView style={styles.container}>
          <EventScreenHeader title="FINANCE" />
          <View style={styles.noAccessContainer}>
            <Text style={styles.noAccessText}>You don&apos;t have permission to view this page</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <EventScreenHeader title="FINANCE" event={event as any} />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.mainCard}>
            <Text style={styles.mainCardLabel}>Entry Fee Total</Text>
            <Text style={styles.mainCardAmount}>${entryFeeTotal.toFixed(2)}</Text>
            <Text style={styles.mainCardSubtext}>
              {(() => {
                const paidRegs = eventRegistrations.filter(r => r.paymentStatus === 'paid');
                const totalPeople = paidRegs.reduce((sum, reg) => sum + 1 + (reg.numberOfGuests || 0), 0);
                return `${totalPeople} paid attendees × ${Number(event?.entryFee) || 0}`;
              })()}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Expenses</Text>
              {canAddExpensesGains(currentUser) && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setExpenseModalVisible(true)}
                >
                  <Plus size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            {expenses.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No expenses added yet</Text>
              </View>
            ) : (
              expenses.map((expense) => (
                <View key={expense.id} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemDescription}>{expense.description}</Text>
                    <Text style={styles.itemDate}>{new Date(expense.date).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.itemAmount}>-${expense.amount.toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gains</Text>
              {canAddExpensesGains(currentUser) && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setGainModalVisible(true)}
                >
                  <Plus size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            {gains.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No gains added yet</Text>
              </View>
            ) : (
              gains.map((gain) => (
                <View key={gain.id} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemDescription}>{gain.description}</Text>
                    <Text style={styles.itemDate}>{new Date(gain.date).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.itemAmount, styles.gainAmount]}>+${gain.amount.toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={[styles.summaryValue, styles.expenseValue]}>-${expenseTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.profitLabel}>Profit</Text>
              <Text style={[styles.profitValue, profit < 0 && styles.negativeProfit]}>
                ${profit.toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>

        <EventFooter hideTopRowButtons />

        <Modal
          visible={expenseModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setExpenseModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Expense</Text>
                <TouchableOpacity onPress={() => setExpenseModalVisible(false)}>
                  <X size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSectionTitle}>Category</Text>
              <View style={styles.categoryGrid}>
                {(['food', 'drink', 'venue', 'trophy', 'custom'] as ExpenseCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      selectedExpenseCategory === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedExpenseCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selectedExpenseCategory === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat === 'food' && 'Food Cost'}
                      {cat === 'drink' && 'Drink Cost'}
                      {cat === 'venue' && 'Venue Cost'}
                      {cat === 'trophy' && 'Trophy Cost'}
                      {cat === 'custom' && 'Custom'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedExpenseCategory === 'custom' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter description"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAddExpense}>
                <Text style={styles.submitButtonText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={gainModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setGainModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Gain</Text>
                <TouchableOpacity onPress={() => setGainModalVisible(false)}>
                  <X size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSectionTitle}>Category</Text>
              <View style={styles.categoryGrid}>
                {(['donation', 'sponsorship', 'merch', 'custom'] as GainCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      selectedGainCategory === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedGainCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selectedGainCategory === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat === 'donation' && 'Donation'}
                      {cat === 'sponsorship' && 'Sponsorship'}
                      {cat === 'merch' && 'Merch Sales'}
                      {cat === 'custom' && 'Custom'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedGainCategory === 'custom' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter description"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAddGain}>
                <Text style={styles.submitButtonText}>Add Gain</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 13.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  mainCard: {
    backgroundColor: '#1B5E20',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mainCardLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#a7f3d0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  mainCardAmount: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  mainCardSubtext: {
    fontSize: 14,
    color: '#d1fae5',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptySection: {
    backgroundColor: '#f9fafb',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  itemAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#dc2626',
  },
  gainAmount: {
    color: '#16a34a',
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1f2937',
  },
  expenseValue: {
    color: '#dc2626',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  profitLabel: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1f2937',
  },
  profitValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#16a34a',
  },
  negativeProfit: {
    color: '#dc2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1f2937',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryButtonActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  categoryButtonTextActive: {
    color: '#16a34a',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  submitButton: {
    backgroundColor: '#1B5E20',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAccessText: {
    fontSize: 18,
    color: '#6b7280',
  },

});
