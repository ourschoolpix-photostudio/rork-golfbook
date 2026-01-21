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

const calculatePayPalTotal = (baseAmount: number) => {
  const serviceFee = (baseAmount * PAYPAL_FEE_PERCENT) + PAYPAL_FEE_FIXED;
  return { serviceFee, total: baseAmount + serviceFee };
};

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
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'zelle' | 'paypal' | null>(null);

  if (!member || !event) return null;

  const guestCount = registration?.numberOfGuests || 0;
  const totalPeople = 1 + guestCount;
  
  const availablePackages = [
    event.package1Name && event.package1Price ? { id: 1 as const, name: event.package1Name, price: Number(event.package1Price), description: event.package1Description } : null,
    event.package2Name && event.package2Price ? { id: 2 as const, name: event.package2Name, price: Number(event.package2Price), description: event.package2Description } : null,
    event.package3Name && event.package3Price ? { id: 3 as const, name: event.package3Name, price: Number(event.package3Price), description: event.package3Description } : null,
  ].filter(Boolean) as { id: 1 | 2 | 3; name: string; price: number; description?: string }[];
  
  const defaultEntryFee = Number(event.entryFee) || 0;

  const calculateEntryFee = () => {
    let baseAmount = defaultEntryFee;
    
    if (selectedPackage && availablePackages.length > 0) {
      const pkg = availablePackages.find(p => p.id === selectedPackage);
      if (pkg) {
        baseAmount = pkg.price;
      }
    }
    
    const subtotal = baseAmount * totalPeople;
    
    if (selectedPaymentMethod === 'paypal') {
      const { serviceFee, total } = calculatePayPalTotal(subtotal);
      return { baseAmount, subtotal, serviceFee, total };
    }
    
    return { baseAmount, subtotal, serviceFee: 0, total: subtotal };
  };

  const handleSave = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method.');
      return;
    }

    if (availablePackages.length > 0 && !selectedPackage) {
      Alert.alert('Error', 'Please select a package option.');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const { total } = calculateEntryFee();

      const paymentData: any = {
        event_id: event.id,
        member_id: member.id,
        member_name: member.name,
        event_name: event.name,
        amount: total.toFixed(2),
        payment_method: selectedPaymentMethod,
        payment_status: 'completed',
        number_of_guests: guestCount,
        created_at: new Date().toISOString(),
      };
      
      if (selectedPackage) {
        paymentData.package_selected = selectedPackage;
      }
      
      console.log('[EventPaymentInvoiceModal] Creating payment history record...');
      console.log('[EventPaymentInvoiceModal] Payment data:', JSON.stringify(paymentData, null, 2));
      
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('event_payments')
        .insert(paymentData)
        .select();

      if (paymentError) {
        console.error('[EventPaymentInvoiceModal] ❌ Error creating payment history:', paymentError.message);
        console.error('[EventPaymentInvoiceModal] Error details:', paymentError.details);
        console.error('[EventPaymentInvoiceModal] Error hint:', paymentError.hint);
        throw paymentError;
      } else if (paymentRecord && paymentRecord.length > 0) {
        console.log('[EventPaymentInvoiceModal] ✅ Payment history record created:', paymentRecord[0].id);
      } else {
        console.warn('[EventPaymentInvoiceModal] ⚠️ Payment history insert returned no data');
      }

      await onPaymentComplete(selectedPaymentMethod);
      
      onClose();
      
      const methodName = selectedPaymentMethod === 'cash' ? 'Cash' : selectedPaymentMethod === 'zelle' ? 'Zelle' : 'PayPal';
      Alert.alert(
        'Payment Recorded',
        `${member.name} has been marked as paid via ${methodName}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[EventPaymentInvoiceModal] Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fees = calculateEntryFee();

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
              </View>
            </View>

            {/* Package Selection */}
            {availablePackages.length > 0 && (
              <View style={styles.packageBox}>
                <Text style={styles.sectionTitle}>Select Package Option</Text>
                <View style={styles.packagesContainer}>
                  {availablePackages.map((pkg, index) => (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[
                        styles.packageOption,
                        selectedPackage === pkg.id && styles.packageOptionSelected
                      ]}
                      onPress={() => setSelectedPackage(pkg.id)}
                      disabled={isSubmitting}
                    >
                      <View style={styles.packageRadio}>
                        {selectedPackage === pkg.id && <View style={styles.packageRadioInner} />}
                      </View>
                      <View style={styles.packageDetails}>
                        <Text style={styles.packageName}>Option {index + 1}: {pkg.name}</Text>
                        <Text style={styles.packagePrice}>${pkg.price.toFixed(2)} per person</Text>
                        {pkg.description && (
                          <Text style={styles.packageDescription}>{pkg.description}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Entry Fee Display */}
            <View style={styles.entryFeeBox}>
              <Text style={styles.sectionTitle}>Entry Fee</Text>
              <View style={styles.feeBreakdown}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Base Amount:</Text>
                  <Text style={styles.feeValue}>${fees.baseAmount.toFixed(2)} × {totalPeople}</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Subtotal:</Text>
                  <Text style={styles.feeValue}>${fees.subtotal.toFixed(2)}</Text>
                </View>
                {fees.serviceFee > 0 && (
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>PayPal Service Fee:</Text>
                    <Text style={styles.feeValue}>${fees.serviceFee.toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.divider} />
                <View style={styles.feeRow}>
                  <Text style={styles.feeTotalLabel}>Total:</Text>
                  <Text style={styles.feeTotalValue}>${fees.total.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Payment Method Selection */}
            <View style={styles.paymentMethodBox}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethodsContainer}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodOption,
                    selectedPaymentMethod === 'cash' && styles.paymentMethodSelected
                  ]}
                  onPress={() => setSelectedPaymentMethod('cash')}
                  disabled={isSubmitting}
                >
                  <View style={styles.paymentMethodRadio}>
                    {selectedPaymentMethod === 'cash' && <View style={styles.paymentMethodRadioInner} />}
                  </View>
                  <View style={[styles.methodIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="cash" size={24} color="#2E7D32" />
                  </View>
                  <Text style={styles.paymentMethodLabel}>Cash</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodOption,
                    selectedPaymentMethod === 'zelle' && styles.paymentMethodSelected
                  ]}
                  onPress={() => setSelectedPaymentMethod('zelle')}
                  disabled={isSubmitting}
                >
                  <View style={styles.paymentMethodRadio}>
                    {selectedPaymentMethod === 'zelle' && <View style={styles.paymentMethodRadioInner} />}
                  </View>
                  <View style={[styles.methodIcon, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="phone-portrait" size={24} color="#6B21A8" />
                  </View>
                  <Text style={styles.paymentMethodLabel}>Zelle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodOption,
                    selectedPaymentMethod === 'paypal' && styles.paymentMethodSelected
                  ]}
                  onPress={() => setSelectedPaymentMethod('paypal')}
                  disabled={isSubmitting}
                >
                  <View style={styles.paymentMethodRadio}>
                    {selectedPaymentMethod === 'paypal' && <View style={styles.paymentMethodRadioInner} />}
                  </View>
                  <View style={[styles.methodIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="logo-paypal" size={24} color="#0070BA" />
                  </View>
                  <Text style={styles.paymentMethodLabel}>PayPal</Text>
                </TouchableOpacity>
              </View>

              {selectedPaymentMethod === 'zelle' && (orgInfo.zellePhone || orgInfo.zelleName) && (
                <View style={styles.zelleInfoBox}>
                  <Text style={styles.zelleInfoTitle}>Zelle Information</Text>
                  {orgInfo.zellePhone && (
                    <Text style={styles.zelleInfoText}>Phone: {formatPhoneNumber(orgInfo.zellePhone)}</Text>
                  )}
                  {orgInfo.zelleName && (
                    <Text style={styles.zelleInfoText}>Name: {orgInfo.zelleName}</Text>
                  )}
                </View>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!selectedPaymentMethod || (availablePackages.length > 0 && !selectedPackage)) && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={isSubmitting || !selectedPaymentMethod || (availablePackages.length > 0 && !selectedPackage)}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save & Mark as Paid</Text>
              )}
            </TouchableOpacity>

            {event.specialNotes && (
              <View style={styles.specialNotesBox}>
                <Text style={styles.specialNotesTitle}>Special Notes</Text>
                <Text style={styles.specialNotesText}>{event.specialNotes}</Text>
              </View>
            )}
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
  packageBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  packagesContainer: {
    gap: 12,
    marginTop: 12,
  },
  packageOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  packageOptionSelected: {
    borderColor: '#1B5E20',
    backgroundColor: '#F1F8F4',
  },
  packageRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  packageRadioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1B5E20',
  },
  packageDetails: {
    flex: 1,
  },
  packageName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1B5E20',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  entryFeeBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  feeBreakdown: {
    marginTop: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  feeLabel: {
    fontSize: 14,
    color: '#666',
  },
  feeValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600' as const,
  },
  feeTotalLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  feeTotalValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1B5E20',
  },
  paymentMethodBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  paymentMethodOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  paymentMethodSelected: {
    borderColor: '#1B5E20',
    backgroundColor: '#F1F8F4',
  },
  paymentMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  paymentMethodRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1B5E20',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  paymentMethodLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  zelleInfoBox: {
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  zelleInfoTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#6B21A8',
    marginBottom: 6,
  },
  zelleInfoText: {
    fontSize: 13,
    color: '#581C87',
    fontWeight: '600' as const,
  },
  saveButton: {
    backgroundColor: '#1B5E20',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  specialNotesBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  specialNotesTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#B8860B',
    marginBottom: 8,
  },
  specialNotesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
