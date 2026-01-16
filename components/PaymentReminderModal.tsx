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
  Linking,
} from 'react-native';
import { Alert } from '@/utils/alertPolyfill';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import { Member } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { createPayPalOrder } from '@/utils/paypalService';
import { supabase } from '@/integrations/supabase/client';

interface PaymentReminderModalProps {
  visible: boolean;
  recipients: Member[];
  onClose: () => void;
}

export function PaymentReminderModal({
  visible,
  recipients,
  onClose,
}: PaymentReminderModalProps) {
  const { orgInfo } = useSettings();
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setDueDate('');
      setItemDescription('');
    }
  }, [visible]);

  const canSend = () => {
    return amount.trim().length > 0 && 
           dueDate.trim().length > 0 && 
           itemDescription.trim().length > 0 && 
           !isSending;
  };

  const getPaymentReminderHTML = (paypalApprovalUrl: string) => {
    const zellePhone = formatPhoneNumber(orgInfo.zellePhone || '5714811006');
    const amountValue = parseFloat(amount).toFixed(2);
    const paypalAmountWithFee = ((parseFloat(amount) + 0.30) / 0.97).toFixed(2);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; }
    .header-icon { width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 32px; }
    .content { padding: 40px 20px; }
    .greeting { font-size: 16px; color: #333333; margin-bottom: 24px; line-height: 1.6; }
    .invoice-card { background-color: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .invoice-header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #D0D0D0; }
    .invoice-title { font-size: 24px; font-weight: 700; color: #1B5E20; letter-spacing: 2px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .detail-label { font-size: 14px; color: #666666; font-weight: 600; }
    .detail-value { font-size: 14px; color: #1a1a1a; font-weight: 600; text-align: right; }
    .amount-box { background-color: #ffffff; border: 2px solid #1B5E20; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .amount-label { font-size: 16px; color: #666666; margin-bottom: 8px; }
    .amount-value { font-size: 36px; font-weight: 700; color: #1B5E20; }
    .payment-methods { margin: 32px 0; }
    .section-title { font-size: 20px; font-weight: 700; color: #333333; margin-bottom: 20px; text-align: center; }
    .payment-option { background-color: #ffffff; border: 2px solid #E0E0E0; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .payment-option-header { display: flex; align-items: center; margin-bottom: 16px; justify-content: center; }
    .payment-icon { width: 48px; height: 48px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; color: #ffffff; font-size: 24px; }
    .payment-icon.zelle { background-color: #6B21A8; }
    .payment-icon.paypal { background-color: #0070BA; }
    .payment-name { font-size: 20px; font-weight: 700; color: #333333; }
    .payment-info { font-size: 20px; font-weight: 700; text-align: center; padding: 16px; background-color: #F8F9FA; border-radius: 8px; margin-top: 12px; letter-spacing: 1px; }
    .payment-info.zelle { color: #6B21A8; }
    .paypal-button { display: inline-block; background-color: #0070BA; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 700; margin-top: 12px; text-align: center; width: 100%; box-sizing: border-box; transition: background-color 0.2s; }
    .paypal-button:hover { background-color: #005A9C; }
    .deadline-box { background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; border-radius: 8px; margin: 24px 0; }
    .deadline-text { color: #DC2626; font-size: 14px; font-weight: 600; margin: 0; }
    .footer { background-color: #f8f9fa; padding: 24px 20px; text-align: center; border-top: 1px solid #e0e0e0; }
    .footer-text { font-size: 14px; color: #333333; margin: 12px 0; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">💳</div>
      <h1>PAYMENT REMINDER</h1>
    </div>
    
    <div class="content">
      <p class="greeting">
        Hi there,<br><br>
        This is a friendly reminder for you to make a payment for something you registered for. See details below.
      </p>
      
      <div class="invoice-card">
        <div class="invoice-header">
          <div class="invoice-title">INVOICE DETAILS</div>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Invoice For:</span>
          <span class="detail-value">${itemDescription}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Due Date:</span>
          <span class="detail-value">${dueDate}</span>
        </div>
      </div>
      
      <div class="amount-box">
        <div class="amount-label">Amount Due</div>
        <div class="amount-value">${amountValue}</div>
      </div>
      
      <div class="payment-methods">
        <h2 class="section-title">Payment Options</h2>
        
        <div class="payment-option">
          <div class="payment-option-header">
            <div class="payment-icon zelle">💸</div>
            <div class="payment-name">Zelle</div>
          </div>
          <p style="font-size: 14px; color: #666666; margin: 0 0 12px 0; text-align: center;">Send payment via Zelle to:</p>
          <div class="payment-info zelle">${zellePhone}</div>
        </div>
        
        <div class="payment-option">
          <div class="payment-option-header">
            <div class="payment-icon paypal">🅿️</div>
            <div class="payment-name">PayPal</div>
          </div>
          <p style="font-size: 14px; color: #666666; margin: 0 0 12px 0; text-align: center;">Click the button below to pay with PayPal (includes processing fee):</p>
          <a href="${paypalApprovalUrl}" class="paypal-button">PAY ${paypalAmountWithFee} WITH PAYPAL</a>
        </div>
      </div>
      
      <div class="deadline-box">
        <p class="deadline-text">⏰ Payment must be received by ${dueDate}.</p>
      </div>
      
      <p style="font-size: 14px; color: #666666; line-height: 1.6; font-style: italic; text-align: center;">
        If you have already submitted your payment, please disregard this reminder.
      </p>
      
      <p class="footer-text" style="margin-top: 32px;">
        Thank you again for your support of DMVVGA.
      </p>
    </div>
    
    <div class="footer">
      <p style="font-size: 12px; color: #666666; margin: 4px 0;">This is an automated payment reminder</p>
    </div>
  </div>
</body>
</html>`;
  };

  const handleSend = async () => {
    if (!canSend()) return;

    const recipientEmails = recipients
      .map(r => r.email)
      .filter((email): email is string => !!email);

    if (recipientEmails.length === 0) {
      Alert.alert('No Recipients', 'No recipients with email addresses selected.');
      return;
    }

    setIsSending(true);

    try {
      console.log('[PaymentReminder] Fetching PayPal configuration...');
      const { data: paypalConfig, error: configError } = await supabase
        .from('organization_settings')
        .select('paypal_client_id, paypal_client_secret, paypal_mode, paypal_processing_fee, paypal_transaction_fee')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (configError || !paypalConfig) {
        console.error('[PaymentReminder] Failed to fetch PayPal config:', configError);
        Alert.alert('Error', 'Failed to load PayPal configuration. Please try again.');
        setIsSending(false);
        return;
      }

      const processingFee = paypalConfig.paypal_processing_fee || 0.03;
      const transactionFee = paypalConfig.paypal_transaction_fee || 0.30;
      const baseAmount = parseFloat(amount);
      const paypalAmountWithFee = ((baseAmount + transactionFee) / (1 - processingFee));

      console.log('[PaymentReminder] Creating PayPal order for payment reminder...');
      console.log('[PaymentReminder] Base amount:', baseAmount);
      console.log('[PaymentReminder] Amount with fee:', paypalAmountWithFee.toFixed(2));
      
      const paypalOrderResponse = await createPayPalOrder({
        amount: paypalAmountWithFee,
        eventName: itemDescription,
        eventId: 'payment-reminder',
        playerEmail: recipientEmails[0],
        paypalClientId: paypalConfig.paypal_client_id || '',
        paypalClientSecret: paypalConfig.paypal_client_secret || '',
        paypalMode: (paypalConfig.paypal_mode || 'sandbox') as 'sandbox' | 'live',
      });

      console.log('[PaymentReminder] PayPal order created:', paypalOrderResponse.orderId);
      console.log('[PaymentReminder] Approval URL:', paypalOrderResponse.approvalUrl);

      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (!isAvailable) {
        const bccEmails = recipientEmails.join(',');
        const subject = encodeURIComponent('Payment Reminder: Your Outstanding Balance');
        const body = encodeURIComponent(`Payment Reminder\n\nAmount Due: ${baseAmount.toFixed(2)}\nDue Date: ${dueDate}\nFor: ${itemDescription}\n\nPlease send payment via:\n- Zelle: ${formatPhoneNumber(orgInfo.zellePhone || '5714811006')}\n- PayPal: ${paypalOrderResponse.approvalUrl}`);
        
        const mailtoUrl = `mailto:?bcc=${bccEmails}&subject=${subject}&body=${body}`;
        
        const supported = await Linking.canOpenURL(mailtoUrl);
        if (supported) {
          await Linking.openURL(mailtoUrl);
          Alert.alert(
            'Email Opened',
            'Your default email app has been opened with the payment reminder.',
            [{ text: 'OK', onPress: onClose }]
          );
        } else {
          Alert.alert('Error', 'Unable to open email client.');
        }
      } else {
        await MailComposer.composeAsync({
          recipients: [],
          bccRecipients: recipientEmails,
          subject: 'Payment Reminder: Your Outstanding Balance',
          body: getPaymentReminderHTML(paypalOrderResponse.approvalUrl),
          isHtml: true,
        });

        Alert.alert(
          'Email Sent',
          `Payment reminder sent to ${recipientEmails.length} recipient${recipientEmails.length !== 1 ? 's' : ''}.`,
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to send payment reminder. Please try again.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Payment Reminder</Text>
            <TouchableOpacity onPress={onClose} disabled={isSending}>
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.description}>
              Send a professionally formatted HTML payment reminder to selected members
            </Text>

            <View style={styles.recipientsCard}>
              <View style={styles.recipientsHeader}>
                <Ionicons name="people" size={20} color="#003366" />
                <Text style={styles.recipientsText}>
                  {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} selected
                </Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Amount <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    editable={!isSending}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Due Date <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="e.g., March 15, 2024"
                  editable={!isSending}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Invoice For <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={itemDescription}
                  onChangeText={setItemDescription}
                  placeholder="e.g., Event Entry Fee, Membership Dues"
                  editable={!isSending}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.paymentInfoCard}>
              <Text style={styles.paymentInfoTitle}>Payment Information</Text>
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>Zelle:</Text>
                <Text style={styles.paymentInfoValue}>
                  {formatPhoneNumber(orgInfo.zellePhone || '5714811006')}
                </Text>
              </View>
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>PayPal:</Text>
                <Text style={styles.paymentInfoValue}>
                  Secure checkout via PayPal API
                </Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !canSend() && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!canSend()}
              >
                {isSending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="mail" size={20} color="#fff" />
                    <Text style={styles.sendButtonText}>SEND REMINDER</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '85%',
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
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  recipientsCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  recipientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipientsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#003366',
  },
  formSection: {
    marginBottom: 20,
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1B5E20',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1B5E20',
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
  paymentInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentInfoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 12,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  paymentInfoLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500' as const,
  },
  paymentInfoValue: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '600' as const,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  sendButton: {
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
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 1,
  },
});
