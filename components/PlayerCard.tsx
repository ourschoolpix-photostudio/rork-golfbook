import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Trash2, Pencil, User } from 'lucide-react-native';
import { Member } from '@/types';
import { getTournamentHandicapDisplay } from '@/utils/tournamentHandicapHelper';
import { canViewTournamentHandicap } from '@/utils/rolePermissions';

interface PlayerCardProps {
  member: Member;
  isAdmin?: boolean;
  isCurrentUser?: boolean;
  currentUser?: Member | null;
  onPress?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onEditPress?: () => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onCheckboxPress?: () => void;
  onHistoryPress?: () => void;
}

export const PlayerCard = memo(function PlayerCard({
  member,
  isAdmin,
  isCurrentUser,
  currentUser,
  onPress,
  onDelete,
  onEdit,
  onEditPress,
  showCheckbox,
  isSelected,
  onCheckboxPress,
  onHistoryPress,
}: PlayerCardProps) {
  const canSeeTournamentHandicap = canViewTournamentHandicap(currentUser || null);
  const getMemberStatusText = (type: string) => {
    if (type === 'active' || type === 'active') return 'Active';
    if (type === 'in-active' || type === 'in-active') return 'In-Active';
    if (type === 'guest') return 'Guest';
    return type;
  };

  const getMemberStatusColor = (type: string) => {
    if (type === 'active' || type === 'active') return '#4CAF50';
    if (type === 'in-active' || type === 'in-active') return '#FF3B30';
    if (type === 'guest') return '#1a1a1a';
    return '#007AFF';
  };

  const getLocationBadge = () => {
    const localStates = ['', 'MD', 'VA', 'PA', 'NJ', 'DE'];
    const isLocal = localStates.includes(member.state || '');
    return isLocal ? 'Local' : 'Visitor';
  };

  const getLocationBadgeColor = () => {
    const localStates = ['', 'MD', 'VA', 'PA', 'NJ', 'DE'];
    const isLocal = localStates.includes(member.state || '');
    return isLocal ? '#007AFF' : '#FF9500';
  };

  return (
    <View style={styles.memberCard}>
      <View style={styles.cardContainer}>
        <View style={styles.photoSection}>
          <TouchableOpacity 
            onPress={showCheckbox && onCheckboxPress ? onCheckboxPress : undefined}
            activeOpacity={0.8}
            disabled={!showCheckbox}
          >
            {(() => {
              const photoUri = (member.profilePhotoUri && member.profilePhotoUri.trim() !== '') 
                ? member.profilePhotoUri 
                : (member.profilePhotoUrl && member.profilePhotoUrl.trim() !== '') 
                ? member.profilePhotoUrl 
                : null;
              
              const isValidUri = photoUri && 
                typeof photoUri === 'string' && 
                photoUri.trim() !== '' && 
                photoUri !== 'undefined' && 
                photoUri !== 'null' &&
                (photoUri.startsWith('http://') || 
                 photoUri.startsWith('https://') || 
                 photoUri.startsWith('file://') ||
                 photoUri.startsWith('data:'));
              
              if (isValidUri) {
                return (
                  <Image
                    source={{ uri: photoUri }}
                    style={[styles.profilePhoto, isSelected && styles.profilePhotoSelected]}
                    defaultSource={undefined}
                  />
                );
              }
              
              return (
                <View style={[styles.profilePhoto, styles.photoPlaceholder, isSelected && styles.profilePhotoSelected]}>
                  <User size={40} color="#ccc" />
                </View>
              );
            })()}
          </TouchableOpacity>

          {onHistoryPress && (
            <TouchableOpacity onPress={onHistoryPress} style={styles.historyButtonUnderPhoto}>
              <Text style={styles.historyButtonText}>History</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.contentSection}
          onPress={onPress}
          disabled={!onPress}
          activeOpacity={onPress ? 0.7 : 1}
        >
          <View style={styles.headerRow}>
            <View style={styles.nameContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.memberName}>{member.name}</Text>
                {isCurrentUser && onEdit && (
                  <TouchableOpacity onPress={onEdit} style={styles.editIconButton}>
                    <Pencil size={16} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {member.membershipType && (
            <View style={styles.membershipRow}>
              <View
                style={[
                  styles.membershipBadge,
                  { backgroundColor: getMemberStatusColor(member.membershipType) },
                ]}
              >
                <Text style={styles.membershipText}>
                  {getMemberStatusText(member.membershipType)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.memberInfo}>
            <Text style={styles.memberDetail}>Handicap: {member.handicap || 'N/A'}</Text>
            {member.adjustedHandicap && (
              <Text style={styles.memberDetailAdjusted}>
                Adjusted: {member.adjustedHandicap}
              </Text>
            )}
            {canSeeTournamentHandicap && member.tournamentHandicaps && member.tournamentHandicaps.length > 0 && getTournamentHandicapDisplay(member.tournamentHandicaps) !== 'N/A' && (
              <Text style={styles.memberDetailTournament}>
                Tournament Handicap: {getTournamentHandicapDisplay(member.tournamentHandicaps)}
              </Text>
            )}
            {member.flight && <Text style={styles.memberDetail}>Tournament Flight: {member.flight}</Text>}
            {member.rolexFlight && <Text style={styles.memberDetail}>Rolex Flight: {member.rolexFlight}</Text>}
            {member.email && <Text style={styles.memberDetail}>{member.email}</Text>}
          </View>

          {isCurrentUser && member.membershipType === 'in-active' && onEdit && (
            <TouchableOpacity style={styles.renewButton} onPress={onEdit}>
              <Text style={styles.renewButtonText}>Renew Membership</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>



        {isAdmin && onEditPress && (
          <TouchableOpacity onPress={onEditPress} style={styles.editButton}>
            <Pencil size={18} color="#007AFF" />
          </TouchableOpacity>
        )}

        {isAdmin && onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Trash2 size={18} color="#FF3B30" />
          </TouchableOpacity>
        )}

        <View style={[styles.locationBadge, { backgroundColor: getLocationBadgeColor() }]}>
          <Text style={styles.locationBadgeText}>{getLocationBadge()}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  memberCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
  },
  photoSection: {
    marginRight: 12,
    position: 'relative' as const,
    alignItems: 'center',
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  profilePhotoSelected: {
    borderWidth: 3,
    borderColor: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  membershipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  nameContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  editIconButton: {
    padding: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  membershipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  membershipText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
  memberInfo: {
    gap: 2,
  },
  memberDetail: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  memberDetailAdjusted: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  memberDetailTournament: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  historyButtonUnderPhoto: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyButtonText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
  editButton: {
    padding: 8,
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
  renewButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 0,
    backgroundColor: '#FF9500',
    borderRadius: 6,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  renewButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
    paddingHorizontal: 12,
  },
  locationBadge: {
    position: 'absolute' as const,
    bottom: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    pointerEvents: 'none' as const,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
