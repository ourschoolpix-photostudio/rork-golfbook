import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo } from 'react';
import { Event, EventRegistration, Grouping, Score, EventRolexPoints, FinancialRecord } from '@/types';
import { trpc } from '@/lib/trpc';

export const [EventsProvider, useEvents] = createContextHook(() => {
  const eventsQuery = trpc.events.getAll.useQuery();

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => {
      eventsQuery.refetch();
    },
  });

  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => {
      eventsQuery.refetch();
    },
  });

  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: () => {
      eventsQuery.refetch();
    },
  });

  const registerMutation = trpc.events.register.useMutation({
    onSuccess: () => {
      eventsQuery.refetch();
    },
  });

  const addEvent = useCallback(async (event: Event) => {
    const eventWithDefaults = {
      ...event,
      startDate: event.startDate || event.date,
    };
    await createEventMutation.mutateAsync(eventWithDefaults as any);
  }, [createEventMutation]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>) => {
    await updateEventMutation.mutateAsync({ eventId, updates });
  }, [updateEventMutation]);

  const deleteEvent = useCallback(async (eventId: string) => {
    await deleteEventMutation.mutateAsync({ eventId });
  }, [deleteEventMutation]);

  const addRegistration = useCallback(async (registration: EventRegistration) => {
    await registerMutation.mutateAsync({
      eventId: registration.eventId,
      memberId: registration.memberId,
    });
  }, [registerMutation]);

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

  const createFinancialMutation = trpc.financials.create.useMutation({
    onSuccess: () => {
      eventsQuery.refetch();
    },
  });

  const addFinancial = useCallback(async (financial: FinancialRecord) => {
    await createFinancialMutation.mutateAsync(financial);
  }, [createFinancialMutation]);

  const updateEventPoints = useCallback(async (eventId: string, memberId: string, points: number, position: number) => {
    console.log('updateEventPoints not yet implemented for backend');
  }, []);

  const events = useMemo(() => eventsQuery.data || [], [eventsQuery.data]);
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
  ]);
});
