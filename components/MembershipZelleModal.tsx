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
import { Ionicons } from '@expo/vector-icons';
import { Member } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface MembershipZelleModalProps {
  visible: boolean;
  member: Member;
  membershipType: 'full' | 'basic' | null;
  onClose: () => void;
}

export function MembershipZelleModal({
  visible,
  member,
  membershipType,
  onClose,
}: MembershipZelleModalProps) {
  const { orgInfo } = useSettings();
  const { updateMember } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && member) {
      setEmail(member.email || '');
      setPhone(member.phone || '');
      setAgreeToTerms(false);
    }
  }, [visible, member]);

  if (!membershipType) return null;

  const amount = membershipType === 'full' 
    ? parseFloat(orgInfo.fullMembershipPrice || '0')
    : parseFloat(orgInfo.basicMembershipPrice || '0');
  const membershipName = membershipType === 'full' ? 'Full Membership' : 'Basic Membership';

  const hasRequiredInfo = () => {
    const hasEmail = email.trim().length > 0;
    const hasPhone = phone.trim().length > 0;
    return hasEmail && hasPhone;
  };

  const canProceed = () => {
    return hasRequiredInfo() && agreeToTerms && !isSubmitting;
  };

  const handleProceed = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    try {
      await updateMember(member.id, {
        email: email.trim(),
        phone: phone.trim(),
        membershipType: 'active',
      });

      await supabase.from('membership_payments').insert({
        member_id: member.id,
        member_name: member.name,
        membership_type: membershipType,
        amount: amount.toString(),
        payment_method: 'zelle',
        payment_status: 'pending',
        email: email.trim(),
        phone: phone.trim(),
      });

      const zelleNumber = formatPhoneNumber(orgInfo.zellePhone || '5714811006');
      const formattedUserPhone = formatPhoneNumber(phone.trim());
      
      Alert.alert(
        'Membership Renewal Submitted',
        `Thank you for renewing your membership! Please make your Zelle payment of $${amount.toFixed(2)} to ${zelleNumber}.\n\nAn invoice has been sent to ${email.trim()} and SMS to ${formattedUserPhone}.`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error during membership renewal:', error);
      Alert.alert('Error', 'Failed to process membership renewal. Please try again.');
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
            <Text style={styles.headerTitle}>Membership Invoice</Text>
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
                <Ionicons name="document-text" size={32} color="#4CAF50" />
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
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalAmount}>${amount.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.paymentInstructions}>
                <Text style={styles.instructionsTitle}>Payment Instructions</Text>
                <Text style={styles.instructionsText}>
                  Please send your payment via Zelle to:
                </Text>
                <View style={styles.zelleInfoBox}>
                  <Ionicons name="cash-outline" size={24} color="#6B21A8" />
                  <Text style={styles.zelleNumber}>
                    {formatPhoneNumber(orgInfo.zellePhone || '5714811006')}
                  </Text>
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
                    I agree to make the payment and renew my membership
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.proceedButton,
                  !canProceed() && styles.proceedButtonDisabled,
                ]}
                onPress={handleProceed}
                disabled={!canProceed()}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.proceedButtonText}>CONFIRM RENEWAL</Text>
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
    color: '#4CAF50',
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#4CAF50',
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
  zelleInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    padding: 16,
    borderRadius: 8,
    gap: 12,
    borderWidth: 2,
    borderColor: '#6B21A8',
  },
  zelleNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#6B21A8',
    letterSpacing: 1,
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
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
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
  proceedButton: {
    backgroundColor: '#4CAF50',
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
  proceedButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedButtonText: {
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
