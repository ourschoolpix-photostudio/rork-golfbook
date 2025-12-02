import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member } from '@/types';
import { ProfilePhotoPicker } from './ProfilePhotoPicker';
import { supabase } from '@/integrations/supabase/client';
import { formatPhoneNumber, getPhoneDigits } from '@/utils/phoneFormatter';
import { useAuth } from '@/contexts/AuthContext';

interface PlayerEditModalProps {
  visible: boolean;
  member: Member | null;
  onClose: () => void;
  onSave: (member: Member) => Promise<void>;
  isLimitedMode?: boolean;
  quickEditMode?: boolean;
  pinChangeMode?: boolean;
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

export function PlayerEditModal({ visible, member, onClose, onSave, isLimitedMode = false, quickEditMode = false, pinChangeMode = false }: PlayerEditModalProps) {
  const { currentUser } = useAuth();
  const [membershipType, setMembershipType] = useState<'active' | 'in-active' | 'guest'>('active');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [flight, setFlight] = useState<'A' | 'B' | 'C' | 'L' | null>(null);
  const [rolexFlight, setRolexFlight] = useState<'A' | 'B' | null>(null);
  const [currentHandicap, setCurrentHandicap] = useState('');
  const [ghin, setGhin] = useState('');
  const [rolexPoints, setRolexPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [boardMemberRoles, setBoardMemberRoles] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      if (member) {
        setMembershipType(member.membershipType || 'active');
        setGender(member.gender || null);
        setFullName(member.fullName || member.name || '');
        setUsername(member.username || '');
        setPin(member.pin || '');
        setAddress(member.address || '');
        setCity(member.city || '');
        setState(member.state || '');
        setPhone(formatPhoneNumber(member.phone || ''));
        setEmail(member.email || '');
        setFlight(member.flight || null);
        setRolexFlight(member.rolexFlight || null);
        setCurrentHandicap(member.currentHandicap || member.handicap?.toString() || '');
        setGhin(member.ghin || '');
        setRolexPoints(member.rolexPoints?.toString() || '');
        setProfilePhotoUri(member.profilePhotoUrl || null);
        setBoardMemberRoles(member.boardMemberRoles || []);
      } else {
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
      }
    }
  }, [member, visible]);

  const uploadProfilePhoto = async (photoUri: string) => {
    try {
      const filename = `profile-photos/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const response = await fetch(photoUri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { error } = await supabase.storage.from('event-photos').upload(filename, uint8Array, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(filename);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw error;
    }
  };

  const handleSavePlayer = async () => {
    if (!username.trim() || !pin.trim()) {
      Alert.alert('Error', 'Username and PIN are required');
      return;
    }

    if (!fullName.trim()) {
      Alert.alert('Error', 'Full Name is required');
      return;
    }

    if (pinChangeMode && pin === '1111') {
      Alert.alert('Error', 'You must change your PIN from the default value (1111)');
      return;
    }

    try {
      setLoading(true);
      let profilePhotoUrl = member?.profilePhotoUrl || '';

      if (profilePhotoUri && profilePhotoUri !== member?.profilePhotoUrl) {
        console.log('Uploading profile photo...');
        profilePhotoUrl = await uploadProfilePhoto(profilePhotoUri);
        console.log('Photo uploaded:', profilePhotoUrl);
      }

      const savedMember: Member = member ? {
        ...member,
        id: member.id,
        name: fullName,
        fullName,
        username,
        pin,
        address,
        city,
        state,
        phone: getPhoneDigits(phone),
        email,
        joinDate: member.joinDate,
        handicap: currentHandicap ? parseFloat(currentHandicap) : 0,
        currentHandicap: currentHandicap,
        membershipType,
        gender: gender || undefined,
        flight: flight || undefined,
        rolexFlight: rolexFlight || undefined,
        ghin,
        rolexPoints: rolexPoints ? parseInt(rolexPoints) : 0,
        profilePhotoUrl,
        boardMemberRoles: boardMemberRoles.length > 0 ? boardMemberRoles : undefined,
      } : {
        id: Date.now().toString(),
        name: fullName,
        fullName,
        username,
        pin,
        address,
        city,
        state,
        phone: getPhoneDigits(phone),
        email,
        joinDate: new Date().toISOString().split('T')[0],
        handicap: currentHandicap ? parseFloat(currentHandicap) : 0,
        currentHandicap: currentHandicap,
        membershipType,
        gender: gender || undefined,
        flight: flight || undefined,
        rolexFlight: rolexFlight || undefined,
        ghin,
        rolexPoints: rolexPoints ? parseInt(rolexPoints) : 0,
        profilePhotoUrl,
        boardMemberRoles: boardMemberRoles.length > 0 ? boardMemberRoles : undefined,
        dateOfBirth: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        isAdmin: false,
        createdAt: new Date().toISOString(),
      };

      console.log('Saving member:', savedMember.id, savedMember.name);
      await onSave(savedMember);
      console.log('Member saved successfully');
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save player';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerSaveButton, loading && styles.headerSaveButtonDisabled]}
            onPress={handleSavePlayer}
            disabled={loading}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.headerSaveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pinChangeMode ? 'Change PIN Required' : member ? member.name : 'Add New Player'}</Text>
          <TouchableOpacity 
            onPress={onClose} 
            disabled={loading}
            style={styles.closeIconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!quickEditMode && (
              <View style={styles.section}>
                <ProfilePhotoPicker 
                  onPhotoPicked={setProfilePhotoUri}
                  currentPhotoUri={profilePhotoUri}
                />
              </View>
            )}

            {quickEditMode && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>QUICK EDIT</Text>

                <View style={styles.card}>
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

                  <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Rolex Flight</Text>
                  <View style={styles.circleButtonGroup}>
                    {['A', 'B'].map((letter) => (
                      <TouchableOpacity
                        key={letter}
                        style={[
                          styles.circleButton,
                          rolexFlight === (letter as any) && styles.circleButtonActive,
                        ]}
                        onPress={() => setRolexFlight(letter as any)}
                      >
                        <Text
                          style={[
                            styles.circleButtonText,
                            rolexFlight === (letter as any) && styles.circleButtonTextActive,
                          ]}
                        >
                          {letter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={[styles.labeledInputRow, { marginTop: 20 }]}>
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
              </View>
            )}

            {!isLimitedMode && !quickEditMode && (
              <View style={styles.section}>
                <View style={styles.card}>
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

                  <View style={[styles.toggleGroup, styles.toggleGroupLast]}>
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
              </View>
            )}

            {pinChangeMode && (
              <View style={styles.section}>
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>⚠️ PIN Change Required</Text>
                  <Text style={styles.warningText}>
                    For security reasons, you must change your PIN from the default value (1111). You can update your username if desired, but changing the PIN is mandatory.
                  </Text>
                </View>
              </View>
            )}

            {!quickEditMode && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PLAYER DETAILS</Text>

              {isLimitedMode ? (
                <>
                  <View style={styles.card}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Full Name</Text>
                      <TextInput
                        style={[styles.input, styles.inputHalf]}
                        placeholder="Full Name"
                        placeholderTextColor="#999"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.row}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Username</Text>
                        <TextInput
                          style={[styles.input, styles.inputThird]}
                          placeholder="Username"
                          placeholderTextColor="#999"
                          value={username}
                          onChangeText={setUsername}
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>PIN</Text>
                        <TextInput
                          style={[styles.input, styles.inputThird]}
                          placeholder="PIN"
                          placeholderTextColor="#999"
                          value={pin}
                          onChangeText={setPin}
                          maxLength={4}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Address</Text>
                      <TextInput
                        style={[styles.input, styles.inputHalf]}
                        placeholder="Address"
                        placeholderTextColor="#999"
                        value={address}
                        onChangeText={setAddress}
                        autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.row}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>City</Text>
                        <TextInput
                          style={[styles.input, styles.inputThird]}
                          placeholder="City"
                          placeholderTextColor="#999"
                          value={city}
                          onChangeText={setCity}
                          autoCapitalize="words"
                        />
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>State</Text>
                        <TextInput
                          style={[styles.input, styles.inputSmall]}
                          placeholder="State"
                          placeholderTextColor="#999"
                          value={state}
                          onChangeText={setState}
                          maxLength={2}
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Email Address</Text>
                      <TextInput
                        style={[styles.input, styles.inputHalf]}
                        placeholder="Email Address"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Phone Number</Text>
                      <TextInput
                        style={[styles.input, styles.inputHalf]}
                        placeholder="Phone Number"
                        placeholderTextColor="#999"
                        value={phone}
                        onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>GHIN#</Text>
                      <TextInput
                        style={[styles.input, styles.inputHalf]}
                        placeholder="GHIN#"
                        placeholderTextColor="#999"
                        value={ghin}
                        onChangeText={setGhin}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.card}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Full Name</Text>
                      <TextInput
                        style={[styles.input, styles.inputHalf]}
                        placeholder="Full Name"
                        placeholderTextColor="#999"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.row}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Username</Text>
                        <TextInput
                          style={[styles.input, styles.inputThird]}
                          placeholder="Username"
                          placeholderTextColor="#999"
                          value={username}
                          onChangeText={setUsername}
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>PIN</Text>
                        <TextInput
                          style={[styles.input, styles.inputThird]}
                          placeholder="PIN"
                          placeholderTextColor="#999"
                          value={pin}
                          onChangeText={setPin}
                          maxLength={4}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Address</Text>
                      <TextInput
                        style={[styles.input, styles.inputHalf]}
                        placeholder="Address"
                        placeholderTextColor="#999"
                        value={address}
                        onChangeText={setAddress}
                        autoCapitalize="words"
                      />
                    </View>

                    <View style={styles.row}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>City</Text>
                        <TextInput
                          style={[styles.input, styles.inputThird]}
                          placeholder="City"
                          placeholderTextColor="#999"
                          value={city}
                          onChangeText={setCity}
                          autoCapitalize="words"
                        />
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>State</Text>
                        <TextInput
                          style={[styles.input, styles.inputSmall]}
                          placeholder="State"
                          placeholderTextColor="#999"
                          value={state}
                          onChangeText={setState}
                          maxLength={2}
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Email Address</Text>
                      <TextInput
                        style={[styles.input, styles.inputHalf]}
                        placeholder="Email Address"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Phone Number</Text>
                      <TextInput
                        style={[styles.input, styles.inputHalf]}
                        placeholder="Phone Number"
                        placeholderTextColor="#999"
                        value={phone}
                        onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
            )}

            {!isLimitedMode && !quickEditMode && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>FLIGHT & HANDICAP</Text>

              <View style={styles.card}>
              <View style={styles.handicapRow}>
                <View style={styles.flightCard}>
                  <Text style={styles.flightCardTitle}>Flight</Text>
                  <View style={styles.circleButtonGroup}>
                    {['A', 'B', 'C', 'L'].map((letter) => (
                      <TouchableOpacity
                        key={letter}
                        style={[
                          styles.circleButton,
                          flight === (letter as any) && styles.circleButtonActive,
                        ]}
                        onPress={() => setFlight(letter as any)}
                      >
                        <Text
                          style={[
                            styles.circleButtonText,
                            flight === (letter as any) && styles.circleButtonTextActive,
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
                    {['A', 'B'].map((letter) => (
                      <TouchableOpacity
                        key={letter}
                        style={[
                          styles.circleButton,
                          rolexFlight === (letter as any) && styles.circleButtonActive,
                        ]}
                        onPress={() => setRolexFlight(letter as any)}
                      >
                        <Text
                          style={[
                            styles.circleButtonText,
                            rolexFlight === (letter as any) && styles.circleButtonTextActive,
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
            </View>
            )}

            {!isLimitedMode && !quickEditMode && currentUser?.isAdmin && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>BOARD MEMBER ROLES (Admin Only)</Text>
                <View style={styles.card}>
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
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled, styles.buttonHalf]}
                onPress={handleSavePlayer}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : quickEditMode ? 'Save Changes' : isLimitedMode ? 'Save Profile' : 'Save Player'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.closeButton, loading && styles.saveButtonDisabled, styles.buttonHalf]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  headerSaveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  headerSaveButtonDisabled: {
    opacity: 0.6,
  },
  headerSaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
    gap: 8,
    marginBottom: 12,
  },
  toggleGroupLast: {
    marginBottom: 0,
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
    gap: 8,
    marginBottom: 8,
  },
  fieldGroup: {
    flex: 1,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 6,
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
  },
  inputThird: {
    flex: 1,
  },
  inputSmall: {
    flex: 0.6,
  },
  handicapRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  flightCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
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
    gap: 8,
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  circleButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#666',
  },
  circleButtonTextActive: {
    color: '#fff',
  },
  labeledInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  labeledInputGroup: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 6,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 24,
  },
  buttonHalf: {
    flex: 1,
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
  card: {
    backgroundColor: '#e8e8e8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
    minWidth: 110,
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
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
});
