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
import { X } from 'lucide-react-native';
import { ProfilePhotoPicker } from './ProfilePhotoPicker';
import { Member } from '@/types';
import { formatPhoneNumber, getPhoneDigits } from '@/utils/phoneFormatter';
import { useAuth } from '@/contexts/AuthContext';

interface AddPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (player: Partial<Member>) => void;
  editingMember?: Member | null;
}

const BOARD_MEMBER_ROLES = [
  'Admin',
  'President',
  'VP',
  'Tournament Director',
  'Handicap Director',
  'Operations',
  'Financer',
  'Member Relations',
] as const;

export function AddPlayerModal({ visible, onClose, onAdd, editingMember }: AddPlayerModalProps) {
  const { currentUser } = useAuth();
  const isEditMode = !!editingMember;
  const [membershipType, setMembershipType] = useState<'active' | 'in-active' | 'guest'>('active');
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

  useEffect(() => {
    if (editingMember && visible) {
      setMembershipType(editingMember.membershipType || 'active');
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

    onAdd(player);
    if (!isEditMode) {
      resetForm();
    }
  };

  const resetForm = () => {
    setMembershipType('active');
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
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
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

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
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
              </ScrollView>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  scrollView: {},
  scrollContent: {
    padding: 20,
    paddingTop: 16,
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
    padding: 20,
    paddingTop: 16,
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
    marginHorizontal: -4,
    marginVertical: -4,
  },
  roleChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    margin: 4,
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
});
