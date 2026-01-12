import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Trophy, Calendar, Trash2 } from 'lucide-react-native';
import { Member } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

function parseDateSafe(dateStr: string): Date {
  const date = new Date(dateStr + 'T12:00:00');
  return date;
}

interface EventRecord {
  eventId: string;
  eventName: string;
  startDate: string;
  endDate: string | null;
  numberOfDays: number;
  scores: { day: number; score: number | null; netScore: number | null }[];
  placement: number | null;
  totalScore: number;
  totalNetScore: number;
  flight: string | null;
  entryFee: number | null;
  eventType: 'tournament' | 'social' | null;
}

interface MembershipRecord {
  id: string;
  membershipType: 'full' | 'basic';
  amount: string;
  paymentMethod: 'paypal' | 'zelle';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
}

interface SeasonData {
  year: number;
  events: EventRecord[];
  membershipRecords: MembershipRecord[];
  totalEntryFees: number;
  totalMembershipFees: number;
}

interface PlayerHistoricalRecordsModalProps {
  visible: boolean;
  member: Member | null;
  onClose: () => void;
}

export function PlayerHistoricalRecordsModal({
  visible,
  member,
  onClose,
}: PlayerHistoricalRecordsModalProps) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.isAdmin || false;
  const [loading, setLoading] = useState(false);
  const [seasons, setSeasons] = useState<SeasonData[]>([]);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'events' | 'membership'>('events');
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadHistoricalRecords = useCallback(async () => {
    if (!member) return;

    try {
      setLoading(true);
      console.log('[Historical Records] Loading records for:', member.name);

      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select(`
          event_id,
          events!event_registrations_event_id_fkey(
            id,
            name,
            start_date,
            end_date,
            number_of_days,
            status,
            entry_fee,
            type,
            archived
          )
        `)
        .eq('member_id', member.id);

      if (regError) {
        console.error('[Historical Records] Registration error:', {
          message: regError.message,
          details: regError.details,
          hint: regError.hint,
          code: regError.code
        });
        throw new Error(`Failed to load registrations: ${regError.message}`);
      }

      console.log('[Historical Records] Raw registrations:', JSON.stringify(registrations, null, 2));

      if (!registrations || registrations.length === 0) {
        console.log('[Historical Records] No event registrations found, but will still check for membership payments');
      }

      const eventRecords: EventRecord[] = [];

      for (const reg of registrations) {
        const event = (reg as any).events;
        
        if (!event) {
          console.warn('[Historical Records] Event data missing for registration:', reg);
          continue;
        }
        
        if (event.archived) {
          console.log('[Historical Records] Skipping archived event:', event.name);
          continue;
        }
        
        if (event.status !== 'complete') {
          console.log('[Historical Records] Skipping non-complete event:', event.name, event.status);
          continue;
        }
        
        const { data: scores, error: scoresError } = await supabase
          .from('scores')
          .select('day, total_score, holes')
          .eq('event_id', event.id)
          .eq('member_id', member.id)
          .order('day', { ascending: true });

        if (scoresError) {
          console.error('[Historical Records] Error loading scores:', {
            message: scoresError.message,
            details: scoresError.details,
            hint: scoresError.hint,
            code: scoresError.code
          });
          continue;
        }

        const dayScores = [];
        let totalScore = 0;
        let totalNetScore = 0;
        const numberOfDays = event.number_of_days || 1;
        const playerHandicap = member.handicap || 0;

        for (let day = 1; day <= numberOfDays; day++) {
          const dayScore = scores?.find(s => s.day === day);
          const score = dayScore?.total_score || null;
          let netScore: number | null = null;
          
          if (score !== null && playerHandicap) {
            netScore = score - playerHandicap;
          }
          
          dayScores.push({ day, score, netScore });
          if (score) totalScore += score;
          if (netScore) totalNetScore += netScore;
        }

        const { data: allScores, error: allScoresError } = await supabase
          .from('scores')
          .select('member_id, total_score')
          .eq('event_id', event.id);

        if (allScoresError) {
          console.error('[Historical Records] Error loading all scores:', {
            message: allScoresError.message,
            details: allScoresError.details,
            hint: allScoresError.hint,
            code: allScoresError.code
          });
        }

        let placement: number | null = null;
        if (allScores && allScores.length > 0) {
          const playerTotals = new Map<string, number>();
          
          allScores.forEach(s => {
            const current = playerTotals.get(s.member_id) || 0;
            playerTotals.set(s.member_id, current + (s.total_score || 0));
          });

          const sortedTotals = Array.from(playerTotals.entries())
            .map(([memberId, total]) => ({ memberId, total }))
            .sort((a, b) => a.total - b.total);

          const playerIndex = sortedTotals.findIndex(p => p.memberId === member.id);
          if (playerIndex !== -1) {
            placement = playerIndex + 1;
          }
        }

        const entryFee = event.entry_fee ? parseFloat(event.entry_fee) : null;
        const eventType = event.type || null;

        eventRecords.push({
          eventId: event.id,
          eventName: event.name,
          startDate: event.start_date,
          endDate: event.end_date,
          numberOfDays,
          scores: dayScores,
          placement,
          totalScore,
          totalNetScore,
          flight: member.flight || null,
          entryFee,
          eventType,
        });
      }

      console.log('[Historical Records] ========================================');
      console.log('[Historical Records] Querying membership_payments for member_id:', member.id);
      
      // First, get ALL records for this member to debug
      const { data: allMemberPayments, error: allPaymentsError } = await supabase
        .from('membership_payments')
        .select('*')
        .eq('member_id', member.id);
      
      console.log('[Historical Records] ALL membership payments for this member:', JSON.stringify(allMemberPayments, null, 2));
      console.log('[Historical Records] Total records found (all statuses):', allMemberPayments?.length || 0);
      if (allPaymentsError) {
        console.error('[Historical Records] Error fetching all payments:', allPaymentsError);
      }
      
      // Now query with the filter
      const { data: membershipPayments, error: membershipError } = await supabase
        .from('membership_payments')
        .select('*')
        .eq('member_id', member.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      console.log('[Historical Records] Completed membership payments:', JSON.stringify(membershipPayments, null, 2));
      console.log('[Historical Records] Completed records count:', membershipPayments?.length || 0);
      
      if (membershipError) {
        console.error('[Historical Records] Membership payments error:', membershipError);
      }
      
      console.log('[Historical Records] ========================================');

      const membershipRecords: MembershipRecord[] = (membershipPayments || []).map((payment: any) => ({
        id: payment.id,
        membershipType: payment.membership_type,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        paymentStatus: payment.payment_status,
        createdAt: payment.created_at,
      }));

      const seasonMap = new Map<number, { events: EventRecord[]; memberships: MembershipRecord[] }>();
      
      eventRecords.forEach(record => {
        const year = parseDateSafe(record.startDate).getFullYear();
        if (!seasonMap.has(year)) {
          seasonMap.set(year, { events: [], memberships: [] });
        }
        seasonMap.get(year)!.events.push(record);
      });

      membershipRecords.forEach(record => {
        const year = new Date(record.createdAt).getFullYear();
        if (!seasonMap.has(year)) {
          seasonMap.set(year, { events: [], memberships: [] });
        }
        seasonMap.get(year)!.memberships.push(record);
      });

      const seasonsData: SeasonData[] = Array.from(seasonMap.entries())
        .map(([year, data]) => {
          const sortedEvents = data.events.sort((a, b) => 
            parseDateSafe(b.startDate).getTime() - parseDateSafe(a.startDate).getTime()
          );
          const sortedMemberships = data.memberships.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const totalEntryFees = sortedEvents.reduce((sum, event) => 
            sum + (event.entryFee || 0), 0
          );
          const totalMembershipFees = sortedMemberships.reduce((sum, m) => 
            sum + parseFloat(m.amount || '0'), 0
          );
          return {
            year,
            events: sortedEvents,
            membershipRecords: sortedMemberships,
            totalEntryFees,
            totalMembershipFees,
          };
        })
        .sort((a, b) => b.year - a.year);

      const currentYear = new Date().getFullYear();
      setExpandedSeasons(new Set([currentYear]));
      setSeasons(seasonsData);
      
      console.log('[Historical Records] Loaded', eventRecords.length, 'records');
    } catch (error) {
      console.error('[Historical Records] Error loading records:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (error instanceof Error) {
        console.error('[Historical Records] Error details:', error.message);
      } else {
        console.error('[Historical Records] Unknown error:', JSON.stringify(error, null, 2));
      }
    } finally {
      setLoading(false);
    }
  }, [member]);

  useEffect(() => {
    if (visible && member) {
      loadHistoricalRecords();
    }
  }, [visible, member, loadHistoricalRecords]);

  const toggleSeason = (year: number) => {
    setExpandedSeasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  const handleDeleteRecord = useCallback(async (recordId: string, recordType: string) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete this ${recordType} record? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(recordId);
              console.log('[Historical Records] Deleting record:', recordId);
              
              const { error } = await supabase
                .from('membership_payments')
                .delete()
                .eq('id', recordId);
              
              if (error) {
                console.error('[Historical Records] Error deleting record:', error);
                Alert.alert('Error', 'Failed to delete record. Please try again.');
                return;
              }
              
              console.log('[Historical Records] Record deleted successfully');
              await loadHistoricalRecords();
            } catch (error) {
              console.error('[Historical Records] Exception deleting record:', error);
              Alert.alert('Error', 'Failed to delete record. Please try again.');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  }, [loadHistoricalRecords]);

  const formatDate = (startDate: string, endDate: string | null) => {
    const start = parseDateSafe(startDate);
    const startFormatted = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (endDate) {
      const end = parseDateSafe(endDate);
      const endFormatted = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startFormatted} - ${endFormatted}`;
    }
    
    return startFormatted;
  };

  const getPlacementSuffix = (placement: number) => {
    const j = placement % 10;
    const k = placement % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  if (!member) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Trophy size={24} color="#007AFF" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Historical Records</Text>
              <Text style={styles.headerSubtitle}>{member.name}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading records...</Text>
          </View>
        ) : seasons.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Trophy size={48} color="#ccc" />
            <Text style={styles.emptyText}>No Historical Records</Text>
            <Text style={styles.emptySubtext}>
              Complete events and membership renewals will appear here
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'events' && styles.tabActive]}
                onPress={() => setActiveTab('events')}
              >
                <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>Events</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'membership' && styles.tabActive]}
                onPress={() => setActiveTab('membership')}
              >
                <Text style={[styles.tabText, activeTab === 'membership' && styles.tabTextActive]}>Membership</Text>
              </TouchableOpacity>
            </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {activeTab === 'events' ? (
              seasons.filter(s => s.events.length > 0).length === 0 ? (
                <View style={styles.emptyTabContainer}>
                  <Trophy size={40} color="#ccc" />
                  <Text style={styles.emptyTabText}>No event records yet</Text>
                </View>
              ) : (
                seasons.filter(s => s.events.length > 0).map(season => (
                  <View key={season.year} style={styles.seasonContainer}>
                    <TouchableOpacity
                      style={styles.seasonHeader}
                      onPress={() => toggleSeason(season.year)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.seasonHeaderLeft}>
                        <Calendar size={20} color="#fff" />
                        <Text style={styles.seasonTitle}>Season {season.year}</Text>
                      </View>
                      <View style={styles.seasonStatsContainer}>
                        <View style={styles.seasonStats}>
                          <Text style={styles.seasonStatsText}>{season.events.length} Events</Text>
                        </View>
                        {season.totalEntryFees > 0 && (
                          <View style={styles.seasonStats}>
                            <Text style={styles.seasonStatsText}>${season.totalEntryFees.toFixed(2)}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {expandedSeasons.has(season.year) && (
                      <View style={styles.eventsContainer}>
                        {season.events.map((event) => (
                          <View key={event.eventId} style={styles.eventCard}>
                            <View style={styles.eventHeader}>
                              <Text style={styles.eventName} numberOfLines={2}>
                                {event.eventName}
                              </Text>
                              {event.placement && (
                                <View style={styles.placementBadge}>
                                  <Text style={styles.placementText}>
                                    {event.placement}{getPlacementSuffix(event.placement)}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <View style={styles.eventDetails}>
                              <Text style={styles.eventDate}>
                                {formatDate(event.startDate, event.endDate)}
                              </Text>
                              {event.flight && event.eventType !== 'social' && (
                                <Text style={styles.eventFlight}>Flight {event.flight}</Text>
                              )}
                              {event.entryFee !== null && event.entryFee > 0 && (
                                <Text style={styles.eventEntryFee}>${event.entryFee.toFixed(2)}</Text>
                              )}
                            </View>

                            {event.eventType !== 'social' && (
                              <View style={styles.scoresContainer}>
                              {event.scores.map(dayScore => (
                                <View key={dayScore.day} style={styles.scoreItem}>
                                  <Text style={styles.scoreLabel}>Day {dayScore.day}</Text>
                                  <View style={styles.scoreValuesRow}>
                                    <Text style={styles.scoreValue}>
                                      {dayScore.score !== null ? dayScore.score : '-'}
                                    </Text>
                                    {dayScore.netScore !== null && (
                                      <Text style={styles.netScoreValue}>({dayScore.netScore})</Text>
                                    )}
                                  </View>
                                </View>
                              ))}
                              {event.numberOfDays > 1 && (
                                <View style={[styles.scoreItem, styles.totalScoreItem]}>
                                  <Text style={styles.totalScoreLabel}>Total</Text>
                                  <View style={styles.scoreValuesRow}>
                                    <Text style={styles.totalScoreValue}>{event.totalScore}</Text>
                                    {event.totalNetScore > 0 && (
                                      <Text style={styles.totalNetScoreValue}>({event.totalNetScore})</Text>
                                    )}
                                  </View>
                                </View>
                              )}
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )
            ) : (
              seasons.filter(s => s.membershipRecords.length > 0).length === 0 ? (
                <View style={styles.emptyTabContainer}>
                  <Trophy size={40} color="#ccc" />
                  <Text style={styles.emptyTabText}>No membership records yet</Text>
                </View>
              ) : (
                seasons.filter(s => s.membershipRecords.length > 0).map(season => (
                  <View key={`membership-${season.year}`} style={styles.seasonContainer}>
                    <TouchableOpacity
                      style={[styles.seasonHeader, styles.membershipSeasonHeader]}
                      onPress={() => toggleSeason(season.year)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.seasonHeaderLeft}>
                        <Calendar size={20} color="#fff" />
                        <Text style={styles.seasonTitle}>Year {season.year}</Text>
                      </View>
                      <View style={styles.seasonStatsContainer}>
                        <View style={styles.seasonStats}>
                          <Text style={styles.seasonStatsText}>{season.membershipRecords.length} Renewals</Text>
                        </View>
                        {season.totalMembershipFees > 0 && (
                          <View style={styles.seasonStats}>
                            <Text style={styles.seasonStatsText}>${season.totalMembershipFees.toFixed(2)}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {expandedSeasons.has(season.year) && (
                      <View style={styles.eventsContainer}>
                        {season.membershipRecords.map((record) => (
                          <View key={record.id} style={styles.membershipCard}>
                            <View style={styles.membershipHeader}>
                              <Text style={styles.membershipType}>
                                {record.membershipType === 'full' ? 'Full Membership' : 'Basic Membership'}
                              </Text>
                              <View style={styles.membershipHeaderRight}>
                                <View style={styles.membershipStatusBadge}>
                                  <Text style={styles.membershipStatusText}>Renewed</Text>
                                </View>
                                {isAdmin && (
                                  <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteRecord(record.id, 'membership')}
                                    disabled={deleting === record.id}
                                  >
                                    {deleting === record.id ? (
                                      <ActivityIndicator size="small" color="#FF3B30" />
                                    ) : (
                                      <Trash2 size={18} color="#FF3B30" />
                                    )}
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                            <View style={styles.membershipDetails}>
                              <Text style={styles.membershipDate}>
                                {new Date(record.createdAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </Text>
                              <Text style={styles.membershipPaymentMethod}>
                                via {record.paymentMethod === 'paypal' ? 'PayPal' : 'Zelle'}
                              </Text>
                              <Text style={styles.membershipAmount}>${parseFloat(record.amount).toFixed(2)}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )
            )}
          </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#ccc',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  seasonContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#007AFF',
  },
  seasonHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seasonTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  seasonStatsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  seasonStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  seasonStatsText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  eventsContainer: {
    padding: 12,
  },
  eventCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  placementBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  placementText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#000',
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  eventDate: {
    fontSize: 13,
    color: '#666',
  },
  eventFlight: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600' as const,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventEntryFee: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '700' as const,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scoresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreItem: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  scoreValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  netScoreValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  totalScoreItem: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  totalScoreLabel: {
    fontSize: 11,
    color: '#fff',
    marginBottom: 4,
    fontWeight: '600' as const,
  },
  totalScoreValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  totalNetScoreValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#e8e8e8',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  emptyTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTabText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  membershipSeasonHeader: {
    backgroundColor: '#4CAF50',
  },
  membershipCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  membershipHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FFF0F0',
  },
  membershipType: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  membershipStatusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  membershipStatusText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  membershipDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  membershipDate: {
    fontSize: 13,
    color: '#666',
  },
  membershipPaymentMethod: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600' as const,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  membershipAmount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '700' as const,
  },
});
