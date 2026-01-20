import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member, Event } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { supabase } from '@/integrations/supabase/client';
import { Alert } from '@/utils/alertPolyfill';

interface EventPaymentInvoiceModalProps {
  visible: boolean;
  member: Member | null;
  event: Event | null;
  registration: any;
  onClose: () => void;
  onPaymentComplete: (paymentMethod: 'cash' | 'zelle' | 'paypal') => Promise<void>;
}

const PAYPAL_FEE_PERCENT = 0.03;
const PAYPAL_FEE_FIXED = 0.30;

export function EventPaymentInvoiceModal({
  visible,
  member,
  event,
  registration,
  onClose,
  onPaymentComplete,
}: EventPaymentInvoiceModalProps) {
  const { orgInfo } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'zelle' | 'paypal' | null>(null);

  if (!member || !event) return null;

  const guestCount = registration?.numberOfGuests || 0;
  const totalPeople = 1 + guestCount;
  const entryFee = Number(event.entryFee) || 0;
  const baseAmount = entryFee * totalPeople;
  const serviceFeeAmount = (baseAmount * PAYPAL_FEE_PERCENT) + PAYPAL_FEE_FIXED;
  const paypalTotalAmount = baseAmount + serviceFeeAmount;

  const handleConfirmPayment = async () => {
    if (!selectedMethod || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const amount = selectedMethod === 'paypal' ? paypalTotalAmount : baseAmount;

      const { error } = await supabase.from('event_payments').insert({
        event_id: event.id,
        member_id: member.id,
        member_name: member.name,
        event_name: event.name,
        amount: amount.toFixed(2),
        payment_method: selectedMethod,
        payment_status: 'completed',
        number_of_guests: guestCount,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.log('[EventPaymentInvoiceModal] event_payments table may not exist, skipping historical record:', error.message);
      } else {
        console.log('[EventPaymentInvoiceModal] ✅ Event payment record created successfully');
      }

      await onPaymentComplete(selectedMethod);
      
      onClose();
      setSelectedMethod(null);
      
      Alert.alert(
        'Payment Recorded',
        `${member.name} has been marked as paid via ${selectedMethod === 'paypal' ? 'PayPal' : selectedMethod === 'zelle' ? 'Zelle' : 'Cash'}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[EventPaymentInvoiceModal] Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodColor = (method: 'cash' | 'zelle' | 'paypal') => {
    switch (method) {
      case 'cash': return '#4CAF50';
      case 'zelle': return '#6B21A8';
      case 'paypal': return '#0070BA';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Event Payment</Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <Ionicons name="receipt" size={32} color="#1B5E20" />
                <Text style={styles.invoiceTitle}>INVOICE</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.invoiceSection}>
                <Text style={styles.sectionTitle}>Event Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Event:</Text>
                  <Text style={styles.detailValue}>{event.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Player:</Text>
                  <Text style={styles.detailValue}>{member.name}</Text>
                </View>
                {guestCount > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Guests:</Text>
                    <Text style={styles.detailValue}>+{guestCount}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Entry Fee:</Text>
                  <Text style={styles.detailValue}>${entryFee.toFixed(2)} × {totalPeople}</Text>
                </View>
              </View>
            </View>

            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Total Amount Due</Text>
              <Text style={styles.amountValue}>${baseAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Select Payment Method</Text>

              <TouchableOpacity
                style={[
                  styles.paymentMethodCard,
                  selectedMethod === 'cash' && { borderColor: getMethodColor('cash'), borderWidth: 2 },
                ]}
                onPress={() => setSelectedMethod('cash')}
                disabled={isSubmitting}
              >
                <View style={[styles.methodIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="cash" size={24} color="#4CAF50" />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>Cash</Text>
                  <Text style={styles.methodAmount}>${baseAmount.toFixed(2)}</Text>
                </View>
                {selectedMethod === 'cash' && (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethodCard,
                  selectedMethod === 'zelle' && { borderColor: getMethodColor('zelle'), borderWidth: 2 },
                ]}
                onPress={() => setSelectedMethod('zelle')}
                disabled={isSubmitting}
              >
                <View style={[styles.methodIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="phone-portrait" size={24} color="#6B21A8" />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>Zelle</Text>
                  <Text style={styles.methodAmount}>${baseAmount.toFixed(2)}</Text>
                  {orgInfo.zellePhone && (
                    <Text style={styles.methodNote}>
                      Send to: {formatPhoneNumber(orgInfo.zellePhone)}
                    </Text>
                  )}
                </View>
                {selectedMethod === 'zelle' && (
                  <Ionicons name="checkmark-circle" size={24} color="#6B21A8" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethodCard,
                  selectedMethod === 'paypal' && { borderColor: getMethodColor('paypal'), borderWidth: 2 },
                ]}
                onPress={() => setSelectedMethod('paypal')}
                disabled={isSubmitting}
              >
                <View style={[styles.methodIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="logo-paypal" size={24} color="#0070BA" />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>PayPal</Text>
                  <View style={styles.paypalBreakdown}>
                    <Text style={styles.paypalFeeText}>
                      Base: ${baseAmount.toFixed(2)} + Fee: ${serviceFeeAmount.toFixed(2)}
                    </Text>
                    <Text style={styles.methodAmountPaypal}>${paypalTotalAmount.toFixed(2)}</Text>
                  </View>
                </View>
                {selectedMethod === 'paypal' && (
                  <Ionicons name="checkmark-circle" size={24} color="#0070BA" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedMethod && styles.confirmButtonDisabled,
                  selectedMethod && { backgroundColor: getMethodColor(selectedMethod) },
                ]}
                onPress={handleConfirmPayment}
                disabled={!selectedMethod || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>
                      CONFIRM PAYMENT
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  invoiceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1B5E20',
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#D0D0D0',
    marginVertical: 16,
  },
  invoiceSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600' as const,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600' as const,
    flex: 1,
    textAlign: 'right',
  },
  amountCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#1B5E20',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2E7D32',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  methodAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  methodNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  paypalBreakdown: {
    gap: 2,
  },
  paypalFeeText: {
    fontSize: 12,
    color: '#666',
  },
  methodAmountPaypal: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0070BA',
  },
  buttonContainer: {
    marginTop: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 1,
  },
});
