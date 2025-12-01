import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Event, EventRegistration, Grouping, Score, EventRolexPoints, FinancialRecord } from '@/types';
import { supabase } from '@/integrations/supabase/client';

function mapDbToEvent(e: any): Event {
  return {
    id: e.id,
    name: e.name,
    date: e.date,
    startDate: e.start_date,
    venue: e.location || '',
    location: e.location,
    entryFee: e.entry_fee,
    course: e.course,
    status: e.status,
    createdAt: e.created_at,
    numberOfDays: e.num_days || 1,
    type: e.type || 'tournament',
    registrationDeadline: e.registration_deadline,
    maxParticipants: e.max_participants,
    description: e.description,
  };
}

export const [EventsProvider, useEvents] = createContextHook(() => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('📥 [EventsContext] Fetching events from Supabase...');
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        console.error('❌ [EventsContext] Failed to fetch events:', error);
        throw error;
      }

      const mappedEvents = (data || []).map(mapDbToEvent);
      console.log('✅ [EventsContext] Successfully fetched events:', mappedEvents.length);
      setEvents(mappedEvents);
    } catch (error) {
      console.error('❌ [EventsContext] Exception fetching events:', error);
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
      
      const { error } = await supabase
        .from('events')
        .insert({
          id: eventWithDefaults.id,
          name: eventWithDefaults.name,
          date: eventWithDefaults.date,
          start_date: eventWithDefaults.startDate,
          location: eventWithDefaults.location || eventWithDefaults.venue || '',
          entry_fee: eventWithDefaults.entryFee || '0',
          course: eventWithDefaults.course || '',
          status: eventWithDefaults.status || 'upcoming',
          created_at: eventWithDefaults.createdAt || new Date().toISOString(),
          num_days: eventWithDefaults.numberOfDays || 1,
          type: eventWithDefaults.type || 'tournament',
          registration_deadline: eventWithDefaults.registrationDeadline || null,
          max_participants: eventWithDefaults.maxParticipants || null,
          description: eventWithDefaults.description || '',
        });

      if (error) {
        console.error('❌ [EventsContext] Failed to add event:', error);
        throw error;
      }

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
      
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.venue !== undefined) updateData.location = updates.venue;
      if (updates.entryFee !== undefined) updateData.entry_fee = updates.entryFee;
      if (updates.course !== undefined) updateData.course = updates.course;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.numberOfDays !== undefined) updateData.num_days = updates.numberOfDays;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.registrationDeadline !== undefined) updateData.registration_deadline = updates.registrationDeadline;
      if (updates.maxParticipants !== undefined) updateData.max_participants = updates.maxParticipants;
      if (updates.description !== undefined) updateData.description = updates.description;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId);

      if (error) {
        console.error('❌ [EventsContext] Failed to update event:', error);
        throw error;
      }

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
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('❌ [EventsContext] Failed to delete event:', error);
        throw error;
      }

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
