import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { MembershipZelleModal } from './MembershipZelleModal';
import { MembershipPayPalModal } from './MembershipPayPalModal';

interface MembershipRenewalModalProps {
  visible: boolean;
  member: Member;
  onClose: () => void;
}

type MembershipType = 'full' | 'basic' | null;
type PaymentMethod = 'zelle' | 'paypal' | null;

export function MembershipRenewalModal({
  visible,
  member,
  onClose,
}: MembershipRenewalModalProps) {
  const { orgInfo } = useSettings();
  const [selectedMembership, setSelectedMembership] = useState<MembershipType>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);
  const [showZelleModal, setShowZelleModal] = useState(false);
  const [showPayPalModal, setShowPayPalModal] = useState(false);

  const fullPrice = parseFloat(orgInfo.fullMembershipPrice || '0');
  const basicPrice = parseFloat(orgInfo.basicMembershipPrice || '0');

  const handleClose = () => {
    setSelectedMembership(null);
    setSelectedPayment(null);
    onClose();
  };

  const handleMembershipSelect = (type: MembershipType) => {
    setSelectedMembership(type);
    setSelectedPayment(null);
  };

  const handlePaymentSelect = (method: PaymentMethod) => {
    setSelectedPayment(method);
    if (method === 'zelle') {
      setShowZelleModal(true);
    } else if (method === 'paypal') {
      setShowPayPalModal(true);
    }
  };

  const handleBack = () => {
    if (selectedPayment) {
      setSelectedPayment(null);
    } else if (selectedMembership) {
      setSelectedMembership(null);
    } else {
      handleClose();
    }
  };

  const renderMembershipSelection = () => (
    <ScrollView 
      style={styles.scrollContent} 
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Renew Your Membership</Text>
        <Text style={styles.subtitle}>
          Choose the membership level that&apos;s right for you
        </Text>

        <View style={styles.membershipOptions}>
          <TouchableOpacity
            style={[
              styles.membershipCard,
              selectedMembership === 'full' && styles.membershipCardSelected,
            ]}
            onPress={() => handleMembershipSelect('full')}
            activeOpacity={0.7}
          >
            <View style={styles.membershipHeader}>
              <Ionicons name="star" size={32} color="#FFD700" />
              <Text style={styles.membershipTitle}>Full Membership</Text>
            </View>
            <Text style={styles.membershipPrice}>${fullPrice.toFixed(2)}</Text>
            {orgInfo.fullMembershipMemo && (
              <View style={styles.membershipBenefits}>
                {orgInfo.fullMembershipMemo.split('\n').filter(line => line.trim()).map((benefit, index) => (
                  <View key={index} style={styles.benefitRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.benefitText}>{benefit.replace(/^[•\-\*]\s*/, '')}</Text>
                  </View>
                ))}
              </View>
            )}
            {selectedMembership === 'full' && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.selectedText}>Selected</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.membershipCard,
              selectedMembership === 'basic' && styles.membershipCardSelected,
            ]}
            onPress={() => handleMembershipSelect('basic')}
            activeOpacity={0.7}
          >
            <View style={styles.membershipHeader}>
              <Ionicons name="shield" size={32} color="#007AFF" />
              <Text style={styles.membershipTitle}>Basic Membership</Text>
            </View>
            <Text style={styles.membershipPrice}>${basicPrice.toFixed(2)}</Text>
            {orgInfo.basicMembershipMemo && (
              <View style={styles.membershipBenefits}>
                {orgInfo.basicMembershipMemo.split('\n').filter(line => line.trim()).map((benefit, index) => (
                  <View key={index} style={styles.benefitRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.benefitText}>{benefit.replace(/^[•\-\*]\s*/, '')}</Text>
                  </View>
                ))}
              </View>
            )}
            {selectedMembership === 'basic' && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.selectedText}>Selected</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {selectedMembership && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => setSelectedPayment(null)}
          >
            <Text style={styles.continueButtonText}>Continue to Payment</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  const renderPaymentSelection = () => {
    const selectedPrice = selectedMembership === 'full' ? fullPrice : basicPrice;
    const membershipName = selectedMembership === 'full' ? 'Full Membership' : 'Basic Membership';

    return (
      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.contentContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Membership Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Plan:</Text>
              <Text style={styles.summaryValue}>{membershipName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={styles.summaryPrice}>${selectedPrice.toFixed(2)}</Text>
            </View>
          </View>

          <Text style={styles.paymentTitle}>Select Payment Method</Text>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedPayment === 'zelle' && styles.paymentOptionSelected,
            ]}
            onPress={() => handlePaymentSelect('zelle')}
            activeOpacity={0.7}
          >
            <View style={styles.paymentOptionContent}>
              <View style={styles.paymentIconContainer}>
                <Ionicons name="cash-outline" size={32} color="#6B21A8" />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>Zelle</Text>
                <Text style={styles.paymentDescription}>Pay via Zelle</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedPayment === 'paypal' && styles.paymentOptionSelected,
            ]}
            onPress={() => handlePaymentSelect('paypal')}
            activeOpacity={0.7}
          >
            <View style={styles.paymentOptionContent}>
              <View style={styles.paymentIconContainer}>
                <Ionicons name="logo-paypal" size={32} color="#0070BA" />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>PayPal</Text>
                <Text style={styles.paymentDescription}>Pay via PayPal (+5% fee)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={styles.modal}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {!selectedMembership ? 'Membership Options' : 'Payment Method'}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {!selectedMembership || selectedPayment === null
                ? (!selectedMembership ? renderMembershipSelection() : renderPaymentSelection())
                : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <MembershipZelleModal
        visible={showZelleModal}
        member={member}
        membershipType={selectedMembership}
        onClose={() => {
          setShowZelleModal(false);
          handleClose();
        }}
      />

      <MembershipPayPalModal
        visible={showPayPalModal}
        member={member}
        membershipType={selectedMembership}
        onClose={() => {
          setShowPayPalModal(false);
          handleClose();
        }}
      />
    </>
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
    height: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  content: {
    flex: 1,
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
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  membershipOptions: {
    gap: 16,
  },
  membershipCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative' as const,
  },
  membershipCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0F8F0',
  },
  membershipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  membershipTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  membershipPrice: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#4CAF50',
    marginBottom: 16,
  },
  membershipBenefits: {
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  selectedBadge: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600' as const,
  },
  summaryValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600' as const,
  },
  summaryPrice: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#4CAF50',
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  paymentOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0F8F0',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  paymentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    gap: 4,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  paymentDescription: {
    fontSize: 13,
    color: '#666',
  },
});
