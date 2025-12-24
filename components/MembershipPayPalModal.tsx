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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Member } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { createPayPalOrder } from '@/utils/paypalService';

interface MembershipPayPalModalProps {
  visible: boolean;
  member: Member;
  membershipType: 'full' | 'basic' | null;
  onClose: () => void;
}

export function MembershipPayPalModal({
  visible,
  member,
  membershipType,
  onClose,
}: MembershipPayPalModalProps) {
  const { orgInfo } = useSettings();
  const { updateMember } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [paypalConfig, setPaypalConfig] = useState<{
    clientId: string;
    clientSecret: string;
    mode: 'sandbox' | 'live';
  } | null>(null);

  useEffect(() => {
    const fetchPayPalConfig = async () => {
      try {
        console.log('[MembershipPayPalModal] Fetching PayPal config from database...');
        const { data, error } = await supabase
          .from('organization_settings')
          .select('paypal_client_id, paypal_client_secret, paypal_mode')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single();

        if (error) {
          console.error('[MembershipPayPalModal] Error fetching PayPal config:', error);
          return;
        }

        if (data) {
          setPaypalConfig({
            clientId: data.paypal_client_id || '',
            clientSecret: data.paypal_client_secret || '',
            mode: (data.paypal_mode || 'sandbox') as 'sandbox' | 'live',
          });
          console.log('[MembershipPayPalModal] PayPal config loaded successfully');
        }
      } catch (error) {
        console.error('[MembershipPayPalModal] Failed to fetch PayPal config:', error);
      }
    };

    fetchPayPalConfig();
  }, []);

  useEffect(() => {
    if (visible && member) {
      setEmail(member.email || '');
      setPhone(member.phone || '');
      setAgreeToTerms(false);
    }
  }, [visible, member?.id, member]);

  if (!membershipType) return null;

  const serviceFeePercentage = 0.05;
  const baseAmount = membershipType === 'full' 
    ? parseFloat(orgInfo.fullMembershipPrice || '0')
    : parseFloat(orgInfo.basicMembershipPrice || '0');
  const serviceFeeAmount = baseAmount * serviceFeePercentage;
  const totalAmount = baseAmount + serviceFeeAmount;
  const membershipName = membershipType === 'full' ? 'Full Membership' : 'Basic Membership';

  const hasRequiredInfo = () => {
    const hasEmail = email.trim().length > 0;
    const hasPhone = phone.trim().length > 0;
    return hasEmail && hasPhone;
  };

  const canProceed = () => {
    return hasRequiredInfo() && agreeToTerms && !isSubmitting;
  };

  const handlePayPalPayment = async () => {
    if (!canProceed()) return;

    console.log('[MembershipPayPalModal] Starting PayPal payment...');

    if (!paypalConfig) {
      Alert.alert(
        'PayPal Configuration Missing',
        'PayPal credentials are not configured. Please contact an administrator.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!paypalConfig.clientId || !paypalConfig.clientSecret) {
      Alert.alert(
        'PayPal Configuration Incomplete',
        'PayPal credentials are incomplete. Please ask an administrator to configure PayPal in Admin Settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[MembershipPayPalModal] Creating PayPal order...');
      
      const paymentResponse = await createPayPalOrder({
        amount: totalAmount,
        eventName: `${membershipName} - ${member.name}`,
        eventId: 'membership',
        playerEmail: email.trim(),
        paypalClientId: paypalConfig.clientId,
        paypalClientSecret: paypalConfig.clientSecret,
        paypalMode: paypalConfig.mode,
      });
      
      console.log('[MembershipPayPalModal] Payment order created:', paymentResponse);

      if (!paymentResponse.approvalUrl) {
        throw new Error('No approval URL received from PayPal');
      }

      console.log('[MembershipPayPalModal] Inserting membership payment record...');
      
      await supabase.from('membership_payments').insert({
        member_id: member.id,
        member_name: member.name,
        membership_type: membershipType,
        amount: totalAmount.toString(),
        payment_method: 'paypal',
        payment_status: 'pending',
        email: email.trim(),
        phone: phone.trim(),
        paypal_order_id: paymentResponse.orderId,
      });

      await updateMember(member.id, {
        email: email.trim(),
        phone: phone.trim(),
      });
      
      console.log('[MembershipPayPalModal] Opening PayPal in system browser...');
      
      const canOpen = await Linking.canOpenURL(paymentResponse.approvalUrl);
      if (!canOpen) {
        throw new Error('Cannot open PayPal URL');
      }

      await Linking.openURL(paymentResponse.approvalUrl);
      console.log('[MembershipPayPalModal] PayPal URL opened successfully');
      
      onClose();
      
      Alert.alert(
        'PayPal Payment',
        'You will be redirected to PayPal to complete your payment. After payment, your membership will be activated.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[MembershipPayPalModal] PayPal payment error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      Alert.alert(
        'PayPal Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
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
            <Text style={styles.headerTitle}>PayPal Membership Payment</Text>
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
                <Text style={styles.sectionTitle}>Membership Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Member:</Text>
                  <Text style={styles.detailValue}>{member.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plan:</Text>
                  <Text style={styles.detailValue}>{membershipName}</Text>
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Contact Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Email Address <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    !member.email && styles.inputRequired,
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
                    !member.phone && styles.inputRequired,
                  ]}
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <View style={styles.paymentCard}>
              <View style={styles.invoiceSection}>
                <Text style={styles.sectionTitle}>Payment Information</Text>
                <View style={styles.feeBreakdown}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Membership Fee:</Text>
                    <Text style={styles.feeValue}>${baseAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Service Fee (5%):</Text>
                    <Text style={styles.feeValue}>${serviceFeeAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.dividerThin} />
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>${totalAmount.toFixed(2)}</Text>
                  </View>
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
              </View>
            </View>

            <View style={styles.termsSection}>
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
                    I agree to complete payment via PayPal and renew my membership
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.paypalButton,
                  !canProceed() && styles.paypalButtonDisabled,
                ]}
                onPress={handlePayPalPayment}
                disabled={!canProceed()}
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
  feeBreakdown: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0070BA',
    gap: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#666',
  },
  feeValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#D0D0D0',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  totalAmount: {
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
  formSection: {
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 16,
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
  paymentCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  termsSection: {
    marginBottom: 20,
  },
});
