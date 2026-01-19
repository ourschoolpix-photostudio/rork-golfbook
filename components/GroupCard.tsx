import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import ScoringModal from '@/components/ScoringModal';
import ScorecardVerificationModal from '@/components/ScorecardVerificationModal';
import ScorecardPhotosModal from '@/components/ScorecardPhotosModal';
import { calculateTournamentFlight, getDisplayHandicap, hasAdjustedHandicap, isUsingCourseHandicap } from '@/utils/handicapHelper';
import type { Event, Member } from '@/types';
import { truncateToTwoDecimals } from '@/utils/numberUtils';
import { canVerifyScorecard } from '@/utils/rolePermissions';

interface GroupCardProps {
  groupNumber: number;
  label: string;
  playerCount: number;
  slots: (any | null)[];
  selectedCount: number;
  onAddPlayers: () => void;
  onRemovePlayer?: (slotIndex: number) => void;
  onUpdateScores?: (slots: any[]) => void;
  onUpdateMember?: (member: any) => void;
  eventId?: string;
  numberOfDays?: number;
  checkedPlayers?: { groupIdx: number; slotIdx: number; player: any }[];
  onPlayerCheckboxChange?: (groupIdx: number, slotIdx: number, checked: boolean) => void;
  onAddCheckedPlayerToSlot?: (groupIdx: number, slotIdx: number) => void;
  groupIdx?: number;
  isAdmin?: boolean;
  checkedGroups?: Set<number>;
  onGroupCheckboxChange?: (groupIdx: number, checked: boolean) => void;
  triggerGroupRefresh?: () => void;
  activeDay?: number;
  event?: Event;
  registrations?: Record<string, any>;
  useCourseHandicap?: boolean;
  currentMember?: Member | null;
}

