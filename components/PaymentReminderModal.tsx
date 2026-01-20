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
import { createPayPalPaymentLink, generatePaymentReminderHTML } from '@/utils/paymentEmailService';
import { supabaseService } from '@/utils/supabaseService';

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
  const [option1Name, setOption1Name] = useState('');
  const [option1Amount, setOption1Amount] = useState('');
  const [option2Name, setOption2Name] = useState('');
  const [option2Amount, setOption2Amount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [templateSubject, setTemplateSubject] = useState('DMVVGA Payment Reminder');

  useEffect(() => {
    if (visible) {
      setOption1Name('');
      setOption1Amount('');
      setOption2Name('');
      setOption2Amount('');
      setDueDate('');
      setItemDescription('');
      loadTemplateSubject();
    }
  }, [visible]);

  const loadTemplateSubject = async () => {
    try {
      const templates = await supabaseService.emailTemplates.getAll();
      const paymentReminderTemplate = templates.find(t => t.name === 'Payment Reminder');
      if (paymentReminderTemplate && paymentReminderTemplate.subject) {
        setTemplateSubject(paymentReminderTemplate.subject);
      }
    } catch (error) {
      console.error('Failed to load template subject:', error);
    }
  };

  const canSend = () => {
    return option1Name.trim().length > 0 &&
           option1Amount.trim().length > 0 && 
           option2Name.trim().length > 0 &&
           option2Amount.trim().length > 0 && 
           dueDate.trim().length > 0 && 
           itemDescription.trim().length > 0 && 
           !isSending;
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
      console.log('[PaymentReminder] Creating PayPal payment links for both options...');
      const option1AmountNum = parseFloat(option1Amount);
      const option2AmountNum = parseFloat(option2Amount);
      
      const [paypalLink1, paypalLink2] = await Promise.all([
        createPayPalPaymentLink({
          amount: option1AmountNum,
          eventName: `${itemDescription} - ${option1Name}`,
          eventId: 'payment-reminder-opt1',
          playerEmail: recipientEmails[0],
          itemDescription: `${itemDescription} - ${option1Name}`,
          dueDate,
          includeProcessingFee: true,
        }),
        createPayPalPaymentLink({
          amount: option2AmountNum,
          eventName: `${itemDescription} - ${option2Name}`,
          eventId: 'payment-reminder-opt2',
          playerEmail: recipientEmails[0],
          itemDescription: `${itemDescription} - ${option2Name}`,
          dueDate,
          includeProcessingFee: true,
        }),
      ]);

      console.log('[PaymentReminder] PayPal links created successfully');
      console.log('[PaymentReminder] Option 1 Order ID:', paypalLink1.orderId);
      console.log('[PaymentReminder] Option 2 Order ID:', paypalLink2.orderId);

      const htmlContent = generatePaymentReminderHTML({
        playerName: recipients.length === 1 ? recipients[0].name : 'there',
        eventName: itemDescription,
        option1Name,
        option1Amount: option1AmountNum,
        option2Name,
        option2Amount: option2AmountNum,
        dueDate,
        itemDescription,
        zellePhone: orgInfo.zellePhone || '5714811006',
        paypalApprovalUrl1: paypalLink1.approvalUrl,
        paypalAmountWithFee1: paypalLink1.amountWithFee,
        paypalApprovalUrl2: paypalLink2.approvalUrl,
        paypalAmountWithFee2: paypalLink2.amountWithFee,
        organizationName: orgInfo.name || 'DMVVGA',
      });

      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (!isAvailable) {
        const bccEmails = recipientEmails.join(',');
        const subject = encodeURIComponent(templateSubject);
        const body = encodeURIComponent(`Payment Reminder\n\nFor: ${itemDescription}\nDue Date: ${dueDate}\n\nOption 1: ${option1Name} - ${option1AmountNum.toFixed(2)}\nOption 2: ${option2Name} - ${option2AmountNum.toFixed(2)}\n\nPlease send payment via:\n- Zelle: ${formatPhoneNumber(orgInfo.zellePhone || '5714811006')}\n- PayPal Option 1: ${paypalLink1.approvalUrl}\n- PayPal Option 2: ${paypalLink2.approvalUrl}`);
        
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
          subject: templateSubject,
          body: htmlContent,
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
              <View style={styles.optionCard}>
                <Text style={styles.optionTitle}>Option 1</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Name <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={option1Name}
                    onChangeText={setOption1Name}
                    placeholder="e.g., Golf & Lunch"
                    editable={!isSending}
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Amount <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={option1Amount}
                      onChangeText={setOption1Amount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      editable={!isSending}
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.optionCard}>
                <Text style={styles.optionTitle}>Option 2</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Name <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={option2Name}
                    onChangeText={setOption2Name}
                    placeholder="e.g., Golf Only"
                    editable={!isSending}
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Amount <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={option2Amount}
                      onChangeText={setOption2Amount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      editable={!isSending}
                      placeholderTextColor="#999"
                    />
                  </View>
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
                  2 links with fees included
                </Text>
              </View>
              <Text style={styles.paymentInfoNote}>
                Email will include both package options with separate PayPal buttons showing exact amounts.
              </Text>
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
    paddingBottom: 400,
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
  paymentInfoNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic' as const,
    marginTop: 12,
    lineHeight: 18,
  },
  optionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#003366',
    marginBottom: 12,
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
