import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '@/utils/alertPolyfill';
import { Ionicons } from '@expo/vector-icons';
import { Member, Event } from '@/types';
import { TournamentTermsModal } from './TournamentTermsModal';
import { useSettings } from '@/contexts/SettingsContext';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { formatDateAsFullDay } from '@/utils/dateUtils';

interface ZelleInvoiceModalProps {
  visible: boolean;
  event: Event | null;
  currentUser: Member | null;
  onClose: () => void;
  onRegister: (ghin: string, email: string, phone: string, numberOfGuests?: number, guestNames?: string) => Promise<void>;
}

export function ZelleInvoiceModal({
  visible,
  event,
  currentUser,
  onClose,
  onRegister,
}: ZelleInvoiceModalProps) {
  const { orgInfo } = useSettings();
  const [ghin, setGhin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [numberOfGuests, setNumberOfGuests] = useState('');
  const [guestNames, setGuestNames] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<1 | 2 | 3 | null>(null);

  useEffect(() => {
    if (visible && currentUser) {
      setGhin(currentUser.ghin || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setAgreeToTerms(false);
      setNumberOfGuests('');
      setGuestNames('');
      setSelectedPackage(null);
    }
  }, [visible, currentUser?.id]);

  if (!event || !currentUser) return null;

  const isSocialEvent = event.type === 'social';
  const guestCount = parseInt(numberOfGuests, 10) || 0;
  const totalPeople = 1 + guestCount;
  
  const getPackagePrice = () => {
    if (selectedPackage === 1 && event.package1Price) return Number(event.package1Price);
    if (selectedPackage === 2 && event.package2Price) return Number(event.package2Price);
    if (selectedPackage === 3 && event.package3Price) return Number(event.package3Price);
    return Number(event.entryFee || 0);
  };
  
  const entryFeeAmount = getPackagePrice();
  const totalAmount = entryFeeAmount * totalPeople;
  
  const availablePackages = [
    event.package1Name && event.package1Price ? { id: 1 as const, name: event.package1Name, price: event.package1Price, description: event.package1Description } : null,
    event.package2Name && event.package2Price ? { id: 2 as const, name: event.package2Name, price: event.package2Price, description: event.package2Description } : null,
    event.package3Name && event.package3Price ? { id: 3 as const, name: event.package3Name, price: event.package3Price, description: event.package3Description } : null,
  ].filter(Boolean) as { id: 1 | 2 | 3; name: string; price: string; description?: string }[];

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
    const hasPackageSelection = availablePackages.length === 0 || selectedPackage !== null;
    return hasRequiredInfo() && agreeToTerms && hasPackageSelection && !isSubmitting;
  };

  const handleRegister = async () => {
    if (!canRegister()) return;

    setIsSubmitting(true);
    try {
      await onRegister(ghin.trim(), email.trim(), phone.trim(), guestCount > 0 ? guestCount : undefined, guestNames.trim() || undefined);
      
      setGhin('');
      setEmail('');
      setPhone('');
      setAgreeToTerms(false);
      setNumberOfGuests('');
      setGuestNames('');
      setSelectedPackage(null);
      
      const zelleNumber = formatPhoneNumber(orgInfo.zellePhone || '5714811006');
      const formattedUserPhone = formatPhoneNumber(phone.trim());
      Alert.alert(
        'Registration Submitted',
        `Thank you for registering! Please make your Zelle payment of $${totalAmount.toFixed(2)} to ${zelleNumber} by ${getPaymentDeadline()} to confirm your spot.\n\nAn invoice has been sent to ${email.trim()} and SMS to ${formattedUserPhone}.`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error during registration:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Registration Invoice</Text>
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
                <Ionicons name="document-text" size={32} color="#1B5E20" />
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
                  <Text style={styles.detailValue}>{formatDateAsFullDay(event.date, event.numberOfDays, 1)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Complete Your Registration</Text>
              <Text style={styles.formSubtitle}>
                Please provide the following information to complete your registration
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

              {isSocialEvent && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Number of Guests
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={numberOfGuests}
                      onChangeText={setNumberOfGuests}
                      placeholder="0"
                      keyboardType="number-pad"
                      editable={!isSubmitting}
                    />
                  </View>

                  {guestCount > 0 && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Guest Name{guestCount > 1 ? 's' : ''}
                      </Text>
                      <TextInput
                        style={[styles.textInput, styles.textInputMultiline]}
                        value={guestNames}
                        onChangeText={setGuestNames}
                        placeholder={guestCount > 1 ? "Enter guest names (one per line)" : "Enter guest name"}
                        multiline
                        numberOfLines={Math.min(guestCount, 4)}
                        editable={!isSubmitting}
                      />
                    </View>
                  )}
                </>
              )}
            </View>

            {availablePackages.length > 0 && (
              <View style={styles.packageSection}>
                <Text style={styles.packageTitle}>Select Your Package</Text>
                <Text style={styles.packageSubtitle}>Choose one of the following options</Text>
                
                {availablePackages.map((pkg) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.packageCard,
                      selectedPackage === pkg.id && styles.packageCardSelected,
                    ]}
                    onPress={() => setSelectedPackage(pkg.id)}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <View style={styles.packageHeader}>
                      <View style={styles.packageTitleRow}>
                        <Text style={[
                          styles.packageName,
                          selectedPackage === pkg.id && styles.packageNameSelected,
                        ]}>
                          {pkg.name}
                        </Text>
                        <Text style={[
                          styles.packagePrice,
                          selectedPackage === pkg.id && styles.packagePriceSelected,
                        ]}>
                          ${Number(pkg.price).toFixed(2)}
                        </Text>
                      </View>
                      {pkg.description && (
                        <Text style={[
                          styles.packageDescription,
                          selectedPackage === pkg.id && styles.packageDescriptionSelected,
                        ]}>
                          {pkg.description}
                        </Text>
                      )}
                    </View>
                    <View style={[
                      styles.packageCheckbox,
                      selectedPackage === pkg.id && styles.packageCheckboxSelected,
                    ]}>
                      {selectedPackage === pkg.id && (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                
                {event.specialNotes && event.specialNotes.trim() && (
                  <View style={styles.specialNotesBox}>
                    <Text style={styles.specialNotesTitle}>Special Notes</Text>
                    <Text style={styles.specialNotesText}>{event.specialNotes}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.paymentCard}>
              <View style={styles.invoiceSection}>
                <Text style={styles.sectionTitle}>Payment Information</Text>
                <View style={styles.entryFeeRow}>
                  <View>
                    <Text style={styles.entryFeeLabel}>Entry Fee ({totalPeople} {totalPeople === 1 ? 'person' : 'people'}):</Text>
                    {guestCount > 0 && (
                      <Text style={styles.feeBreakdownDetail}>
                        {currentUser.name} + {guestCount} guest{guestCount !== 1 ? 's' : ''} × ${entryFeeAmount.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.entryFeeAmount}>${totalAmount.toFixed(2)}</Text>
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
                  <Text style={styles.zelleNumber}>{formatPhoneNumber(orgInfo.zellePhone || '5714811006')}</Text>
                </View>
                <View style={styles.deadlineBox}>
                  <Ionicons name="time-outline" size={20} color="#DC2626" />
                  <Text style={styles.deadlineText}>
                    Payment must be received by {getPaymentDeadline()}
                  </Text>
                </View>
                <Text style={styles.warningText}>
                  Your name will be removed if payment is not received by the deadline to make room for anyone on the waiting list.
                </Text>
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
                    {' '}and commit to paying the entry fee by the deadline
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  !canRegister() && styles.registerButtonDisabled,
                ]}
                onPress={handleRegister}
                disabled={!canRegister()}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.registerButtonText}>REGISTER</Text>
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
  entryFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1B5E20',
  },
  entryFeeLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  entryFeeAmount: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1B5E20',
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
  warningText: {
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 18,
    fontStyle: 'italic' as const,
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
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  termsLink: {
    color: '#1B5E20',
    fontWeight: '600' as const,
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: '#1B5E20',
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
  registerButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 1,
  },
  feeBreakdownDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
    paddingTop: 12,
  },
  packageSection: {
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  packageSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageCardSelected: {
    borderColor: '#1B5E20',
    backgroundColor: '#F1F8E9',
  },
  packageHeader: {
    flex: 1,
  },
  packageTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
    flex: 1,
  },
  packageNameSelected: {
    color: '#1B5E20',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  packagePriceSelected: {
    color: '#1B5E20',
  },
  packageDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 4,
  },
  packageDescriptionSelected: {
    color: '#1B5E20',
  },
  packageCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginLeft: 12,
  },
  packageCheckboxSelected: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
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
  specialNotesBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  specialNotesTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 8,
  },
  specialNotesText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
});
