import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Member, Event } from '@/types';
import { Registration } from '@/utils/registrationService';

interface EventPlayerModalProps {
  visible: boolean;
  player: Member | null;
  registration: Registration | null;
  tournamentFlight: string;
  event: Event | null;
  onClose: () => void;
  onSave: (player: Member, adjustedHandicap: string | null | undefined, numberOfGuests?: number, guestNames?: string, isSponsor?: boolean) => Promise<void>;
}

export function EventPlayerModal({
  visible,
  player,
  registration,
  tournamentFlight,
  event,
  onClose,
  onSave,
}: EventPlayerModalProps) {
  const [currentHandicap, setCurrentHandicap] = useState('');
  const [adjustedHandicap, setAdjustedHandicap] = useState('');
  const [membershipType, setMembershipType] = useState<'active' | 'in-active' | 'guest'>('active');
  const [numberOfGuests, setNumberOfGuests] = useState('');
  const [guestNames, setGuestNames] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSponsor, setIsSponsor] = useState(false);

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

  const handleSave = async () => {
    try {
      setIsSaving(true);
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
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modal}>
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
                onPress={() => setMembershipType('active')}
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
                onPress={() => setMembershipType('in-active')}
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
                onPress={() => setMembershipType('guest')}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
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
});
