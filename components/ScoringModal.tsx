import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveAdminScoresForDay, getAdminScoresForDay, getScoresForDay } from '@/utils/scorePeristence';
import { getDisplayHandicap } from '@/utils/handicapHelper';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineMode } from '@/contexts/OfflineModeContext';
import { supabaseService } from '@/utils/supabaseService';

interface ScoringModalProps {
  visible: boolean;
  slots: (any | null)[];
  label: string;
  onClose: () => void;
  onSaveScores: (scores: { [playerId: string]: { scoreTotal: number } }) => Promise<void>;
  eventId?: string;
  currentDay?: number;
  numberOfDays?: number;
  registrations?: Record<string, any>;
}

export default function ScoringModal({ visible, slots, label, onClose, onSaveScores, eventId, currentDay = 1, numberOfDays = 1, registrations = {} }: ScoringModalProps) {

  const [scores, setScores] = useState<{ [key: number]: string }>({});
  const [selectedDay, setSelectedDay] = useState<number>(currentDay);
  const [savedDayScores, setSavedDayScores] = useState<{ [playerId: string]: number }>({});
  
  const { currentUser } = useAuth();
  const { shouldUseOfflineMode, addPendingOperation, isOfflineMode } = useOfflineMode();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible && eventId) {
      setSelectedDay(currentDay);
      setScores({});
      console.log('[ScoringModal] 📤 MODAL OPENED - slots:', slots.map(s => ({ name: s?.name, id: s?.id })));
    }
  }, [visible, eventId, currentDay]);

  const loadSelectedDayScores = async () => {
    if (!eventId) return;
    try {
      const adminParsed = await getAdminScoresForDay(eventId, selectedDay);
      const playerParsed = await getScoresForDay(eventId, selectedDay);
      
      const dayScores: { [playerId: string]: number } = {};
      const inputScores: { [key: number]: string } = {};
      const playerToSlot: { [playerId: string]: number } = {};
      slots.forEach((player, idx) => {
        if (player && player.id) {
          playerToSlot[player.id] = idx;
        }
      });

      Object.entries(adminParsed).forEach(([playerId, data]: [string, any]) => {
        dayScores[playerId] = data.scoreTotal;
        const slotIdx = playerToSlot[playerId];
        if (slotIdx !== undefined) {
          inputScores[slotIdx] = String(data.scoreTotal);
        }
        console.log(`[ScoringModal] 🔑 Loaded ADMIN score for ${playerId}: ${data.scoreTotal}`);
      });
      
      Object.entries(playerParsed).forEach(([playerId, data]: [string, any]) => {
        if (adminParsed[playerId]) {
          console.log(`[ScoringModal] ⏭️ Skipping player score for ${playerId} (admin score exists)`);
          return;
        }
        dayScores[playerId] = data.scoreTotal;
        const slotIdx = playerToSlot[playerId];
        if (slotIdx !== undefined) {
          inputScores[slotIdx] = String(data.scoreTotal);
        }
        console.log(`[ScoringModal] 📦 Loaded player score for ${playerId}: ${data.scoreTotal}`);
      });

      setSavedDayScores(dayScores);
      setScores(inputScores);
      console.log(`[ScoringModal] ✅ Loaded and populated scores for Day ${selectedDay}:`, inputScores);
    } catch (error) {
      console.error('[ScoringModal] Error loading day scores:', error);
      setSavedDayScores({});
      setScores({});
    }
  };

  useEffect(() => {
    if (visible && eventId) {
      console.log(`[ScoringModal] 🔄 Day changed to ${selectedDay} - clearing inputs and loading saved scores`);
      setScores({});
      (async () => {
        await loadSelectedDayScores();
      })();
    }
  }, [visible, eventId, selectedDay]);

  const players = [
    { index: 0, label: 'CART 1 - Driver' },
    { index: 1, label: 'CART 1 - Passenger' },
    { index: 2, label: 'CART 2 - Driver' },
    { index: 3, label: 'CART 2 - Passenger' },
  ];

  const handleScoreChange = (index: number, value: string) => {
    setScores({ ...scores, [index]: value });
  };

  const handleSave = async () => {
    console.log('[ScoringModal] 🔴 SAVE BUTTON PRESSED');
    console.log('[ScoringModal] slots:', slots.map(s => ({ name: s?.name, id: s?.id })));
    const updatedScores: { [playerId: string]: { scoreTotal: number } } = {};

    players.forEach(({ index }) => {
      const player = slots[index];
      if (player && player.id) {
        const inputValue = scores[index] || '0';
        const scoreTotal = parseInt(inputValue, 10);
        if (!isNaN(scoreTotal)) {
          updatedScores[player.id] = { scoreTotal };
          console.log(`[ScoringModal] ✅ ${player.name} (ID: ${player.id}) = ${scoreTotal}`);
        }
      }
    });

    if (Object.keys(updatedScores).length === 0) {
      console.log('[ScoringModal] ❌ NO VALID SCORES - not saving');
      alert('ERROR: No players have IDs! updatedScores is empty. Check player.id');
      onClose();
      return;
    }

    console.log('[ScoringModal] 🟡 Saving', Object.keys(updatedScores).length, 'scores:', updatedScores);

    try {
      console.log(`[ScoringModal] 🔵 STEP 1: Saving to AsyncStorage as ADMIN scores...`);
      console.log('[ScoringModal] eventId:', eventId, 'selectedDay (state):', selectedDay);

      if (eventId) {
        await saveAdminScoresForDay(eventId, selectedDay, updatedScores);
        console.log(`[ScoringModal] ✅ VERIFIED - Saved using saveAdminScoresForDay (TAKES PRECEDENCE)`);
      }

      console.log(`[ScoringModal] 🔵 STEP 2: Saving to backend database...`);
      if (eventId && currentUser) {
        if (shouldUseOfflineMode) {
          console.log(`[ScoringModal] 🟠 Offline mode active - queuing score submissions`);
          for (const [playerId, scoreData] of Object.entries(updatedScores)) {
            const holesArray = Array(18).fill(null);
            await addPendingOperation({
              type: 'score_submit',
              data: {
                eventId,
                memberId: playerId,
                day: selectedDay,
                holes: holesArray,
                totalScore: scoreData.scoreTotal,
                submittedBy: currentUser.id,
              },
              eventId,
            });
            console.log(`[ScoringModal] ✅ Queued score for offline sync - player ${playerId}:`, scoreData.scoreTotal);
          }
        } else {
          console.log(`[ScoringModal] 🟢 Online mode - submitting scores to backend`);
          setIsSubmitting(true);
          try {
            for (const [playerId, scoreData] of Object.entries(updatedScores)) {
              const holesArray = Array(18).fill(null);
              await supabaseService.scores.submit(
                eventId,
                playerId,
                selectedDay,
                holesArray,
                scoreData.scoreTotal,
                currentUser.id
              );
              console.log(`[ScoringModal] ✅ Saved score to backend for player ${playerId}:`, scoreData.scoreTotal);
            }
          } finally {
            setIsSubmitting(false);
          }
        }
      }

      console.log(`[ScoringModal] 🟢 STEP 3: Calling parent callback...`);
      await onSaveScores(updatedScores);
      console.log(`[ScoringModal] ✅ Parent callback completed`);

      setScores({});
      onClose();
    } catch (error) {
      console.error('[ScoringModal] ❌ Error during save:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
      console.error('[ScoringModal] ❌ Error details:', errorMessage);
      alert(`Error saving scores: ${errorMessage}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? -40 : 0}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Scoring - {label}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1B5E20" />
            </TouchableOpacity>
          </View>

          {numberOfDays > 1 && (
            <View style={styles.daySelector}>
              {Array.from({ length: numberOfDays }, (_, i) => i + 1).map(day => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayButton, selectedDay === day && styles.dayButtonActive]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayButtonText, selectedDay === day && styles.dayButtonTextActive]}>
                    Day {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView style={styles.playerList}>
            {players.map(({ index, label: cartLabel }) => {
              const player = slots[index];
              if (!player) return null;

              const playerReg = registrations[player.id] || player.registration;
              const handicap = getDisplayHandicap(player, playerReg);
              
              console.log(`[ScoringModal] 🎯 Player ${player.name}: base handicap=${player.handicap}, adjusted=${playerReg?.adjustedHandicap}, effective=${handicap}`);

              return (
                <View key={index} style={styles.playerRow}>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.cartLabel}>{cartLabel}</Text>
                    <Text style={styles.handicapInfo}>HDC: {handicap}</Text>
                  </View>

                  <View style={styles.scoreColumn}>
                    <Text style={styles.scoreLabel}>Total</Text>
                    <TextInput
                      style={styles.scoreInput}
                      placeholder="—"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      value={scores[index] || ''}
                      onChangeText={(text) => handleScoreChange(index, text)}
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>SAVE SCORES</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
  },
  daySelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#1B5E20',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#1B5E20',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B5E20',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  playerList: {
    maxHeight: 350,
  },
  playerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
    marginRight: 12,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cartLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  handicapInfo: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
  },
  scoreColumn: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  scoreInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
