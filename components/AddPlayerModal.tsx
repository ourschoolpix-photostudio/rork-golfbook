import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { X, FileText } from 'lucide-react-native';
import { ProfilePhotoPicker } from './ProfilePhotoPicker';
import { Member } from '@/types';
import { formatPhoneNumber, getPhoneDigits } from '@/utils/phoneFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';

interface AddPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (player: Partial<Member>) => void;
  editingMember?: Member | null;
}

const BOARD_MEMBER_ROLES = [
  'Admin',
  'President',
  'Vice-President',
  'Tournament Director',
  'Handicap Director',
  'Operations',
  'Financer',
  'Member Relations',
] as const;

export function AddPlayerModal({ visible, onClose, onAdd, editingMember }: AddPlayerModalProps) {
  const { currentUser } = useAuth();
  const { orgInfo } = useSettings();
  const isEditMode = !!editingMember;
  const [membershipType, setMembershipType] = useState<'active' | 'in-active' | 'guest'>('active');
  const [membershipLevel, setMembershipLevel] = useState<'full' | 'basic'>('full');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [flight, setFlight] = useState<'A' | 'B' | 'C' | 'L' | null>(null);
  const [rolexFlight, setRolexFlight] = useState<'A' | 'B' | null>(null);
  const [currentHandicap, setCurrentHandicap] = useState<string>('');
  const [ghin, setGhin] = useState<string>('');
  const [rolexPoints, setRolexPoints] = useState<string>('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [boardMemberRoles, setBoardMemberRoles] = useState<string[]>([]);
  const [showAddToHistoryPrompt, setShowAddToHistoryPrompt] = useState(false);
  const [pendingSave, setPendingSave] = useState<Partial<Member> | null>(null);
  const [selectedMembershipType, setSelectedMembershipType] = useState<'full' | 'basic'>('full');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'check' | 'zelle' | 'venmo' | 'paypal'>('cash');
  const [loading, setLoading] = useState(false);

  const PAYPAL_FEE_PERCENT = 0.03;
  const PAYPAL_FEE_FIXED = 0.30;

  const calculatePayPalAdjustedAmount = (baseAmount: string) => {
    const amount = parseFloat(baseAmount) || 0;
    const fee = (amount * PAYPAL_FEE_PERCENT) + PAYPAL_FEE_FIXED;
    return (amount + fee).toFixed(2);
  };

  const getDisplayAmount = () => {
    const baseAmount = selectedMembershipType === 'full' 
      ? (orgInfo.fullMembershipPrice || '0')
      : (orgInfo.basicMembershipPrice || '0');
    
    if (selectedPaymentMethod === 'paypal') {
      return calculatePayPalAdjustedAmount(baseAmount);
    }
    return baseAmount;
  };

  useEffect(() => {
    if (editingMember && visible) {
      setMembershipType(editingMember.membershipType || 'active');
      setMembershipLevel(editingMember.membershipLevel || 'full');
      setGender(editingMember.gender || null);
      setFullName(editingMember.fullName || editingMember.name || '');
      setUsername(editingMember.username || '');
      setPin(editingMember.pin || '');
      setAddress(editingMember.address || '');
      setCity(editingMember.city || '');
      setState(editingMember.state || '');
      setPhone(formatPhoneNumber(editingMember.phone || ''));
      setEmail(editingMember.email || '');
      setFlight((editingMember.flight as 'A' | 'B' | 'C' | 'L') || null);
      setRolexFlight((editingMember.rolexFlight as 'A' | 'B') || null);
      setCurrentHandicap(editingMember.currentHandicap || '');
      setGhin(editingMember.ghin || '');
      setRolexPoints(editingMember.rolexPoints?.toString() || '');
      setProfilePhotoUri(editingMember.profilePhotoUri || null);
      setBoardMemberRoles(editingMember.boardMemberRoles || []);
    } else if (!visible) {
      resetForm();
    }
    setShowAddToHistoryPrompt(false);
    setPendingSave(null);
    setSelectedMembershipType('full');
    setSelectedPaymentMethod('cash');
  }, [editingMember, visible]);

  const handleAddPlayer = async () => {
    if (!username.trim() || !pin.trim()) {
      Alert.alert('Missing Fields', 'Username and PIN are required');
      return;
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      Alert.alert('Invalid PIN', 'PIN must be 4 digits');
      return;
    }

    const player: Partial<Member> = {
      ...(isEditMode && editingMember ? { id: editingMember.id } : {}),
      fullName,
      name: fullName || username,
      username,
      pin,
      membershipType,
      membershipLevel: membershipType === 'active' ? membershipLevel : undefined,
      gender: gender || undefined,
      address,
      city,
      state,
      phone: getPhoneDigits(phone),
      email,
      flight: flight || undefined,
      rolexFlight: rolexFlight || undefined,
      currentHandicap: currentHandicap.trim(),
      ghin,
      rolexPoints: parseInt(rolexPoints) || 0,
      profilePhotoUri: profilePhotoUri || undefined,
      isAdmin: isEditMode ? editingMember?.isAdmin : false,
      boardMemberRoles: boardMemberRoles.length > 0 ? boardMemberRoles : undefined,
    };

    // For new players with active status, show membership history prompt
    if (!isEditMode && membershipType === 'active' && currentUser?.isAdmin) {
      setPendingSave(player);
      setSelectedMembershipType(membershipLevel);
      setShowAddToHistoryPrompt(true);
      return;
    }

    onAdd(player);
    if (!isEditMode) {
      resetForm();
    }
  };

  const handleAddToHistoryConfirm = async (addToHistory: boolean) => {
    if (!pendingSave) return;
    
    try {
      setLoading(true);
      setShowAddToHistoryPrompt(false);
      
      if (addToHistory) {
        const baseAmount = selectedMembershipType === 'full' 
          ? (orgInfo.fullMembershipPrice || '0')
          : (orgInfo.basicMembershipPrice || '0');
        
        const amount = selectedPaymentMethod === 'paypal' 
          ? calculatePayPalAdjustedAmount(baseAmount)
          : baseAmount;
        
        // Update pendingSave to include the membershipLevel
        pendingSave.membershipLevel = selectedMembershipType;
        
        // Generate a temporary ID for the new member (will be replaced by actual ID after save)
        const tempMemberId = `new_${Date.now()}`;
        
        console.log('[AddPlayerModal] ========================================');
        console.log('[AddPlayerModal] Adding membership record for new player...');
        console.log('[AddPlayerModal] Member Name:', pendingSave.name);
        console.log('[AddPlayerModal] Membership Type:', selectedMembershipType);
        console.log('[AddPlayerModal] Amount:', amount);
        console.log('[AddPlayerModal] Payment Method:', selectedPaymentMethod);
        console.log('[AddPlayerModal] ========================================');
        
        const insertData = {
          member_id: tempMemberId,
          member_name: pendingSave.name || pendingSave.fullName || pendingSave.username,
          membership_type: selectedMembershipType,
          amount: amount,
          payment_method: selectedPaymentMethod,
          payment_status: 'completed',
          email: pendingSave.email || '',
          phone: pendingSave.phone || '',
          created_at: new Date().toISOString(),
        };
        
        console.log('[AddPlayerModal] Insert data:', JSON.stringify(insertData, null, 2));
        
        // Insert the membership payment record
        const { data, error } = await supabase.from('membership_payments')
          .insert(insertData)
          .select();
        
        if (error) {
          console.error('[AddPlayerModal] Error inserting membership payment:', error);
          Alert.alert('Warning', `Player will be saved but membership history failed: ${error.message}`);
        } else {
          console.log('[AddPlayerModal] ✅ Membership payment record created:', data);
        }
      }
      
      onAdd(pendingSave);
      console.log('[AddPlayerModal] Player data sent for creation');
      resetForm();
    } catch (error) {
      console.error('[AddPlayerModal] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save player. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setPendingSave(null);
      setSelectedMembershipType('full');
      setSelectedPaymentMethod('cash');
    }
  };

  const resetForm = () => {
    setMembershipType('active');
    setMembershipLevel('full');
    setGender(null);
    setFullName('');
    setUsername('');
    setPin('');
    setAddress('');
    setCity('');
    setState('');
    setPhone('');
    setEmail('');
    setFlight(null);
    setRolexFlight(null);
    setCurrentHandicap('');
    setGhin('');
    setRolexPoints('');
    setProfilePhotoUri(null);
    setBoardMemberRoles([]);
    setShowAddToHistoryPrompt(false);
    setPendingSave(null);
    setSelectedMembershipType('full');
    setSelectedPaymentMethod('cash');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>{isEditMode ? 'Edit Player' : 'Add Player'}</Text>
                  <TouchableOpacity 
                    onPress={onClose}
                    style={styles.closeIconButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={20} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
                <View style={styles.section}>
                  <ProfilePhotoPicker
                    onPhotoPicked={setProfilePhotoUri}
                    currentPhotoUri={profilePhotoUri}
                  />
                </View>

                <View style={styles.section}>
                  <View style={styles.toggleGroup}>
                    <TouchableOpacity
                      style={[styles.toggleButton, membershipType === 'active' && styles.toggleButtonActive]}
                      onPress={() => setMembershipType('active')}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          membershipType === 'active' && styles.toggleButtonTextActive,
                        ]}
                      >
                        Active
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleButton, membershipType === 'in-active' && styles.toggleButtonActive]}
                      onPress={() => setMembershipType('in-active')}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          membershipType === 'in-active' && styles.toggleButtonTextActive,
                        ]}
                      >
                        In-active
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleButton, membershipType === 'guest' && styles.toggleButtonActive]}
                      onPress={() => setMembershipType('guest')}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          membershipType === 'guest' && styles.toggleButtonTextActive,
                        ]}
                      >
                        Guest
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {membershipType === 'active' && (
                  <View style={styles.section}>
                    <View style={styles.toggleGroup}>
                      <TouchableOpacity
                        style={[styles.toggleButton, membershipLevel === 'full' && styles.toggleButtonActive]}
                        onPress={() => setMembershipLevel('full')}
                      >
                        <Text
                          style={[
                            styles.toggleButtonText,
                            membershipLevel === 'full' && styles.toggleButtonTextActive,
                          ]}
                        >
                          Full Member
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggleButton, membershipLevel === 'basic' && styles.toggleButtonActive]}
                        onPress={() => setMembershipLevel('basic')}
                      >
                        <Text
                          style={[
                            styles.toggleButtonText,
                            membershipLevel === 'basic' && styles.toggleButtonTextActive,
                          ]}
                        >
                          Basic Member
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <View style={styles.toggleGroup}>
                    <TouchableOpacity
                      style={[styles.toggleButton, gender === 'male' && styles.toggleButtonActive]}
                      onPress={() => setGender('male')}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          gender === 'male' && styles.toggleButtonTextActive,
                        ]}
                      >
                        Male
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleButton, gender === 'female' && styles.toggleButtonActive]}
                      onPress={() => setGender('female')}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          gender === 'female' && styles.toggleButtonTextActive,
                        ]}
                      >
                        Female
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>PLAYER DETAILS</Text>

                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.inputHalf]}
                      placeholder="Full Name"
                      placeholderTextColor="#333"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.inputThird]}
                      placeholder="Username *"
                      placeholderTextColor="#333"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="words"
                    />
                    <TextInput
                      style={[styles.input, styles.inputThird]}
                      placeholder="PIN *"
                      placeholderTextColor="#333"
                      value={pin}
                      onChangeText={setPin}
                      maxLength={4}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.inputHalf]}
                      placeholder="Address"
                      placeholderTextColor="#333"
                      value={address}
                      onChangeText={setAddress}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.inputThird]}
                      placeholder="City"
                      placeholderTextColor="#333"
                      value={city}
                      onChangeText={setCity}
                      autoCapitalize="words"
                    />
                    <TextInput
                      style={[styles.input, styles.inputSmall]}
                      placeholder="State"
                      placeholderTextColor="#333"
                      value={state}
                      onChangeText={setState}
                      maxLength={2}
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.inputHalf]}
                      placeholder="Email Address"
                      placeholderTextColor="#333"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.inputHalf]}
                      placeholder="Phone Number"
                      placeholderTextColor="#333"
                      value={phone}
                      onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>FLIGHT & HANDICAP</Text>

                  <View style={styles.handicapRow}>
                    <View style={styles.flightCard}>
                      <Text style={styles.flightCardTitle}>Tournament Flight</Text>
                      <View style={styles.circleButtonGroup}>
                        {(['A', 'B', 'C', 'L'] as const).map((letter) => (
                          <TouchableOpacity
                            key={letter}
                            style={[
                              styles.circleButton,
                              flight === letter && styles.circleButtonActive,
                            ]}
                            onPress={() => setFlight(letter)}
                          >
                            <Text
                              style={[
                                styles.circleButtonText,
                                flight === letter && styles.circleButtonTextActive,
                              ]}
                            >
                              {letter}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.flightCard}>
                      <Text style={styles.flightCardTitle}>Rolex Flight</Text>
                      <View style={styles.circleButtonGroup}>
                        {(['A', 'B'] as const).map((letter) => (
                          <TouchableOpacity
                            key={letter}
                            style={[
                              styles.circleButton,
                              rolexFlight === letter && styles.circleButtonActive,
                            ]}
                            onPress={() => setRolexFlight(letter)}
                          >
                            <Text
                              style={[
                                styles.circleButtonText,
                                rolexFlight === letter && styles.circleButtonTextActive,
                              ]}
                            >
                              {letter}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={styles.labeledInputRow}>
                    <View style={styles.labeledInputGroup}>
                      <Text style={styles.inputLabel}>Current Handicap</Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999"
                        value={currentHandicap}
                        onChangeText={setCurrentHandicap}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.labeledInputRow}>
                    <View style={styles.labeledInputGroup}>
                      <Text style={styles.inputLabel}>GHIN#</Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999"
                        value={ghin}
                        onChangeText={setGhin}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.labeledInputGroup}>
                      <Text style={styles.inputLabel}>Rolex Points</Text>
                      <TextInput
                        style={styles.input}
                        placeholderTextColor="#999"
                        value={rolexPoints}
                        onChangeText={setRolexPoints}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                {currentUser?.isAdmin && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>BOARD MEMBER ROLES (Admin Only)</Text>
                    <View style={styles.rolesContainer}>
                      {BOARD_MEMBER_ROLES.map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleChip,
                            boardMemberRoles.includes(role) && styles.roleChipActive,
                          ]}
                          onPress={() => {
                            setBoardMemberRoles((prev) =>
                              prev.includes(role)
                                ? prev.filter((r) => r !== role)
                                : [...prev, role]
                            );
                          }}
                        >
                          <Text
                            style={[
                              styles.roleChipText,
                              boardMemberRoles.includes(role) && styles.roleChipTextActive,
                            ]}
                          >
                            {role}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.addButton, styles.buttonRowButton]}
                  onPress={handleAddPlayer}
                >
                  <Text style={styles.addButtonText}>{isEditMode ? 'Update Player' : 'Add Player'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.closeButton, styles.buttonRowButton]}
                  onPress={onClose}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      <Modal visible={showAddToHistoryPrompt} transparent animationType="fade">
        <View style={styles.promptOverlay}>
          <View style={styles.promptContainer}>
            <View style={styles.promptIconContainer}>
              <FileText size={32} color="#4CAF50" />
            </View>
            <Text style={styles.promptTitle}>Add to Member History?</Text>
            <Text style={styles.promptMessage}>
              You are adding a new active member. Would you like to add this membership to their historical records?
            </Text>
            
            <Text style={styles.membershipTypeLabel}>Membership Type:</Text>
            <View style={styles.membershipTypeGroup}>
              <TouchableOpacity
                style={[
                  styles.membershipTypeButton,
                  selectedMembershipType === 'full' && styles.membershipTypeButtonActive,
                ]}
                onPress={() => setSelectedMembershipType('full')}
              >
                <Text style={[
                  styles.membershipTypeButtonText,
                  selectedMembershipType === 'full' && styles.membershipTypeButtonTextActive,
                ]}>
                  Full Member
                </Text>
                <Text style={[
                  styles.membershipTypePrice,
                  selectedMembershipType === 'full' && styles.membershipTypePriceActive,
                ]}>
                  ${orgInfo.fullMembershipPrice || '0'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.membershipTypeButton,
                  selectedMembershipType === 'basic' && styles.membershipTypeButtonActive,
                ]}
                onPress={() => setSelectedMembershipType('basic')}
              >
                <Text style={[
                  styles.membershipTypeButtonText,
                  selectedMembershipType === 'basic' && styles.membershipTypeButtonTextActive,
                ]}>
                  Basic Member
                </Text>
                <Text style={[
                  styles.membershipTypePrice,
                  selectedMembershipType === 'basic' && styles.membershipTypePriceActive,
                ]}>
                  ${orgInfo.basicMembershipPrice || '0'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.membershipTypeLabel}>Payment Method:</Text>
            <View style={styles.paymentMethodGroup}>
              {(['cash', 'check', 'zelle', 'venmo', 'paypal'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === method && styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => setSelectedPaymentMethod(method)}
                >
                  <Text style={[
                    styles.paymentMethodButtonText,
                    selectedPaymentMethod === method && styles.paymentMethodButtonTextActive,
                  ]}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {selectedPaymentMethod === 'paypal' && (
              <View style={styles.paypalFeeNote}>
                <Text style={styles.paypalFeeNoteText}>
                  PayPal fee (3% + $0.30) added. Total charged: ${getDisplayAmount()}
                </Text>
              </View>
            )}
            
            <View style={styles.totalAmountContainer}>
              <Text style={styles.totalAmountLabel}>Amount to Record:</Text>
              <Text style={styles.totalAmountValue}>${getDisplayAmount()}</Text>
            </View>
            
            <View style={styles.promptButtons}>
              <TouchableOpacity
                style={[styles.promptButton, styles.promptButtonSecondary]}
                onPress={() => handleAddToHistoryConfirm(false)}
                disabled={loading}
              >
                <Text style={styles.promptButtonSecondaryText}>No, Just Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.promptButton, styles.promptButtonPrimary]}
                onPress={() => handleAddToHistoryConfirm(true)}
                disabled={loading}
              >
                <Text style={styles.promptButtonPrimaryText}>Yes, Add to History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    maxHeight: '70%',
    alignSelf: 'center',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  toggleGroup: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  inputHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputThird: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputSmall: {
    flex: 0.6,
    marginHorizontal: 4,
  },
  handicapRow: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  flightCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginHorizontal: 6,
  },
  flightCardTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  circleButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: -4,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  circleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  circleButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#666',
  },
  circleButtonTextActive: {
    color: '#fff',
  },
  labeledInputRow: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  labeledInputGroup: {
    flex: 1,
    marginHorizontal: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  buttonRowButton: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  closeButton: {
    backgroundColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    width: '48%',
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
  },
  roleChipTextActive: {
    color: '#fff',
  },
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promptContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  promptIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  promptMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  promptButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  promptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  promptButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  promptButtonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  promptButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center' as const,
  },
  promptButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  membershipTypeLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  membershipTypeGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  membershipTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  membershipTypeButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  membershipTypeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 4,
  },
  membershipTypeButtonTextActive: {
    color: '#2E7D32',
  },
  membershipTypePrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#999',
  },
  membershipTypePriceActive: {
    color: '#4CAF50',
  },
  paymentMethodGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  paymentMethodButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  paymentMethodButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  paymentMethodButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
  },
  paymentMethodButtonTextActive: {
    color: '#2E7D32',
  },
  paypalFeeNote: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  paypalFeeNoteText: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
  },
  totalAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    width: '100%',
  },
  totalAmountLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2E7D32',
  },
  totalAmountValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#4CAF50',
  },
});
