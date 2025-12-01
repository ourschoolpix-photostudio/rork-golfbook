import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Event, EventRegistration, Grouping, Score, EventRolexPoints, FinancialRecord } from '@/types';
import { trpcClient } from '@/lib/trpc';



export const [EventsProvider, useEvents] = createContextHook(() => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('📥 [EventsContext] Fetching events via tRPC...');
      console.log('📥 [EventsContext] tRPC client exists:', !!trpcClient);
      console.log('📥 [EventsContext] tRPC events route exists:', !!trpcClient.events);
      console.log('📥 [EventsContext] tRPC getAll exists:', !!trpcClient.events?.getAll);
      
      const fetchedEvents = await trpcClient.events.getAll.query();
      console.log('✅ [EventsContext] Successfully fetched events:', fetchedEvents.length);
      console.log('✅ [EventsContext] Sample event:', fetchedEvents[0] ? { id: fetchedEvents[0].id, name: fetchedEvents[0].name } : 'none');
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('❌ [EventsContext] Failed to fetch events:', error);
      console.error('❌ [EventsContext] Error details:', error instanceof Error ? { message: error.message, stack: error.stack } : 'unknown error');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = useCallback(async (event: Event) => {
    try {
      console.log('➕ [EventsContext] Adding event:', event.name);
      
      const eventWithDefaults = {
        ...event,
        startDate: event.startDate || event.date || '',
      };
      
      await trpcClient.events.create.mutate(eventWithDefaults as any);
      console.log('✅ [EventsContext] Event added successfully');
      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception adding event:', error);
      throw error;
    }
  }, [fetchEvents]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>) => {
    try {
      console.log('✏️ [EventsContext] Updating event:', eventId);
      
      await trpcClient.events.update.mutate({ eventId, updates });
      console.log('✅ [EventsContext] Event updated successfully');
      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception updating event:', error);
      throw error;
    }
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      console.log('🗑️ [EventsContext] Deleting event:', eventId);
      
      await trpcClient.events.delete.mutate({ eventId });
      console.log('✅ [EventsContext] Event deleted successfully');
      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception deleting event:', error);
      throw error;
    }
  }, [fetchEvents]);

  const addRegistration = useCallback(async (registration: EventRegistration) => {
    console.log('addRegistration - using direct registration flow');
  }, []);

  const updateRegistration = useCallback(async (registrationId: string, updates: Partial<EventRegistration>) => {
    console.log('updateRegistration not yet implemented for backend');
  }, []);

  const addGrouping = useCallback(async (grouping: Grouping) => {
    console.log('addGrouping - using sync system');
  }, []);

  const updateGrouping = useCallback(async (groupingId: string, updates: Partial<Grouping>) => {
    console.log('updateGrouping - using sync system');
  }, []);

  const addScore = useCallback(async (score: Score) => {
    console.log('addScore - using sync system');
  }, []);

  const updateScore = useCallback(async (scoreId: string, updates: Partial<Score>) => {
    console.log('updateScore - using sync system');
  }, []);

  const addFinancial = useCallback(async (financial: FinancialRecord) => {
    console.log('addFinancial - using financials CRUD route');
  }, []);

  const updateEventPoints = useCallback(async (eventId: string, memberId: string, points: number, position: number) => {
    console.log('updateEventPoints not yet implemented for backend');
  }, []);

  const registrations: EventRegistration[] = useMemo(() => [], []);
  const groupings: Grouping[] = useMemo(() => [], []);
  const scores: Score[] = useMemo(() => [], []);
  const eventPoints: EventRolexPoints[] = useMemo(() => [], []);
  const financials: FinancialRecord[] = useMemo(() => [], []);

  return useMemo(() => ({
    events,
    registrations,
    groupings,
    scores,
    eventPoints,
    financials,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    addRegistration,
    updateRegistration,
    addGrouping,
    updateGrouping,
    addScore,
    updateScore,
    addFinancial,
    updateEventPoints,
    refreshEvents: fetchEvents,
  }), [
    events,
    registrations,
    groupings,
    scores,
    eventPoints,
    financials,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    addRegistration,
    updateRegistration,
    addGrouping,
    updateGrouping,
    addScore,
    updateScore,
    addFinancial,
    updateEventPoints,
    fetchEvents,
  ]);
});
