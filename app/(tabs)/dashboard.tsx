import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerEditModal } from '@/components/PlayerEditModal';
import { EventDetailsModal } from '@/components/EventDetailsModal';
import { Member, Event } from '@/types';
import { trpc } from '@/lib/trpc';
import { formatDateForDisplay } from '@/utils/dateUtils';



export default function DashboardScreen() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [userProfile, setUserProfile] = useState<Member | null>(null);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);

  const eventsQuery = trpc.events.getAll.useQuery(undefined, {
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const membersQuery = trpc.members.getAll.useQuery(undefined, {
    enabled: !!currentUser,
  });

  useFocusEffect(
    useCallback(() => {
      console.log('📱 Dashboard - Screen focused, refetching data...');
      eventsQuery.refetch();
      membersQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  useEffect(() => {
    console.log('🔄 Dashboard - eventsQuery state:', {
      isLoading: eventsQuery.isLoading,
      isError: eventsQuery.isError,
      error: eventsQuery.error,
      dataLength: eventsQuery.data?.length ?? 'no data',
      status: eventsQuery.status
    });
    
    if (eventsQuery.data) {
      console.log('✅ Dashboard - Events from backend:', eventsQuery.data.length);
      console.log('📋 Dashboard - Event IDs:', eventsQuery.data.map(e => e.id));
      const sortedEvents = [...eventsQuery.data].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      setEvents(sortedEvents);
      setIsLoadingEvents(false);
    } else if (eventsQuery.isError) {
      console.error('❌ Dashboard - Failed to fetch events:', eventsQuery.error);
      setIsLoadingEvents(false);
    }
  }, [eventsQuery.data, eventsQuery.isError, eventsQuery.error, eventsQuery.isLoading, eventsQuery.status]);

  useEffect(() => {
    console.log('🔄 Dashboard - membersQuery state:', {
      isLoading: membersQuery.isLoading,
      isError: membersQuery.isError,
      error: membersQuery.error,
      dataLength: membersQuery.data?.length ?? 'no data',
      currentUserId: currentUser?.id
    });
    
    if (currentUser && membersQuery.data) {
      const memberProfile = membersQuery.data.find(
        (m: Member) => m.id === currentUser.id
      );
      console.log('Dashboard - Found profile:', memberProfile);
      setUserProfile(memberProfile || null);
    }
  }, [currentUser, membersQuery.data, membersQuery.isError, membersQuery.error, membersQuery.isLoading]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setDetailsModalVisible(true);
  };

  const updateMemberMutation = trpc.members.update.useMutation({
    onSuccess: () => {
      membersQuery.refetch();
    },
  });

  const handleSaveProfile = async (updated: Member) => {
    try {
      await updateMemberMutation.mutateAsync({
        memberId: updated.id,
        updates: updated,
      });
      setUserProfile(updated);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const getMembershipStatus = (): string => {
    if (!userProfile?.membershipType) {
      return 'Player';
    }

    const statusMap: Record<string, string> = {
      'active': 'Active Member',
      'in-active': 'Inactive Member',
      'guest': 'Guest',
    };

    return statusMap[userProfile.membershipType] || 'Player';
  };

  const getMembershipStatusColor = (): string => {
    if (!userProfile?.membershipType) {
      return '#fff';
    }

    const colorMap: Record<string, string> = {
      'active': '#34C759',
      'in-active': '#FF3B30',
      'guest': '#007AFF',
    };

    return colorMap[userProfile.membershipType] || '#fff';
  };

  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return '';
    const formattedStart = formatDateForDisplay(start);
    if (!end || end === start) return formattedStart;
    const formattedEnd = formatDateForDisplay(end);
    return `${formattedStart} - ${formattedEnd}`;
  };

  const formatTimeRange = (startTime: string, startPeriod: string, endTime?: string, endPeriod?: string) => {
    const start = `${startTime.toLowerCase()}${startPeriod.toLowerCase()}`;
    if (endTime && endPeriod) {
      const end = `${endTime.toLowerCase()}${endPeriod.toLowerCase()}`;
      return `${start} - ${end}`;
    }
    return start;
  };

  const getDayName = (dateStr: string, dayOffset: number): string => {
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return `Day ${dayOffset + 1}`;
    
    const targetDate = new Date(date);
    targetDate.setDate(date.getDate() + dayOffset);
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[targetDate.getDay()];
  };

  const formatSchedule = (event: Event) => {
    const schedules: string[] = [];
    const isSocialEvent = event.type === 'social';

    if (event.day1StartTime) {
      if (isSocialEvent) {
        const dayName = getDayName(event.date || '', 0);
        const timeRange = formatTimeRange(
          event.day1StartTime,
          event.day1StartPeriod || 'AM',
          event.day1EndTime,
          event.day1EndPeriod
        );
        schedules.push(`${dayName} ${timeRange}`);
      } else {
        schedules.push(
          `Day 1: ${event.day1StartTime} ${event.day1StartPeriod || 'AM'} • ${event.day1StartType || 'tee-time'}`
        );
      }
    }
    if (event.day2StartTime) {
      if (isSocialEvent) {
        const dayName = getDayName(event.date || '', 1);
        const timeRange = formatTimeRange(
          event.day2StartTime,
          event.day2StartPeriod || 'AM',
          event.day2EndTime,
          event.day2EndPeriod
        );
        schedules.push(`${dayName} ${timeRange}`);
      } else {
        schedules.push(
          `Day 2: ${event.day2StartTime} ${event.day2StartPeriod || 'AM'} • ${event.day2StartType || 'tee-time'}`
        );
      }
    }
    if (event.day3StartTime) {
      if (isSocialEvent) {
        const dayName = getDayName(event.date || '', 2);
        const timeRange = formatTimeRange(
          event.day3StartTime,
          event.day3StartPeriod || 'AM',
          event.day3EndTime,
          event.day3EndPeriod
        );
        schedules.push(`${dayName} ${timeRange}`);
      } else {
        schedules.push(
          `Day 3: ${event.day3StartTime} ${event.day3StartPeriod || 'AM'} • ${event.day3StartType || 'tee-time'}`
        );
      }
    }

    return schedules;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{userProfile?.name || currentUser?.name || 'User'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {currentUser?.isAdmin && (
              <Text style={[styles.userRole, { color: '#FFD700' }]}>Admin</Text>
            )}
            {userProfile?.boardMemberRoles && userProfile.boardMemberRoles.length > 0 && (
              <Text style={[styles.userRole, { color: '#FFD700' }]}>
                {userProfile.boardMemberRoles.join(' | ')}
              </Text>
            )}
          </View>
          <View style={{ marginTop: 1 }}>
            <Text style={[styles.userRole, { color: getMembershipStatusColor() }]}>
              {getMembershipStatus()}
            </Text>
          </View>
          <View style={styles.userDetailRow}>
            <Text style={styles.userDetailLabel}>Flight:</Text>
            <Text style={styles.userDetailValue}>{userProfile?.flight ?? '--'}</Text>
            <Text style={[styles.userDetailLabel, { marginLeft: 12 }]}>Handicap:</Text>
            <Text style={styles.userDetailValue}>{userProfile?.handicap ?? '--'}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => router.push('/debug-data' as any)} 
            style={[styles.logoutButton, { backgroundColor: '#FF9500', marginBottom: 8 }]}
          >
            <Text style={styles.logoutText}>Debug</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
          <View style={styles.ghinSection}>
            <Text style={styles.ghinLabel}>GHIN#</Text>
            <Text style={styles.ghinValue}>{userProfile?.ghin ?? '--'}</Text>
          </View>
        </View>
      </View>

      {userProfile && (
        <PlayerEditModal
          visible={editModalVisible}
          member={userProfile}
          onClose={() => setEditModalVisible(false)}
          onSave={handleSaveProfile}
          isLimitedMode={true}
        />
      )}

      {selectedEvent && (
        <EventDetailsModal
          visible={detailsModalVisible}
          event={selectedEvent}
          onClose={() => setDetailsModalVisible(false)}
          onRegister={() => {
            setDetailsModalVisible(false);
            setTimeout(() => {
              router.push(`/(event)/${selectedEvent.id}/registration` as any);
            }, 100);
          }}
          currentUserId={currentUser?.id}
          registeredPlayerIds={selectedEvent?.registeredPlayers || []}
        />
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        <Text style={styles.sectionSubtitle}>(Tap Event To Take Part)</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoadingEvents || eventsQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : eventsQuery.isError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>❌ Error Loading Events</Text>
            <Text style={styles.errorText}>{String(eventsQuery.error)}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => eventsQuery.refetch()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events created yet</Text>
            <Text style={styles.emptySubtext}>Events will appear here once created by admin</Text>
          </View>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.eventCard}
                activeOpacity={0.8}
                onPress={() => {
                  console.log('Navigating to event:', item.id);
                  router.push(`/(event)/${item.id}/registration` as any);
                }}
              >
                <View style={styles.eventPhoto}>
                  <Image
                    source={{ uri: (item.photoUrl && item.photoUrl.trim() !== '') ? item.photoUrl : 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80' }}
                    style={styles.photoPlaceholder}
                  />
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleViewDetails(item);
                    }}
                  >
                    <Text style={styles.viewDetailsButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventName}>{item.name}</Text>
                  <Text style={styles.eventDetail}>📍 {item.location}</Text>
                  <Text style={styles.eventDetail}>
                    📅 {formatDateRange(item.date || '', item.endDate || '')}
                  </Text>

                  <View style={styles.scheduleSection}>
                    {formatSchedule(item).map((schedule, index) => (
                      <Text key={index} style={styles.scheduleTime}>
                        {schedule}
                      </Text>
                    ))}
                  </View>

                  <Text style={styles.eventPlayers}>
                    Players registered: {(item.registeredPlayers || []).length}
                  </Text>

                  {item.entryFee && (
                    <View style={styles.entryFeeBadge}>
                      <Text style={styles.entryFeeText}>${item.entryFee}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 150,
    backgroundColor: '#374151',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    paddingTop: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
    marginTop: -8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 0,
  },
  userRole: {
    fontSize: 13,
    fontWeight: '600' as const,
    alignSelf: 'flex-start',
    marginBottom: 0,
  },
  userDetailRow: {
    flexDirection: 'row',
    marginBottom: 2,
    marginTop: -4,
    alignItems: 'center',
  },
  userDetailLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '400' as const,
    marginRight: 4,
  },
  userDetailValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700' as const,
    marginRight: 12,
  },
  headerActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 8,
  },
  ghinSection: {
    alignItems: 'flex-end',
  },
  ghinLabel: {
    fontSize: 10,
    color: '#bbb',
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  ghinValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700' as const,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  logoutText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600' as const,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#999',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  eventPhoto: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  viewDetailsButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  eventContent: {
    padding: 16,
    position: 'relative',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  eventDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  scheduleSection: {
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scheduleTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  eventPlayers: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500' as const,
    marginTop: 8,
    marginBottom: 12,
  },
  entryFeeBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  entryFeeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700' as const,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
