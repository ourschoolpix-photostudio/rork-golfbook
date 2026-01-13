import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Member, Event } from '@/types';
import { Registration } from '@/utils/registrationService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

interface EventPlayerModalProps {
  visible: boolean;
  player: Member | null;
  registration: Registration | null;
  tournamentFlight: string;
  event: Event | null;
  onClose: () => void;
  onSave: (player: Member, adjustedHandicap: string | null | undefined, numberOfGuests?: number, guestNames?: string, isSponsor?: boolean) => Promise<void>;
  onMembershipRenewalRequired?: (player: Member) => void;
}

type MembershipLevel = 'full' | 'basic';
type PaymentMethod = 'cash' | 'check' | 'zelle' | 'venmo' | 'paypal';

export function EventPlayerModal({
  visible,
  player,
  registration,
  tournamentFlight,
  event,
  onClose,
  onSave,
  onMembershipRenewalRequired,
}: EventPlayerModalProps) {
  const { updateMember } = useAuth();
  const { orgInfo } = useSettings();
  const [currentHandicap, setCurrentHandicap] = useState('');
  const [adjustedHandicap, setAdjustedHandicap] = useState('');
  const [membershipType, setMembershipType] = useState<'active' | 'in-active' | 'guest'>('active');
  const [numberOfGuests, setNumberOfGuests] = useState('');
  const [guestNames, setGuestNames] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSponsor, setIsSponsor] = useState(false);
  const originalMembershipTypeRef = useRef<'active' | 'in-active' | 'guest'>('active');
  
  // Add to History flow states
  const [showAddToHistoryFlow, setShowAddToHistoryFlow] = useState(false);
  const [selectedMembershipLevel, setSelectedMembershipLevel] = useState<MembershipLevel | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');


  const isSocialEvent = event?.type === 'social';

  useEffect(() => {
    if (player && visible) {
      console.log('=== Modal useEffect triggered ===');
      console.log('Player:', player.name);
      console.log('Raw membershipType:', player.membershipType);
      console.log('Type of membershipType:', typeof player.membershipType);
      console.log('Registration adjustedHandicap:', registration?.adjustedHandicap);
      
      setCurrentHandicap(player.handicap?.toString() || '0');
      setAdjustedHandicap(registration?.adjustedHandicap || '');
      setNumberOfGuests(registration?.numberOfGuests?.toString() || '');
      setGuestNames(registration?.guestNames || '');
      setIsSponsor(registration?.isSponsor || false);
      
      let normalized: 'active' | 'in-active' | 'guest' = 'active';
      
      if (!player.membershipType) {
        normalized = 'active';
      } else if (player.membershipType === 'in-active') {
        normalized = 'in-active';
      } else if (player.membershipType === 'guest') {
        normalized = 'guest';
      } else if (player.membershipType === 'active') {
        normalized = 'active';
      }
      
      console.log('Normalized to:', normalized);
      setMembershipType(normalized);
      originalMembershipTypeRef.current = normalized;
      
      // Reset add to history flow states
      setShowAddToHistoryFlow(false);
      setSelectedMembershipLevel(null);
      setSelectedPaymentMethod('cash');
      setPaymentAmount('');
    }
  }, [player, registration, visible]);

  if (!player) return null;

  const normalizeGuestNames = (guestNamesInput: string, guestCount: number): string | undefined => {
    if (!guestCount || guestCount === 0) return undefined;
    
    if (!guestNamesInput || guestNamesInput.trim() === '') {
      return Array(guestCount).fill('Unknown Guest').join('\n');
    }
    
    const names = guestNamesInput.split('\n').map(n => n.trim()).filter(n => n !== '');
    const missingCount = guestCount - names.length;
    
    if (missingCount > 0) {
      const unknownGuests = Array(missingCount).fill('Unknown Guest');
      return [...names, ...unknownGuests].join('\n');
    }
    
    return names.slice(0, guestCount).join('\n');
  };

  const handleMembershipTypeChange = (newType: 'active' | 'in-active' | 'guest') => {
    const wasInactive = originalMembershipTypeRef.current === 'in-active';
    const isNowActive = newType === 'active';
    
    if (wasInactive && isNowActive) {
      // Show the add to history flow instead of payment flow
      console.log('[EventPlayerModal] Membership change: in-active -> active, showing add to history flow');
      setShowAddToHistoryFlow(true);
      setMembershipType(newType);
    } else {
      setMembershipType(newType);
      setShowAddToHistoryFlow(false);
      setSelectedMembershipLevel(null);
      setPaymentAmount('');
    }
  };

  const handleMembershipLevelSelect = (level: MembershipLevel) => {
    setSelectedMembershipLevel(level);
    // Auto-populate amount from settings
    if (level === 'full') {
      setPaymentAmount(orgInfo.fullMembershipPrice || '');
    } else {
      setPaymentAmount(orgInfo.basicMembershipPrice || '');
    }
  };

  const handleAddToHistory = async () => {
    if (!player || !selectedMembershipLevel) {
      Alert.alert('Error', 'Please select a membership level');
      return;
    }
    
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }
    
    try {
      setIsSaving(true);
      console.log('[EventPlayerModal] Adding membership to history for:', player.name);
      console.log('[EventPlayerModal] Level:', selectedMembershipLevel, 'Method:', selectedPaymentMethod, 'Amount:', paymentAmount);
      
      // Insert membership payment record
      const { error: paymentError } = await supabase
        .from('membership_payments')
        .insert({
          member_id: player.id,
          member_name: player.name,
          membership_type: selectedMembershipLevel,
          amount: paymentAmount,
          payment_method: selectedPaymentMethod,
          payment_status: 'completed',
          email: player.email || 'offline-payment@placeholder.com',
          phone: player.phone || null,
        });
      
      if (paymentError) {
        console.error('[EventPlayerModal] Error inserting payment record:', JSON.stringify(paymentError, null, 2));
        throw new Error(paymentError.message || 'Failed to insert payment record');
      }
      
      // Update the member's membership type and level
      const updatedPlayer: Member = {
        ...player,
        handicap: parseFloat(currentHandicap) || player.handicap || 0,
        membershipType: 'active',
        membershipLevel: selectedMembershipLevel,
      };
      
      await updateMember(player.id, {
        membershipType: 'active',
        membershipLevel: selectedMembershipLevel,
      });
      
      console.log('[EventPlayerModal] Membership updated successfully');
      
      // Now save the registration changes
      const guestCount = numberOfGuests ? parseInt(numberOfGuests, 10) : undefined;
      const guestNamesValue = guestCount ? normalizeGuestNames(guestNames, guestCount) : undefined;
      
      await onSave(updatedPlayer, adjustedHandicap === '' ? null : adjustedHandicap, guestCount, guestNamesValue, isSponsor);
      
      Alert.alert('Success', `${player.name}'s membership has been updated and recorded.`);
      onClose();
    } catch (error: any) {
      console.error('[EventPlayerModal] Error adding to history:', error?.message || JSON.stringify(error));
      Alert.alert('Error', error?.message || 'Failed to update membership. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const wasInactive = originalMembershipTypeRef.current === 'in-active';
      const isNowActive = membershipType === 'active';
      
      // If changing from inactive to active, must go through add to history flow
      if (wasInactive && isNowActive && !selectedMembershipLevel) {
        Alert.alert('Membership Level Required', 'Please select Full Member or Basic Member and complete the Add to History form.');
        setIsSaving(false);
        return;
      }
      
      // If add to history flow is active and membership level selected, use that flow
      if (showAddToHistoryFlow && selectedMembershipLevel) {
        await handleAddToHistory();
        return;
      }
      
      const updatedPlayer: Member = {
        ...player,
        handicap: parseFloat(currentHandicap) || player.handicap || 0,
        membershipType,
      };
      
      const guestCount = numberOfGuests ? parseInt(numberOfGuests, 10) : undefined;
      const guestNamesValue = guestCount ? normalizeGuestNames(guestNames, guestCount) : undefined;
      
      await onSave(updatedPlayer, adjustedHandicap === '' ? null : adjustedHandicap, guestCount, guestNamesValue, isSponsor);
      onClose();
    } catch (error) {
      console.error('Error saving player:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                scrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
            <View style={styles.header}>
              <Text style={styles.title}>{player.name}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            <View style={styles.membershipButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.membershipButton,
                  membershipType === 'active' && styles.membershipButtonActive,
                ]}
                onPress={() => handleMembershipTypeChange('active')}
              >
                <Text
                  style={[
                    styles.membershipButtonText,
                    membershipType === 'active' && styles.membershipButtonTextActive,
                  ]}
                >
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.membershipButton,
                  membershipType === 'in-active' && styles.membershipButtonActive,
                ]}
                onPress={() => handleMembershipTypeChange('in-active')}
              >
                <Text
                  style={[
                    styles.membershipButtonText,
                    membershipType === 'in-active' && styles.membershipButtonTextActive,
                  ]}
                >
                  In-active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.membershipButton,
                  membershipType === 'guest' && styles.membershipButtonActive,
                ]}
                onPress={() => handleMembershipTypeChange('guest')}
              >
                <Text
                  style={[
                    styles.membershipButtonText,
                    membershipType === 'guest' && styles.membershipButtonTextActive,
                  ]}
                >
                  Guest
                </Text>
              </TouchableOpacity>
            </View>

            {showAddToHistoryFlow && (
              <View style={styles.addToHistoryContainer}>
                <Text style={styles.addToHistoryTitle}>Add to Membership History</Text>
                
                <Text style={styles.fieldLabel}>Membership Level</Text>
                <View style={styles.levelButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.levelButton,
                      selectedMembershipLevel === 'full' && styles.levelButtonActive,
                    ]}
                    onPress={() => handleMembershipLevelSelect('full')}
                  >
                    <Text
                      style={[
                        styles.levelButtonText,
                        selectedMembershipLevel === 'full' && styles.levelButtonTextActive,
                      ]}
                    >
                      Full Member
                    </Text>
                    {orgInfo.fullMembershipPrice && (
                      <Text style={[
                        styles.levelPriceText,
                        selectedMembershipLevel === 'full' && styles.levelButtonTextActive,
                      ]}>
                        ${orgInfo.fullMembershipPrice}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.levelButton,
                      styles.levelButtonBasic,
                      selectedMembershipLevel === 'basic' && styles.levelButtonBasicActive,
                    ]}
                    onPress={() => handleMembershipLevelSelect('basic')}
                  >
                    <Text
                      style={[
                        styles.levelButtonText,
                        selectedMembershipLevel === 'basic' && styles.levelButtonTextActive,
                      ]}
                    >
                      Basic Member
                    </Text>
                    {orgInfo.basicMembershipPrice && (
                      <Text style={[
                        styles.levelPriceText,
                        selectedMembershipLevel === 'basic' && styles.levelButtonTextActive,
                      ]}>
                        ${orgInfo.basicMembershipPrice}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.fieldLabel}>Payment Method</Text>
                <View style={styles.paymentMethodContainer}>
                  {(['cash', 'check', 'zelle', 'venmo', 'paypal'] as PaymentMethod[]).map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethodButton,
                        selectedPaymentMethod === method && styles.paymentMethodButtonActive,
                      ]}
                      onPress={() => setSelectedPaymentMethod(method)}
                    >
                      <Text
                        style={[
                          styles.paymentMethodText,
                          selectedPaymentMethod === method && styles.paymentMethodTextActive,
                        ]}
                      >
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.fieldLabel}>Amount Paid</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#999"
                  />
                </View>
                {paymentAmount && (
                  <Text style={styles.amountNote}>Amount auto-filled from settings</Text>
                )}
              </View>
            )}

            <View style={styles.content}>
              {!isSocialEvent && (
                <>
                  <View style={styles.row}>
                    <Text style={styles.label}>Current Handicap</Text>
                    <TextInput
                      style={styles.input}
                      value={currentHandicap}
                      onChangeText={setCurrentHandicap}
                      keyboardType="decimal-pad"
                      editable={!isSaving}
                    />
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Adjusted Handicap</Text>
                    <TextInput
                      style={styles.input}
                      value={adjustedHandicap}
                      onChangeText={setAdjustedHandicap}
                      keyboardType="decimal-pad"
                      placeholder="—"
                      editable={!isSaving}
                    />
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>Tournament Flight</Text>
                    <Text style={styles.value}>{tournamentFlight}</Text>
                  </View>
                </>
              )}

              {isSocialEvent && (
                <>
                  <View style={styles.row}>
                    <Text style={styles.label}>Number of Guests</Text>
                    <TextInput
                      style={styles.input}
                      value={numberOfGuests}
                      onChangeText={setNumberOfGuests}
                      keyboardType="number-pad"
                      placeholder="0"
                      editable={!isSaving}
                    />
                  </View>

                  {parseInt(numberOfGuests, 10) > 0 && (
                    <View style={styles.fullWidthRow}>
                      <Text style={styles.label}>Guest Name{parseInt(numberOfGuests, 10) > 1 ? 's' : ''}</Text>
                      <TextInput
                        style={[styles.textInput, styles.textInputMultiline]}
                        value={guestNames}
                        onChangeText={setGuestNames}
                        placeholder={parseInt(numberOfGuests, 10) > 1 ? "Enter guest names (one per line)" : "Enter guest name"}
                        multiline
                        numberOfLines={Math.min(parseInt(numberOfGuests, 10) || 1, 4)}
                        editable={!isSaving}
                      />
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity
                style={styles.sponsorToggleContainer}
                onPress={() => setIsSponsor(!isSponsor)}
                disabled={isSaving}
              >
                <View style={[styles.sponsorCheckbox, isSponsor && styles.sponsorCheckboxActive]}>
                  {isSponsor && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.sponsorLabel}>Sponsor</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 600,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 5,
    maxHeight: '80%',
  },
  scrollView: {},
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  membershipButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  membershipButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  membershipButtonActive: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  membershipButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  membershipButtonTextActive: {
    color: '#fff',
  },
  content: {
    gap: 16,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  na: {
    color: '#999',
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 80,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#1B5E20',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  fullWidthRow: {
    paddingVertical: 12,
  },
  textInput: {
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
    paddingTop: 12,
  },
  sponsorToggleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    gap: 10,
  },
  sponsorCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#fff',
  },
  sponsorCheckboxActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  sponsorLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  addToHistoryContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addToHistoryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#007AFF',
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  levelButtonsContainer: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
    alignItems: 'center' as const,
  },
  levelButtonActive: {
    backgroundColor: '#4CAF50',
  },
  levelButtonBasic: {
    borderColor: '#FF9500',
  },
  levelButtonBasicActive: {
    backgroundColor: '#FF9500',
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  levelPriceText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#888',
    marginTop: 2,
  },
  levelButtonTextActive: {
    color: '#fff',
  },
  paymentMethodContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  paymentMethodButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  paymentMethodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#666',
  },
  paymentMethodTextActive: {
    color: '#fff',
  },
  amountInputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#666',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    paddingVertical: 12,
  },
  amountNote: {
    fontSize: 11,
    color: '#4CAF50',
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
});
