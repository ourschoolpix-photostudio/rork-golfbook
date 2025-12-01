import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Event, EventRegistration, Grouping, Score, EventRolexPoints, FinancialRecord } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export const [EventsProvider, useEvents] = createContextHook(() => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isFetchingEvents, setIsFetchingEvents] = useState<boolean>(false);

  const fetchEvents = useCallback(async () => {
    try {
      setIsFetchingEvents(true);
      console.log('⏳ [EventsContext] Loading events from Supabase...');
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ [EventsContext] Failed to fetch events:', error);
        return;
      }

      console.log('✅ [EventsContext] Successfully fetched events:', data?.length || 0);
      setEvents(data || []);
    } catch (error) {
      console.error('❌ [EventsContext] Exception fetching events:', error);
    } finally {
      setIsFetchingEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = useCallback(async (event: Event) => {
    try {
      const eventWithDefaults = {
        ...event,
        startDate: event.startDate || event.date,
      };
      
      const { error } = await supabase
        .from('events')
        .insert([eventWithDefaults]);

      if (error) {
        console.error('❌ [EventsContext] Failed to add event:', error);
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception adding event:', error);
      throw error;
    }
  }, [fetchEvents]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>) => {
    try {
      const { error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId);

      if (error) {
        console.error('❌ [EventsContext] Failed to update event:', error);
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception updating event:', error);
      throw error;
    }
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('❌ [EventsContext] Failed to delete event:', error);
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception deleting event:', error);
      throw error;
    }
  }, [fetchEvents]);

  const addRegistration = useCallback(async (registration: EventRegistration) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert([registration]);

      if (error) {
        console.error('❌ [EventsContext] Failed to add registration:', error);
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception adding registration:', error);
      throw error;
    }
  }, [fetchEvents]);

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
    try {
      const { error } = await supabase
        .from('financial_records')
        .insert([financial]);

      if (error) {
        console.error('❌ [EventsContext] Failed to add financial record:', error);
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception adding financial record:', error);
      throw error;
    }
  }, [fetchEvents]);

  const updateEventPoints = useCallback(async (eventId: string, memberId: string, points: number, position: number) => {
    console.log('updateEventPoints not yet implemented for backend');
  }, []);

  const registrations: EventRegistration[] = useMemo(() => [], []);
  const groupings: Grouping[] = useMemo(() => [], []);
  const scores: Score[] = useMemo(() => [], []);
  const eventPoints: EventRolexPoints[] = useMemo(() => [], []);
  const financials: FinancialRecord[] = useMemo(() => [], []);
  const isLoading = isFetchingEvents;

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
