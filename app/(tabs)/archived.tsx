import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventsContext';
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
import { useQuery } from '@tanstack/react-query';
import { supabaseService } from '@/utils/supabaseService';

import { Event } from '@/types';
import { formatDateForDisplay } from '@/utils/dateUtils';

export default function ArchivedEventsScreen() {
  const { isLoading: authLoading } = useAuth();
  const { events: contextEvents, isLoading: eventsLoading, refreshEvents } = useEvents();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  const registrationsQuery = useQuery({
    queryKey: ['all-event-registrations', contextEvents],
    queryFn: async () => {
      const allRegistrations: Record<string, any[]> = {};
      if (contextEvents && contextEvents.length > 0) {
        for (const event of contextEvents) {
          try {
            const regs = await supabaseService.registrations.getAll(event.id);
            allRegistrations[event.id] = regs || [];
          } catch (error) {
            console.error(`Error fetching registrations for event ${event.id}:`, error);
            allRegistrations[event.id] = [];
          }
        }
      }
      return allRegistrations;
    },
    enabled: !!contextEvents && contextEvents.length > 0,
  });

  const { refetch: refetchRegistrations } = registrationsQuery;

  useFocusEffect(
    useCallback(() => {
      console.log('📱 Archived Events - Screen focused, refetching data...');
      refreshEvents();
      if (refetchRegistrations) {
        refetchRegistrations();
      }
    }, [refreshEvents, refetchRegistrations])
  );

  useEffect(() => {
    if (contextEvents) {
      const sortedEvents = [...contextEvents].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      setEvents(sortedEvents);
    }
  }, [contextEvents, eventsLoading]);

  const archivedEvents = events.filter(e => e.archived);

  const archivedEventsByYear = archivedEvents.reduce<Record<string, Event[]>>((acc, event) => {
    const year = event.date ? new Date(event.date).getFullYear().toString() : 'Unknown';
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(event);
    return acc;
  }, {});

  const sortedYears = Object.keys(archivedEventsByYear).sort((a, b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    return parseInt(b) - parseInt(a);
  });

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };



  const formatDateRange = (start?: string, end?: string) => {
    if (!start) return '';
    const formattedStart = formatDateForDisplay(start);
    if (!end || end === start) return formattedStart;
    const formattedEnd = formatDateForDisplay(end);
    return `${formattedStart} - ${formattedEnd}`;
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: 'Archived Events',
          headerStyle: {
            backgroundColor: '#374151',
          },
          headerTintColor: '#ffffff',
        }} 
      />
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {eventsLoading || authLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading archived events...</Text>
            </View>
          ) : archivedEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No archived events</Text>
              <Text style={styles.emptySubtext}>Archived events will appear here</Text>
            </View>
          ) : (
            <>
              {sortedYears.map((year) => (
                <View key={year} style={styles.archivedYearCard}>
                  <TouchableOpacity
                    style={styles.yearHeader}
                    onPress={() => toggleYear(year)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.yearText}>{year} ({archivedEventsByYear[year].length})</Text>
                    <Text style={styles.yearIcon}>{expandedYears.has(year) ? '▼' : '▶'}</Text>
                  </TouchableOpacity>
                  {expandedYears.has(year) && (
                    <FlatList
                      scrollEnabled={false}
                      data={archivedEventsByYear[year]}
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
                            <View style={styles.archivedBadge}>
                              <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
                            </View>
                          </View>
                          <View style={styles.eventContent}>
                            <Text style={styles.eventName}>{item.name}</Text>
                            <Text style={styles.eventDetail}>📍 {item.location}</Text>
                            <Text style={styles.eventDetail}>
                              📅 {formatDateRange(item.date || '', item.endDate || '')}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              ))}
            </>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  archivedYearCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  yearHeader: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  yearText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#374151',
  },
  yearIcon: {
    fontSize: 14,
    color: '#666',
  },
  archivedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  archivedBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
});
