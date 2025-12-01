import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo } from 'react';
import { Event, EventRegistration, Grouping, Score, EventRolexPoints, FinancialRecord } from '@/types';
import { trpc } from '@/lib/trpc';

export const [EventsProvider, useEvents] = createContextHook(() => {
  const eventsQuery = trpc.events.getAll.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (eventsQuery.data) {
      console.log('✅ [EventsContext] Successfully fetched events:', eventsQuery.data.length);
    }
    if (eventsQuery.error) {
      console.error('❌ [EventsContext] Failed to fetch events:', eventsQuery.error);
    }
  }, [eventsQuery.data, eventsQuery.error]);

  const events = useMemo(() => eventsQuery.data || [], [eventsQuery.data]);

  const addEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      console.log('✅ [EventsContext] Event created successfully');
      eventsQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [EventsContext] Failed to create event:', error);
    },
  });

  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      console.log('✅ [EventsContext] Event updated successfully');
      eventsQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [EventsContext] Failed to update event:', error);
    },
  });

  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      console.log('✅ [EventsContext] Event deleted successfully');
      eventsQuery.refetch();
    },
    onError: (error) => {
      console.error('❌ [EventsContext] Failed to delete event:', error);
    },
  });

  const addEvent = useCallback(async (event: Event) => {
    try {
      const eventWithDefaults = {
        ...event,
        startDate: event.startDate || event.date || '',
      };
      
      await addEventMutation.mutateAsync(eventWithDefaults);
    } catch (error) {
      console.error('❌ [EventsContext] Exception adding event:', error);
      throw error;
    }
  }, [addEventMutation]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>) => {
    try {
      await updateEventMutation.mutateAsync({ eventId, updates });
    } catch (error) {
      console.error('❌ [EventsContext] Exception updating event:', error);
      throw error;
    }
  }, [updateEventMutation]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      await deleteEventMutation.mutateAsync({ eventId });
    } catch (error) {
      console.error('❌ [EventsContext] Exception deleting event:', error);
      throw error;
    }
  }, [deleteEventMutation]);

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
  const isLoading = eventsQuery.isLoading;

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
    refreshEvents: eventsQuery.refetch,
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
    eventsQuery.refetch,
  ]);
});
