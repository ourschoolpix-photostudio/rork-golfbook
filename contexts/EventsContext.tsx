import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Event, EventRegistration, Grouping, Score, EventRolexPoints, FinancialRecord } from '@/types';
import { trpcClient } from '@/lib/trpc';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';



export const [EventsProvider, useEvents] = createContextHook(() => {
  const { orgInfo } = useSettings();
  const useLocalStorage = orgInfo?.useLocalStorage || false;
  
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (useLocalStorage) {
        console.log('📥 [EventsContext] Fetching events from local storage...');
        const fetchedEvents = await localStorageService.events.getAll();
        console.log('✅ [EventsContext] Successfully fetched events from local storage:', fetchedEvents.length);
        setEvents(fetchedEvents);
        return;
      }
      
      console.log('📥 [EventsContext] Fetching events via tRPC...');
      const fetchedEvents = await trpcClient.events.getAll.query();
      console.log('✅ [EventsContext] Successfully fetched events:', fetchedEvents.length);
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('❌ [EventsContext] Failed to fetch events:', error);
      console.log('📥 [EventsContext] Falling back to local storage');
      
      try {
        const fallbackEvents = await localStorageService.events.getAll();
        console.log('✅ [EventsContext] Successfully fetched events from local storage fallback:', fallbackEvents.length);
        setEvents(fallbackEvents);
      } catch (fallbackError) {
        console.error('❌ [EventsContext] Fallback also failed:', fallbackError);
        setEvents([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [useLocalStorage]);

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
      
      if (useLocalStorage) {
        await localStorageService.events.create(eventWithDefaults);
      } else {
        await trpcClient.events.create.mutate(eventWithDefaults as any);
      }
      
      console.log('✅ [EventsContext] Event added successfully');
      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception adding event:', error);
      throw error;
    }
  }, [fetchEvents, useLocalStorage]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>) => {
    try {
      console.log('✏️ [EventsContext] Updating event:', eventId);
      
      if (useLocalStorage) {
        await localStorageService.events.update(eventId, updates);
      } else {
        await trpcClient.events.update.mutate({ eventId, updates });
      }
      
      console.log('✅ [EventsContext] Event updated successfully');
      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception updating event:', error);
      throw error;
    }
  }, [fetchEvents, useLocalStorage]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      console.log('🗑️ [EventsContext] Deleting event:', eventId);
      
      if (useLocalStorage) {
        await localStorageService.events.delete(eventId);
      } else {
        await trpcClient.events.delete.mutate({ eventId });
      }
      
      console.log('✅ [EventsContext] Event deleted successfully');
      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception deleting event:', error);
      throw error;
    }
  }, [fetchEvents, useLocalStorage]);

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