function GroupCard({ 
  groupNumber, 
  label, 
  playerCount, 
  slots, 
  selectedCount, 
  onAddPlayers, 
  onRemovePlayer, 
  onUpdateScores, 
  onUpdateMember, 
  eventId, 
  numberOfDays = 1, 
  checkedPlayers = [], 
  onPlayerCheckboxChange, 
  onAddCheckedPlayerToSlot, 
  groupIdx = 0, 
  isAdmin = false, 
  checkedGroups = new Set(), 
  onGroupCheckboxChange, 
  triggerGroupRefresh,
  activeDay = 1,
  event,
  registrations = {},
  useCourseHandicap = false,
  currentMember = null
}: GroupCardProps) {
  const anyChecked = checkedPlayers.length > 0;
  const hasEmptySlot = slots.some(slot => slot === null);
  const showAddButton = isAdmin && hasEmptySlot && !anyChecked;

  const isSlotChecked = (slotIdx: number) => {
    return checkedPlayers.some(cp => cp.groupIdx === groupIdx && cp.slotIdx === slotIdx);
  };

  const [scoringModalVisible, setScoringModalVisible] = useState(false);
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [photosModalVisible, setPhotosModalVisible] = useState(false);

  const handleOpenHandicapEdit = (player: any) => {
    console.log('Open handicap edit for', player.name);
  };

  const handleOpenScoringModal = () => {
    if (isAdmin) {
      setScoringModalVisible(true);
      console.log('[GroupCard] Opening scoring modal for group', groupNumber);
    }
  };

  const handleSaveScores = async (scores: { [playerId: string]: { scoreTotal: number } }) => {
    console.log('[GroupCard] 💾 Scores saved from modal:', scores);
    
    // Immediately update the local slots with the new scores
    const updatedSlots = slots.map(slot => {
      if (!slot || !slot.id) return slot;
      if (scores[slot.id]) {
        return { ...slot, scoreTotal: scores[slot.id].scoreTotal };
      }
      return slot;
    });
    
    // Update parent component's state
    if (onUpdateScores) {
      onUpdateScores(updatedSlots);
    }
    
    // Trigger a full refresh to ensure all components are in sync
    if (triggerGroupRefresh) {
      console.log('[GroupCard] 🔄 Triggering group refresh after score save');
      triggerGroupRefresh();
    }
  };

  return (
    <>
    <View style={styles.groupCard}>
      <View style={styles.holeLabelContainer}>
        {isAdmin && (
          <TouchableOpacity onPress={() => onGroupCheckboxChange?.(groupIdx, !checkedGroups.has(groupIdx))} style={styles.checkboxContainer}>
            <Ionicons name={checkedGroups.has(groupIdx) ? 'checkbox' : 'square-outline'} size={24} color="#1B5E20" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleOpenScoringModal}>
          <Text style={styles.holeLabel}>{label} • {playerCount} players</Text>
        </TouchableOpacity>
        {canVerifyScorecard(currentMember) && playerCount > 0 && (
          <>
            <TouchableOpacity 
              style={styles.viewPhotosButton} 
              onPress={() => setPhotosModalVisible(true)}
            >
              <ImageIcon size={14} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.verifyButton} 
              onPress={() => setVerificationModalVisible(true)}
            >
              <Camera size={14} color="#fff" />
              <Text style={styles.verifyButtonText}>VERIFY</Text>
            </TouchableOpacity>
          </>
        )}
        {showAddButton && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPlayers}>
            <Text style={styles.addButtonText}>ADD</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cartsContainer}>
        <View style={{ flex: 1, marginRight: 1 }}>
          <View style={styles.cart}>
            <Text style={styles.cartLabel}>CART 1</Text>
          </View>
          {slots[0] ? (
            <TouchableOpacity style={styles.playerCard} onPress={() => isAdmin && handleOpenHandicapEdit(slots[0])} activeOpacity={isAdmin ? 0.7 : 1}>
              <View style={styles.headerRow}>
                {isAdmin && (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      onPlayerCheckboxChange?.(groupIdx, 0, !isSlotChecked(0));
                    }}
                    style={styles.playerCheckbox}
                  >
                    <Ionicons name={isSlotChecked(0) ? 'checkbox' : 'square-outline'} size={28} color="#1B5E20" />
                  </TouchableOpacity>
                )}
                <Text style={styles.netScoreHeader}>
                  {(() => {
                    const playerReg = registrations?.[slots[0].name];
                    const handicap = getDisplayHandicap(slots[0], playerReg, event, useCourseHandicap, activeDay);
                    if (slots[0].scoreTotal === undefined || slots[0].scoreTotal === null) {
                      return '0.00';
                    }
                    const scoreNet = slots[0].scoreTotal - handicap;
                    return truncateToTwoDecimals(scoreNet);
                  })()}
                </Text>
                {isAdmin && (
                  <TouchableOpacity 
                    style={styles.removeBtnHeader}
                    onPress={(e) => {
                      e.stopPropagation();
                      onRemovePlayer?.(0);
                    }}
                  >
                    <Ionicons name="close-circle" size={28} color="#d32f2f" />
                  </TouchableOpacity>
                )}
              </View>
                <View style={styles.playerNameRow}>
                  <Text style={styles.playerName}>{slots[0].name}</Text>
                </View>
                <View style={styles.scoresRow}>
                  <Text style={styles.scoreTotalItem}>Total: {slots[0].scoreTotal ?? 0}</Text>
                  <Text style={styles.scoreItem}>{(() => {
                    const playerReg = registrations?.[slots[0].name];
                    const handicap = getDisplayHandicap(slots[0], playerReg, event, useCourseHandicap, activeDay);
                    const isAdjusted = hasAdjustedHandicap(slots[0], playerReg);
                    const isCourse = isUsingCourseHandicap(useCourseHandicap, event, activeDay);
                    const label = isAdjusted ? 'ADJH:' : isCourse ? 'CRSE:' : 'HDC:';
                    return `${label} ${handicap}`;
                  })()}</Text>
                </View>
                <View style={styles.flightRow}>
                  <Text style={styles.flightText}>Flight: {event ? calculateTournamentFlight(slots[0], Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, registrations[slots[0].name], event, useCourseHandicap, activeDay) : (slots[0].flight || 'N/A')}</Text>
                </View>
            </TouchableOpacity>
          ) : anyChecked ? (
            <TouchableOpacity 
              style={styles.emptyCard}
              onPress={() => onAddCheckedPlayerToSlot?.(groupIdx, 0)}
            >
              <Text style={styles.addButtonEmptyText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Empty</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.cart}>
            <Text style={styles.cartLabel}>CART 2</Text>
          </View>
          {slots[2] ? (
            <TouchableOpacity style={styles.playerCard} onPress={() => isAdmin && handleOpenHandicapEdit(slots[2])} activeOpacity={isAdmin ? 0.7 : 1}>
              <View style={styles.headerRow}>
                {isAdmin && (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      onPlayerCheckboxChange?.(groupIdx, 2, !isSlotChecked(2));
                    }}
                    style={styles.playerCheckbox}
                  >
                    <Ionicons name={isSlotChecked(2) ? 'checkbox' : 'square-outline'} size={28} color="#1B5E20" />
                  </TouchableOpacity>
                )}
                <Text style={styles.netScoreHeader}>
                  {(() => {
                    const playerReg = registrations?.[slots[2].name];
                    const handicap = getDisplayHandicap(slots[2], playerReg, event, useCourseHandicap, activeDay);
                    if (slots[2].scoreTotal === undefined || slots[2].scoreTotal === null) {
                      return '0.00';
                    }
                    const scoreNet = slots[2].scoreTotal - handicap;
                    return truncateToTwoDecimals(scoreNet);
                  })()}
                </Text>
                {isAdmin && (
                  <TouchableOpacity 
                    style={styles.removeBtnHeader}
                    onPress={(e) => {
                      e.stopPropagation();
                      onRemovePlayer?.(2);
                    }}
                  >
                    <Ionicons name="close-circle" size={28} color="#d32f2f" />
                  </TouchableOpacity>
                )}
              </View>
                <View style={styles.playerNameRow}>
                  <Text style={styles.playerName}>{slots[2].name}</Text>
                </View>
                <View style={styles.scoresRow}>
                  <Text style={styles.scoreTotalItem}>Total: {slots[2].scoreTotal ?? 0}</Text>
                  <Text style={styles.scoreItem}>{(() => {
                    const playerReg = registrations?.[slots[2].name];
                    const handicap = getDisplayHandicap(slots[2], playerReg, event, useCourseHandicap, activeDay);
                    const isAdjusted = hasAdjustedHandicap(slots[2], playerReg);
                    const isCourse = isUsingCourseHandicap(useCourseHandicap, event, activeDay);
                    const label = isAdjusted ? 'ADJH:' : isCourse ? 'CRSE:' : 'HDC:';
                    return `${label} ${handicap}`;
                  })()}</Text>
                </View>
                <View style={styles.flightRow}>
                  <Text style={styles.flightText}>Flight: {event ? calculateTournamentFlight(slots[2], Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, registrations[slots[2].name], event, useCourseHandicap, activeDay) : (slots[2].flight || 'N/A')}</Text>
                </View>
            </TouchableOpacity>
          ) : anyChecked ? (
            <TouchableOpacity 
              style={styles.emptyCard}
              onPress={() => onAddCheckedPlayerToSlot?.(groupIdx, 2)}
            >
              <Text style={styles.addButtonEmptyText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Empty</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cartsContainer}>
        <View style={{ flex: 1, marginRight: 1 }}>
          {slots[1] && slots[1].name !== 'F9' && slots[1].name !== 'B9' ? (
            <TouchableOpacity style={styles.playerCard} onPress={() => isAdmin && handleOpenHandicapEdit(slots[1])} activeOpacity={isAdmin ? 0.7 : 1}>
              <View style={styles.headerRow}>
                {isAdmin && (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      onPlayerCheckboxChange?.(groupIdx, 1, !isSlotChecked(1));
                    }}
                    style={styles.playerCheckbox}
                  >
                    <Ionicons name={isSlotChecked(1) ? 'checkbox' : 'square-outline'} size={28} color="#1B5E20" />
                  </TouchableOpacity>
                )}
                <Text style={styles.netScoreHeader}>
                  {(() => {
                    const playerReg = registrations?.[slots[1].name];
                    const handicap = getDisplayHandicap(slots[1], playerReg, event, useCourseHandicap, activeDay);
                    if (slots[1].scoreTotal === undefined || slots[1].scoreTotal === null) {
                      return '0.00';
                    }
                    const scoreNet = slots[1].scoreTotal - handicap;
                    return truncateToTwoDecimals(scoreNet);
                  })()}
                </Text>
                {isAdmin && (
                  <TouchableOpacity 
                    style={styles.removeBtnHeader}
                    onPress={(e) => {
                      e.stopPropagation();
                      onRemovePlayer?.(1);
                    }}
                  >
                    <Ionicons name="close-circle" size={28} color="#d32f2f" />
                  </TouchableOpacity>
                )}
              </View>
                <View style={styles.playerNameRow}>
                  <Text style={styles.playerName}>{slots[1].name}</Text>
                </View>
                <View style={styles.scoresRow}>
                  <Text style={styles.scoreTotalItem}>Total: {slots[1].scoreTotal ?? 0}</Text>
                  <Text style={styles.scoreItem}>{(() => {
                    const playerReg = registrations?.[slots[1].name];
                    const handicap = getDisplayHandicap(slots[1], playerReg, event, useCourseHandicap, activeDay);
                    const isAdjusted = hasAdjustedHandicap(slots[1], playerReg);
                    const isCourse = isUsingCourseHandicap(useCourseHandicap, event, activeDay);
                    const label = isAdjusted ? 'ADJH:' : isCourse ? 'CRSE:' : 'HDC:';
                    return `${label} ${handicap}`;
                  })()}</Text>
                </View>
                <View style={styles.flightRow}>
                  <Text style={styles.flightText}>Flight: {event ? calculateTournamentFlight(slots[1], Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, registrations[slots[1].name], event, useCourseHandicap, activeDay) : (slots[1].flight || 'N/A')}</Text>
                </View>
            </TouchableOpacity>
          ) : anyChecked ? (
            <TouchableOpacity 
              style={styles.emptyCard}
              onPress={() => onAddCheckedPlayerToSlot?.(groupIdx, 1)}
            >
              <Text style={styles.addButtonEmptyText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Empty</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          {slots[3] && slots[3].name !== 'F9' && slots[3].name !== 'B9' ? (
            <TouchableOpacity style={styles.playerCard} onPress={() => isAdmin && handleOpenHandicapEdit(slots[3])} activeOpacity={isAdmin ? 0.7 : 1}>
              <View style={styles.headerRow}>
                {isAdmin && (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      onPlayerCheckboxChange?.(groupIdx, 3, !isSlotChecked(3));
                    }}
                    style={styles.playerCheckbox}
                  >
                    <Ionicons name={isSlotChecked(3) ? 'checkbox' : 'square-outline'} size={28} color="#1B5E20" />
                  </TouchableOpacity>
                )}
                <Text style={styles.netScoreHeader}>
                  {(() => {
                    const playerReg = registrations?.[slots[3].name];
                    const handicap = getDisplayHandicap(slots[3], playerReg, event, useCourseHandicap, activeDay);
                    if (slots[3].scoreTotal === undefined || slots[3].scoreTotal === null) {
                      return '0.00';
                    }
                    const scoreNet = slots[3].scoreTotal - handicap;
                    return truncateToTwoDecimals(scoreNet);
                  })()}
                </Text>
                {isAdmin && (
                  <TouchableOpacity 
                    style={styles.removeBtnHeader}
                    onPress={(e) => {
                      e.stopPropagation();
                      onRemovePlayer?.(3);
                    }}
                  >
                    <Ionicons name="close-circle" size={28} color="#d32f2f" />
                  </TouchableOpacity>
                )}
              </View>
                <View style={styles.playerNameRow}>
                  <Text style={styles.playerName}>{slots[3].name}</Text>
                </View>
                <View style={styles.scoresRow}>
                  <Text style={styles.scoreTotalItem}>Total: {slots[3].scoreTotal ?? 0}</Text>
                  <Text style={styles.scoreItem}>{(() => {
                    const playerReg = registrations?.[slots[3].name];
                    const handicap = getDisplayHandicap(slots[3], playerReg, event, useCourseHandicap, activeDay);
                    const isAdjusted = hasAdjustedHandicap(slots[3], playerReg);
                    const isCourse = isUsingCourseHandicap(useCourseHandicap, event, activeDay);
                    const label = isAdjusted ? 'ADJH:' : isCourse ? 'CRSE:' : 'HDC:';
                    return `${label} ${handicap}`;
                  })()}</Text>
                </View>
                <View style={styles.flightRow}>
                  <Text style={styles.flightText}>Flight: {event ? calculateTournamentFlight(slots[3], Number(event?.flightACutoff) || undefined, Number(event?.flightBCutoff) || undefined, registrations[slots[3].name], event, useCourseHandicap, activeDay) : (slots[3].flight || 'N/A')}</Text>
                </View>
            </TouchableOpacity>
          ) : anyChecked ? (
            <TouchableOpacity 
              style={styles.emptyCard}
              onPress={() => onAddCheckedPlayerToSlot?.(groupIdx, 3)}
            >
              <Text style={styles.addButtonEmptyText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Empty</Text>
            </View>
          )}
        </View>
      </View>
    </View>

    <ScoringModal
      visible={scoringModalVisible}
      slots={slots}
      label={label}
      onClose={() => setScoringModalVisible(false)}
      onSaveScores={handleSaveScores}
      eventId={eventId}
      currentDay={activeDay}
      numberOfDays={numberOfDays}
      registrations={registrations}
    />

    <ScorecardVerificationModal
      visible={verificationModalVisible}
      onClose={() => setVerificationModalVisible(false)}
      players={slots.filter(s => s !== null && s.name !== 'F9' && s.name !== 'B9').map(s => ({
        id: s.id,
        name: s.name,
        scoreTotal: s.scoreTotal ?? 0,
      }))}
      groupLabel={label}
      eventId={eventId || ''}
      day={activeDay}
    />

    <ScorecardPhotosModal
      visible={photosModalVisible}
      onClose={() => setPhotosModalVisible(false)}
      eventId={eventId || ''}
      groupLabel={label}
    />
    </>
  );
}

const styles = StyleSheet.create({
  groupCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  holeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxContainer: {
    marginRight: 8,
  },
  holeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B5E20',
  },
  addButton: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  verifyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 'auto',
    marginRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  verifyButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  viewPhotosButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 'auto',
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCard: {
    backgroundColor: '#D0D0D0',
    borderRadius: 6,
    marginTop: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 100,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerCheckbox: {
    padding: 2,
  },
  removeBtnHeader: {
    padding: 2,
  },
  netScoreHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d32f2f',
    flex: 1,
    textAlign: 'center',
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreItem: {
    fontSize: 11,
    fontWeight: '500',
    color: '#000',
  },
  scoreTotalItem: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  flightRow: {
    marginTop: 4,
  },
  flightText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#000',
  },
  cartsContainer: {
    flexDirection: 'row',
    marginBottom: 1,
    gap: 2,
  },
  cart: {
    backgroundColor: '#424242',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  cartLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  emptyCard: {
    backgroundColor: '#D0D0D0',
    borderRadius: 6,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  addButtonEmptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9800',
  },
  emptyCardText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ccc',
  },
});

export default GroupCard;
