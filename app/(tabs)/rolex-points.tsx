import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { PlayerEditModal } from '@/components/PlayerEditModal';
import { Member } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseService } from '@/utils/supabaseService';

type FlightFilter = 'all' | 'A' | 'B';

export default function GlobalRolexScreen() {
  const { currentUser, updateMember } = useAuth();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [flightFilter, setFlightFilter] = useState<FlightFilter>('all');

  const [allMembers, setAllMembers] = useState<Member[]>([]);

  const loadMembers = async () => {
    try {
      const data = await supabaseService.members.getAll();
      console.log('[GlobalRolex] ✅ Loaded', data.length, 'members from Supabase');
      setAllMembers(data);
    } catch (error) {
      console.error('[GlobalRolex] Error loading members:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('[GlobalRolex] Screen focused, loading members...');
      loadMembers();
    }, [])
  );

  const sortedMembers = useMemo(() => {
    let filtered = [...allMembers];
    
    if (flightFilter === 'A') {
      filtered = filtered.filter(m => m.rolexFlight === 'A');
    } else if (flightFilter === 'B') {
      filtered = filtered.filter(m => m.rolexFlight === 'B');
    }
    
    const sorted = filtered.sort((a, b) => {
      const flightA = a.rolexFlight || '';
      const flightB = b.rolexFlight || '';
      
      const getFlightOrder = (flight: string) => {
        if (flight === 'A') return 0;
        if (flight === 'B') return 1;
        return 2;
      };
      
      if (flightA !== flightB) {
        return getFlightOrder(flightA) - getFlightOrder(flightB);
      }
      
      const pointsA = typeof a.rolexPoints === 'number' ? a.rolexPoints : parseInt(a.rolexPoints as string) || 0;
      const pointsB = typeof b.rolexPoints === 'number' ? b.rolexPoints : parseInt(b.rolexPoints as string) || 0;
      return pointsB - pointsA;
    });
    return sorted;
  }, [allMembers, flightFilter]);

  const handleMemberPress = (member: Member) => {
    if (currentUser?.isAdmin) {
      setSelectedMember(member);
      setEditModalVisible(true);
    }
  };

  const handleSaveQuickEdit = async (updatedMember: Member) => {
    try {
      await updateMember(updatedMember.id, updatedMember);
    } catch (error) {
      console.error('Error saving member:', error);
      throw error;
    }
  };

  const getPlayersWithSeparators = useMemo(() => {
    const result: any[] = [];
    let currentFlight: string | null = null;

    sortedMembers.forEach((player) => {
      const playerFlight = player.rolexFlight || '—';
      if (playerFlight !== currentFlight) {
        currentFlight = playerFlight;
        result.push({ type: 'separator', flight: playerFlight });
      }
      result.push({ type: 'player', data: player });
    });

    return result;
  }, [sortedMembers]);

  return (
    <View style={styles.container}>
      <View style={styles.filterButtons}>
        <TouchableOpacity
          style={[styles.filterButton, flightFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setFlightFilter('all')}
        >
          <Text style={[styles.filterButtonText, flightFilter === 'all' && styles.filterButtonTextActive]}>
            Find All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, flightFilter === 'A' && styles.filterButtonActive]}
          onPress={() => setFlightFilter('A')}
        >
          <Text style={[styles.filterButtonText, flightFilter === 'A' && styles.filterButtonTextActive]}>
            Find Flight A
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, flightFilter === 'B' && styles.filterButtonActive]}
          onPress={() => setFlightFilter('B')}
        >
          <Text style={[styles.filterButtonText, flightFilter === 'B' && styles.filterButtonTextActive]}>
            Find Flight B
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={getPlayersWithSeparators}
        keyExtractor={(item, index) => 
          item.type === 'separator' ? `separator-${item.flight}` : item.data.id
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          if (item.type === 'separator') {
            return (
              <View style={styles.flightSeparator}>
                <Text style={styles.flightSeparatorText}>Rolex Flight {item.flight}</Text>
              </View>
            );
          }

          const player = item.data;
          const playersInFlight = getPlayersWithSeparators.filter(
            (p) => p.type === 'player' && p.data.rolexFlight === player.rolexFlight
          );
          const flightRank = playersInFlight.findIndex((p) => p.data.id === player.id) + 1;

          const isLeader = flightRank === 1;

          return (
            <TouchableOpacity onPress={() => handleMemberPress(player)}>
              <View style={[styles.rankCard, isLeader && styles.rankCardLeader]}>
                {isLeader ? (
                  <View style={styles.trophyContainer}>
                    <Ionicons name="trophy" size={44} color="#FF3B30" />
                  </View>
                ) : (
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{flightRank}</Text>
                  </View>
                )}
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, isLeader && styles.playerNameLeader]}>
                    {player.name}
                  </Text>
                  <Text style={[styles.playerHandicap, isLeader && styles.playerHandicapLeader]}>
                    Handicap: {player.handicap}
                  </Text>
                  {player.rolexFlight && (
                    <Text style={[styles.playerRolexFlight, isLeader && styles.playerRolexFlightLeader]}>
                      Rolex Flight: {player.rolexFlight}
                    </Text>
                  )}
                </View>
                <View style={styles.pointsContainer}>
                  <Text style={[styles.points, isLeader && styles.pointsLeader]}>
                    {player.rolexPoints || 0}
                  </Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No members yet</Text>}
      />
      {selectedMember && (
        <PlayerEditModal
          visible={editModalVisible}
          member={selectedMember}
          onClose={() => setEditModalVisible(false)}
          onSave={handleSaveQuickEdit}
          quickEditMode={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: '#f5f5f5',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  rankCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankCardLeader: {
    backgroundColor: '#FFFBF0',
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trophyContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  playerNameLeader: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  playerHandicap: {
    fontSize: 13,
    color: '#666',
  },
  playerHandicapLeader: {
    color: '#996600',
    fontWeight: '600',
  },
  playerRolexFlight: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  playerRolexFlightLeader: {
    color: '#996600',
  },
  flightSeparator: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  flightSeparatorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pointsContainer: {
    alignItems: 'center',
  },
  points: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFB800',
  },
  pointsLeader: {
    fontSize: 24,
  },
  pointsLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
});
