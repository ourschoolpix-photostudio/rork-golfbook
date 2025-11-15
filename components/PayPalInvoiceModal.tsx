import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Member, Event } from '@/types';
import { TournamentTermsModal } from './TournamentTermsModal';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { trpc } from '@/lib/trpc';

interface PayPalInvoiceModalProps {
  visible: boolean;
  event: Event | null;
  currentUser: Member | null;
  onClose: () => void;
  onRegister: (ghin: string, email: string, phone: string) => Promise<void>;
}

export function PayPalInvoiceModal({
  visible,
  event,
  currentUser,
  onClose,
  onRegister,
}: PayPalInvoiceModalProps) {
  const [ghin, setGhin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const createPaymentMutation = trpc.registrations.paypal.createPayment.useMutation();
  const capturePaymentMutation = trpc.registrations.paypal.capturePayment.useMutation();

  useEffect(() => {
    if (visible && currentUser) {
      setGhin(currentUser.ghin || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setAgreeToTerms(false);
    }
  }, [visible, currentUser]);

  if (!event || !currentUser) return null;

  const getPaymentDeadline = () => {
    if (!event.date) return 'N/A';
    
    const eventDate = new Date(event.date);
    const deadlineDate = new Date(eventDate);
    deadlineDate.setDate(deadlineDate.getDate() - 10);
    
    return deadlineDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const hasRequiredInfo = () => {
    const hasGhin = ghin.trim().length > 0;
    const hasEmail = email.trim().length > 0;
    const hasPhone = phone.trim().length > 0;
    return hasGhin && hasEmail && hasPhone;
  };

  const canRegister = () => {
    return hasRequiredInfo() && agreeToTerms && !isSubmitting;
  };

  const handlePayPalPayment = async () => {
    if (!canRegister() || !event) return;

    Alert.alert(
      'Confirm Payment Method',
      `You are about to pay ${event.entryFee} using PayPal.\n\nYou will be redirected to PayPal to complete your secure payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              console.log('[PayPal] Creating payment order...');
              const paymentResult = await createPaymentMutation.mutateAsync({
                amount: Number(event.entryFee),
                eventName: event.name,
                eventId: event.id,
                playerEmail: email.trim(),
              });

      console.log('[PayPal] Payment order created:', paymentResult.orderId);
      console.log('[PayPal] Full payment result:', JSON.stringify(paymentResult, null, 2));

      if (paymentResult.approvalUrl) {
        console.log('[PayPal] Opening approval URL:', paymentResult.approvalUrl);
        
        const result = await WebBrowser.openAuthSessionAsync(
          paymentResult.approvalUrl,
          'https://api.j382mhvmbvtqiifrytg5g.rork.app'
        );

        console.log('[PayPal] WebBrowser result type:', result.type);
        console.log('[PayPal] WebBrowser result:', JSON.stringify(result, null, 2));

        if (result.type === 'success') {
          const url = result.url;
          console.log('[PayPal] Success URL:', url);
          
          const urlParts = url.split('?');
          if (urlParts.length < 2) {
            throw new Error('Invalid PayPal callback URL - no query parameters');
          }
          
          const urlParams = new URLSearchParams(urlParts[1]);
          const token = urlParams.get('token');
          const payerId = urlParams.get('PayerID');
          
          console.log('[PayPal] Extracted token:', token);
          console.log('[PayPal] Extracted PayerID:', payerId);

          if (token) {
            console.log('[PayPal] Capturing payment...');
            const captureResult = await capturePaymentMutation.mutateAsync({
              orderId: token,
            });

            console.log('[PayPal] Payment captured:', JSON.stringify(captureResult, null, 2));

            if (captureResult.success) {
              await onRegister(ghin.trim(), email.trim(), phone.trim());
              
              setGhin('');
              setEmail('');
              setPhone('');
              setAgreeToTerms(false);
              
              Alert.alert(
                'Payment Successful',
                `Your payment of ${event.entryFee} has been processed successfully! You are now registered for ${event.name}.`,
                [{ text: 'OK', onPress: onClose }]
              );
            } else {
              throw new Error('Payment capture failed');
            }
          } else {
            throw new Error('No payment token received from PayPal callback');
          }
        } else if (result.type === 'cancel') {
          console.log('[PayPal] User cancelled payment');
          Alert.alert('Payment Cancelled', 'You cancelled the payment process.');
        } else if (result.type === 'dismiss') {
          console.log('[PayPal] User dismissed payment');
          Alert.alert('Payment Dismissed', 'You dismissed the payment process.');
        }
      } else {
        throw new Error('No approval URL received from PayPal');
      }
              } catch (error: any) {
                console.error('[PayPal] Error during payment:', error);
                console.error('[PayPal] Error stack:', error?.stack);
                console.error('[PayPal] Error message:', error?.message);
                
                let errorMessage = 'Failed to process PayPal payment. Please try again or contact support.';
                
                if (error?.message) {
                  if (error.message.includes('credentials')) {
                    errorMessage = 'PayPal configuration error. Please contact support.';
                  } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = 'Network error. Please check your connection and try again.';
                  } else {
                    errorMessage = `Payment failed: ${error.message}`;
                  }
                }
                
                Alert.alert(
                  'Payment Error',
                  errorMessage
                );
              } finally {
                setIsSubmitting(false);
              }
            },
          },
        ]
      );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>PayPal Registration</Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <Ionicons name="card" size={32} color="#0070BA" />
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
                  <Text style={styles.detailLabel}>Venue:</Text>
                  <Text style={styles.detailValue}>{event.venue || event.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{event.date}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.invoiceSection}>
                <Text style={styles.sectionTitle}>Payment Information</Text>
                <View style={styles.entryFeeRow}>
                  <Text style={styles.entryFeeLabel}>Entry Fee:</Text>
                  <Text style={styles.entryFeeAmount}>${event.entryFee}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.paymentInstructions}>
                <Text style={styles.instructionsTitle}>Payment Instructions</Text>
                <Text style={styles.instructionsText}>
                  You will be redirected to PayPal to complete your payment securely.
                </Text>
                <View style={styles.paypalInfoBox}>
                  <Ionicons name="logo-paypal" size={32} color="#0070BA" />
                  <Text style={styles.paypalText}>Secure Payment via PayPal</Text>
                </View>
                <View style={styles.deadlineBox}>
                  <Ionicons name="time-outline" size={20} color="#DC2626" />
                  <Text style={styles.deadlineText}>
                    Payment must be completed by {getPaymentDeadline()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Complete Your Registration</Text>
              <Text style={styles.formSubtitle}>
                Please provide the following information before proceeding to PayPal
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  GHIN# <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    !currentUser.ghin && styles.inputRequired,
                  ]}
                  value={ghin}
                  onChangeText={setGhin}
                  placeholder="Enter your GHIN number"
                  keyboardType="default"
                  autoCapitalize="none"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Email Address <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    !currentUser.email && styles.inputRequired,
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Phone Number <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    !currentUser.phone && styles.inputRequired,
                  ]}
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.termsWrapper}>
                <TouchableOpacity
                  style={styles.termsContainer}
                  onPress={() => setAgreeToTerms(!agreeToTerms)}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                    {agreeToTerms && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowTermsModal(true);
                      }}
                    >
                      terms and conditions
                    </Text>
                    {' '}and will complete payment via PayPal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.paypalButton,
                  !canRegister() && styles.paypalButtonDisabled,
                ]}
                onPress={handlePayPalPayment}
                disabled={!canRegister()}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-paypal" size={24} color="#fff" />
                    <Text style={styles.paypalButtonText}>PAY WITH PAYPAL</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
      
      <TournamentTermsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
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
    paddingBottom: 300,
  },
  invoiceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
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
    color: '#0070BA',
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
  entryFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0070BA',
  },
  entryFeeLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  entryFeeAmount: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0070BA',
  },
  paymentInstructions: {
    gap: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  paypalInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F4FC',
    padding: 16,
    borderRadius: 8,
    gap: 12,
    borderWidth: 2,
    borderColor: '#0070BA',
  },
  paypalText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0070BA',
  },
  deadlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  deadlineText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#DC2626',
    flex: 1,
  },
  formSection: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#DC2626',
    fontSize: 14,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  inputRequired: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  termsWrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#0070BA',
    borderColor: '#0070BA',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  termsLink: {
    color: '#0070BA',
    fontWeight: '600' as const,
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  paypalButton: {
    backgroundColor: '#0070BA',
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
  paypalButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  paypalButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 1,
  },
});
