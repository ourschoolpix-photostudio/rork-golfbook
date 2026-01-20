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
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Member, Event } from '@/types';
import { TournamentTermsModal } from './TournamentTermsModal';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { formatDateAsFullDay } from '@/utils/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { createPayPalOrder } from '@/utils/paypalService';

interface PayPalInvoiceModalProps {
  visible: boolean;
  event: Event | null;
  currentUser: Member | null;
  onClose: () => void;
  onRegister: (ghin: string, email: string, phone: string, numberOfGuests?: number, guestNames?: string, paymentStatus?: 'paid' | 'pending') => Promise<void>;
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
  const [numberOfGuests, setNumberOfGuests] = useState('');
  const [guestNames, setGuestNames] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<1 | 2 | 3 | null>(null);

  const [paypalConfig, setPaypalConfig] = useState<{
    clientId: string;
    clientSecret: string;
    mode: 'sandbox' | 'live';
  } | null>(null);

  useEffect(() => {
    const fetchPayPalConfig = async () => {
      try {
        console.log('[PayPalInvoiceModal] Fetching PayPal config from database...');
        const { data, error } = await supabase
          .from('organization_settings')
          .select('paypal_client_id, paypal_client_secret, paypal_mode')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single();

        if (error) {
          console.error('[PayPalInvoiceModal] Error fetching PayPal config:', error);
          return;
        }

        if (data) {
          setPaypalConfig({
            clientId: data.paypal_client_id || '',
            clientSecret: data.paypal_client_secret || '',
            mode: (data.paypal_mode || 'sandbox') as 'sandbox' | 'live',
          });
          console.log('[PayPalInvoiceModal] PayPal config loaded successfully');
        }
      } catch (error) {
        console.error('[PayPalInvoiceModal] Failed to fetch PayPal config:', error);
      }
    };

    fetchPayPalConfig();
  }, []);

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
  }, [visible, currentUser]);

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
  
  const serviceFeePercentage = 0.03;
  const serviceFeeFixed = 0.30;
  const entryFeeAmount = getPackagePrice();
  const subtotal = entryFeeAmount * totalPeople;
  const serviceFeeAmount = (subtotal * serviceFeePercentage) + serviceFeeFixed;
  const totalAmount = subtotal + serviceFeeAmount;
  
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

  const handlePayPalPayment = async () => {
    if (!canRegister() || !event) return;

    console.log('[PayPalInvoiceModal] 🔍 Starting PayPal payment...');
    console.log('[PayPalInvoiceModal] ✅ Using direct PayPal service (not tRPC)');
    console.log('[PayPalInvoiceModal] Event:', event.name);
    console.log('[PayPalInvoiceModal] Total amount:', totalAmount.toFixed(2));

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
      console.log('[PayPalInvoiceModal] 🚀 Creating PayPal order via direct service...');
      console.log('[PayPalInvoiceModal] PayPal config:', {
        hasClientId: !!paypalConfig.clientId,
        hasClientSecret: !!paypalConfig.clientSecret,
        mode: paypalConfig.mode,
      });
      
      const paymentResponse = await createPayPalOrder({
        amount: totalAmount,
        eventName: event.name,
        eventId: event.id,
        playerEmail: email.trim(),
        paypalClientId: paypalConfig.clientId,
        paypalClientSecret: paypalConfig.clientSecret,
        paypalMode: paypalConfig.mode,
      });
      
      console.log('[PayPalInvoiceModal] ✅ Successfully created order without tRPC');

      console.log('[PayPalInvoiceModal] ✅ Payment order created:', paymentResponse);
      console.log('[PayPalInvoiceModal] Order ID:', paymentResponse.orderId);
      console.log('[PayPalInvoiceModal] Approval URL:', paymentResponse.approvalUrl);

      if (!paymentResponse.approvalUrl) {
        throw new Error('No approval URL received from PayPal');
      }

      console.log('[PayPalInvoiceModal] 🌐 Opening PayPal approval URL...');
      
      console.log('[PayPalInvoiceModal] Registering user with payment status pending...');
      await onRegister(
        ghin.trim(),
        email.trim(),
        phone.trim(),
        isSocialEvent ? guestCount : undefined,
        isSocialEvent && guestCount > 0 ? guestNames : undefined,
        'pending'
      );
      
      const result = await WebBrowser.openAuthSessionAsync(
        paymentResponse.approvalUrl,
        Platform.OS === 'web' ? `${typeof window !== 'undefined' ? window.location.origin : ''}/paypal/success` : 'rork-app://paypal/success'
      );
      
      console.log('[PayPalInvoiceModal] WebBrowser result:', result);
      
      if (result.type === 'success' && result.url) {
        console.log('[PayPalInvoiceModal] Payment completed, URL:', result.url);
        
        const url = new URL(result.url);
        const token = url.searchParams.get('token') || url.searchParams.get('PayerID');
        
        if (token) {
          console.log('[PayPalInvoiceModal] Processing payment completion...');
          setIsSubmitting(true);
          
          try {
            const { data: paypalConfig } = await supabase
              .from('organization_settings')
              .select('paypal_client_id, paypal_client_secret, paypal_mode')
              .eq('id', '00000000-0000-0000-0000-000000000001')
              .single();

            if (!paypalConfig) {
              throw new Error('Failed to load PayPal configuration');
            }

            const mode = (paypalConfig.paypal_mode || 'sandbox') as 'sandbox' | 'live';
            const baseUrl = mode === 'live' 
              ? 'https://api-m.paypal.com' 
              : 'https://api-m.sandbox.paypal.com';

            const authString = `${paypalConfig.paypal_client_id}:${paypalConfig.paypal_client_secret}`;
            const auth = btoa(authString);

            const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${auth}`,
              },
              body: 'grant_type=client_credentials',
            });

            if (!tokenResponse.ok) {
              throw new Error('Failed to get PayPal access token');
            }

            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${token}/capture`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (!captureResponse.ok) {
              throw new Error('Failed to capture payment');
            }

            const captureData = await captureResponse.json();
            console.log('[PayPalInvoiceModal] Payment captured:', captureData);

            await supabase
              .from('event_registrations')
              .update({ 
                paymentStatus: 'paid',
                paypalCaptureId: captureData.id,
              })
              .eq('paypalOrderId', paymentResponse.orderId);

            onClose();
            Alert.alert(
              'Payment Successful',
              'Your registration payment has been completed successfully!',
              [{ text: 'OK' }]
            );
          } catch (captureError) {
            console.error('[PayPalInvoiceModal] Error capturing payment:', captureError);
            Alert.alert(
              'Payment Error',
              'There was an issue processing your payment. Please contact support.',
              [{ text: 'OK' }]
            );
          } finally {
            setIsSubmitting(false);
          }
        } else {
          console.log('[PayPalInvoiceModal] No token found in return URL');
          onClose();
        }
      } else if (result.type === 'cancel') {
        console.log('[PayPalInvoiceModal] Payment cancelled by user');
        onClose();
        Alert.alert(
          'Payment Cancelled',
          'You cancelled the payment process.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('[PayPalInvoiceModal] Payment flow did not complete:', result.type);
        onClose();
      }
    } catch (error) {
      console.error('[PayPalInvoiceModal] ❌ PayPal payment error:', error);
      if (error instanceof Error) {
        console.error('[PayPalInvoiceModal] Error message:', error.message);
        console.error('[PayPalInvoiceModal] Error stack:', error.stack);
      }
      
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
                  <Text style={styles.detailValue}>{formatDateAsFullDay(event.date, event.numberOfDays, 1)}</Text>
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
                <View style={styles.feeBreakdown}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Entry Fee ({totalPeople} {totalPeople === 1 ? 'person' : 'people'}):</Text>
                    <Text style={styles.feeValue}>${subtotal.toFixed(2)}</Text>
                  </View>
                  {guestCount > 0 && (
                    <Text style={styles.feeBreakdownDetail}>
                      {currentUser.name} + {guestCount} guest{guestCount !== 1 ? 's' : ''} × ${entryFeeAmount.toFixed(2)}
                    </Text>
                  )}
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Service Fee (3% + $0.30):</Text>
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
                <View style={styles.deadlineBox}>
                  <Ionicons name="time-outline" size={20} color="#DC2626" />
                  <Text style={styles.deadlineText}>
                    Payment must be completed by {getPaymentDeadline()}
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
  feeBreakdownDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
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
    borderColor: '#0070BA',
    backgroundColor: '#E8F4FC',
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
    color: '#0070BA',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  packagePriceSelected: {
    color: '#0070BA',
  },
  packageDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 4,
  },
  packageDescriptionSelected: {
    color: '#0070BA',
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
    backgroundColor: '#0070BA',
    borderColor: '#0070BA',
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
