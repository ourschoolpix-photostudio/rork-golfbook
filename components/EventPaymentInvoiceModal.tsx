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
  const [processingPackage, setProcessingPackage] = useState<number | null>(null);

  if (!member || !event) return null;

  const guestCount = registration?.numberOfGuests || 0;
  const totalPeople = 1 + guestCount;
  
  const availablePackages = [
    event.package1Name && event.package1Price ? { id: 1 as const, name: event.package1Name, price: Number(event.package1Price), description: event.package1Description } : null,
    event.package2Name && event.package2Price ? { id: 2 as const, name: event.package2Name, price: Number(event.package2Price), description: event.package2Description } : null,
    event.package3Name && event.package3Price ? { id: 3 as const, name: event.package3Name, price: Number(event.package3Price), description: event.package3Description } : null,
  ].filter(Boolean) as { id: 1 | 2 | 3; name: string; price: number; description?: string }[];
  
  const defaultEntryFee = Number(event.entryFee) || 0;

  const handlePayment = async (method: 'zelle' | 'paypal', packageId?: number) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setProcessingPackage(packageId || null);
    
    try {
      const packagePrice = packageId 
        ? availablePackages.find(p => p.id === packageId)?.price || defaultEntryFee
        : defaultEntryFee;
      const baseAmount = packagePrice * totalPeople;
      const amount = method === 'paypal' ? calculatePayPalTotal(baseAmount).total : baseAmount;

      const paymentData: any = {
        event_id: event.id,
        member_id: member.id,
        member_name: member.name,
        event_name: event.name,
        amount: amount.toFixed(2),
        payment_method: method,
        payment_status: 'completed',
        number_of_guests: guestCount,
        created_at: new Date().toISOString(),
      };
      
      if (packageId) {
        paymentData.package_selected = packageId;
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
      } else if (paymentRecord && paymentRecord.length > 0) {
        console.log('[EventPaymentInvoiceModal] ✅ Payment history record created:', paymentRecord[0].id);
      } else {
        console.warn('[EventPaymentInvoiceModal] ⚠️ Payment history insert returned no data');
      }

      await onPaymentComplete(method);
      
      onClose();
      
      Alert.alert(
        'Payment Recorded',
        `${member.name} has been marked as paid via ${method === 'paypal' ? 'PayPal' : 'Zelle'}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[EventPaymentInvoiceModal] Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setIsSubmitting(false);
      setProcessingPackage(null);
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
              </View>
            </View>

            {/* Zelle Payment Box */}
            <View style={styles.zelleBox}>
              <View style={styles.paymentBoxHeader}>
                <View style={[styles.methodIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="phone-portrait" size={24} color="#6B21A8" />
                </View>
                <Text style={styles.paymentBoxTitle}>Zelle Payment</Text>
              </View>

              {availablePackages.length > 0 ? (
                <View style={styles.optionsContainer}>
                  {availablePackages.map((pkg, index) => {
                    const pkgTotal = pkg.price * totalPeople;
                    return (
                      <View key={pkg.id} style={styles.optionItem}>
                        <Text style={styles.optionLabel}>Option {index + 1}: {pkg.name}</Text>
                        <Text style={styles.optionPrice}>
                          ${pkg.price.toFixed(2)} × {totalPeople} = ${pkgTotal.toFixed(2)}
                        </Text>
                        {pkg.description && (
                          <Text style={styles.optionDescription}>{pkg.description}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.optionItem}>
                  <Text style={styles.optionPrice}>
                    Entry Fee: ${defaultEntryFee.toFixed(2)} × {totalPeople} = ${(defaultEntryFee * totalPeople).toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.zelleInfoBox}>
                <Text style={styles.zelleInfoTitle}>Zelle Payment Information</Text>
                {orgInfo.zellePhone && (
                  <Text style={styles.zelleInfoText}>Send to: {formatPhoneNumber(orgInfo.zellePhone)}</Text>
                )}
                {orgInfo.zelleName && (
                  <Text style={styles.zelleInfoText}>Name: {orgInfo.zelleName}</Text>
                )}
              </View>

              {availablePackages.length > 0 ? (
                <View style={styles.zelleButtonsContainer}>
                  {availablePackages.map((pkg, index) => {
                    const pkgTotal = pkg.price * totalPeople;
                    return (
                      <TouchableOpacity
                        key={pkg.id}
                        style={styles.zelleButton}
                        onPress={() => handlePayment('zelle', pkg.id)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting && processingPackage === pkg.id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.zelleButtonText}>
                            Mark Paid - Option {index + 1} (${pkgTotal.toFixed(2)})
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.zelleButton}
                  onPress={() => handlePayment('zelle')}
                  disabled={isSubmitting}
                >
                  {isSubmitting && processingPackage === null ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.zelleButtonText}>
                      Mark Paid via Zelle (${(defaultEntryFee * totalPeople).toFixed(2)})
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* PayPal Payment Box */}
            <View style={styles.paypalBox}>
              <View style={styles.paymentBoxHeader}>
                <View style={[styles.methodIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="logo-paypal" size={24} color="#0070BA" />
                </View>
                <Text style={styles.paymentBoxTitle}>PayPal Payment</Text>
              </View>

              {availablePackages.length > 0 ? (
                <View style={styles.optionsContainer}>
                  {availablePackages.map((pkg, index) => {
                    const pkgTotal = pkg.price * totalPeople;
                    const { serviceFee, total } = calculatePayPalTotal(pkgTotal);
                    return (
                      <View key={pkg.id} style={styles.paypalOptionItem}>
                        <Text style={styles.optionLabel}>Option {index + 1}: {pkg.name}</Text>
                        <Text style={styles.optionPrice}>
                          ${pkg.price.toFixed(2)} × {totalPeople} = ${pkgTotal.toFixed(2)}
                        </Text>
                        <Text style={styles.paypalFeeText}>
                          + PayPal Fee: ${serviceFee.toFixed(2)}
                        </Text>
                        <Text style={styles.paypalTotalText}>
                          Total: ${total.toFixed(2)}
                        </Text>
                        {pkg.description && (
                          <Text style={styles.optionDescription}>{pkg.description}</Text>
                        )}
                        <TouchableOpacity
                          style={styles.paypalButton}
                          onPress={() => handlePayment('paypal', pkg.id)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting && processingPackage === pkg.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name="logo-paypal" size={18} color="#fff" />
                              <Text style={styles.paypalButtonText}>
                                Pay ${total.toFixed(2)} with PayPal
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.paypalOptionItem}>
                  {(() => {
                    const baseTotal = defaultEntryFee * totalPeople;
                    const { serviceFee, total } = calculatePayPalTotal(baseTotal);
                    return (
                      <>
                        <Text style={styles.optionPrice}>
                          Entry Fee: ${defaultEntryFee.toFixed(2)} × {totalPeople} = ${baseTotal.toFixed(2)}
                        </Text>
                        <Text style={styles.paypalFeeText}>
                          + PayPal Fee: ${serviceFee.toFixed(2)}
                        </Text>
                        <Text style={styles.paypalTotalText}>
                          Total: ${total.toFixed(2)}
                        </Text>
                        <TouchableOpacity
                          style={styles.paypalButton}
                          onPress={() => handlePayment('paypal')}
                          disabled={isSubmitting}
                        >
                          {isSubmitting && processingPackage === null ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name="logo-paypal" size={18} color="#fff" />
                              <Text style={styles.paypalButtonText}>
                                Pay ${total.toFixed(2)} with PayPal
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </>
                    );
                  })()}
                </View>
              )}
            </View>

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
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zelleBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#6B21A8',
  },
  paypalBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#0070BA',
  },
  paymentBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  paymentBoxTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  optionsContainer: {
    gap: 12,
  },
  optionItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1B5E20',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    lineHeight: 18,
  },
  zelleInfoBox: {
    backgroundColor: '#E9D5FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  zelleInfoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#6B21A8',
    marginBottom: 6,
  },
  zelleInfoText: {
    fontSize: 14,
    color: '#581C87',
    fontWeight: '600' as const,
  },
  zelleButtonsContainer: {
    gap: 8,
  },
  zelleButton: {
    backgroundColor: '#6B21A8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zelleButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  paypalOptionItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  paypalFeeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  paypalTotalText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0070BA',
    marginTop: 4,
  },
  paypalButton: {
    flexDirection: 'row',
    backgroundColor: '#0070BA',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  paypalButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  specialNotesBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
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
