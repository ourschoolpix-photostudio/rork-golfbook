import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Event, EventRegistration, Grouping, Score, EventRolexPoints, FinancialRecord } from '@/types';
import { supabase } from '@/integrations/supabase/client';

function transformEventFromDB(dbEvent: any): Event {
  return {
    id: dbEvent.id,
    name: dbEvent.name,
    date: dbEvent.date,
    startDate: dbEvent.start_date,
    endDate: dbEvent.end_date,
    venue: dbEvent.venue,
    location: dbEvent.location,
    course: dbEvent.course,
    status: dbEvent.status,
    description: dbEvent.description,
    memo: dbEvent.memo,
    registrationDeadline: dbEvent.registration_deadline,
    maxParticipants: dbEvent.max_participants,
    createdAt: dbEvent.created_at,
    createdBy: dbEvent.created_by,
    type: dbEvent.type,
    photoUrl: dbEvent.photo_url,
    entryFee: dbEvent.entry_fee,
    numberOfDays: dbEvent.number_of_days,
    address: dbEvent.address,
    city: dbEvent.city,
    state: dbEvent.state,
    zipcode: dbEvent.zipcode,
    day1StartTime: dbEvent.day1_start_time,
    day1StartPeriod: dbEvent.day1_start_period,
    day1EndTime: dbEvent.day1_end_time,
    day1EndPeriod: dbEvent.day1_end_period,
    day1Course: dbEvent.day1_course,
    day1StartType: dbEvent.day1_start_type,
    day1LeadingHole: dbEvent.day1_leading_hole,
    day1Par: dbEvent.day1_par,
    day1HolePars: dbEvent.day1_hole_pars,
    day2StartTime: dbEvent.day2_start_time,
    day2StartPeriod: dbEvent.day2_start_period,
    day2EndTime: dbEvent.day2_end_time,
    day2EndPeriod: dbEvent.day2_end_period,
    day2Course: dbEvent.day2_course,
    day2StartType: dbEvent.day2_start_type,
    day2LeadingHole: dbEvent.day2_leading_hole,
    day2Par: dbEvent.day2_par,
    day2HolePars: dbEvent.day2_hole_pars,
    day3StartTime: dbEvent.day3_start_time,
    day3StartPeriod: dbEvent.day3_start_period,
    day3EndTime: dbEvent.day3_end_time,
    day3EndPeriod: dbEvent.day3_end_period,
    day3Course: dbEvent.day3_course,
    day3StartType: dbEvent.day3_start_type,
    day3LeadingHole: dbEvent.day3_leading_hole,
    day3Par: dbEvent.day3_par,
    day3HolePars: dbEvent.day3_hole_pars,
    flightACutoff: dbEvent.flight_a_cutoff,
    flightBCutoff: dbEvent.flight_b_cutoff,
    flightATeebox: dbEvent.flight_a_teebox,
    flightBTeebox: dbEvent.flight_b_teebox,
    flightLTeebox: dbEvent.flight_l_teebox,
    flightATrophy1st: dbEvent.flight_a_trophy_1st,
    flightATrophy2nd: dbEvent.flight_a_trophy_2nd,
    flightATrophy3rd: dbEvent.flight_a_trophy_3rd,
    flightBTrophy1st: dbEvent.flight_b_trophy_1st,
    flightBTrophy2nd: dbEvent.flight_b_trophy_2nd,
    flightBTrophy3rd: dbEvent.flight_b_trophy_3rd,
    flightCTrophy1st: dbEvent.flight_c_trophy_1st,
    flightCTrophy2nd: dbEvent.flight_c_trophy_2nd,
    flightCTrophy3rd: dbEvent.flight_c_trophy_3rd,
    flightLTrophy1st: dbEvent.flight_l_trophy_1st,
    flightLTrophy2nd: dbEvent.flight_l_trophy_2nd,
    flightLTrophy3rd: dbEvent.flight_l_trophy_3rd,
    flightACashPrize1st: dbEvent.flight_a_cash_prize_1st,
    flightACashPrize2nd: dbEvent.flight_a_cash_prize_2nd,
    flightACashPrize3rd: dbEvent.flight_a_cash_prize_3rd,
    flightBCashPrize1st: dbEvent.flight_b_cash_prize_1st,
    flightBCashPrize2nd: dbEvent.flight_b_cash_prize_2nd,
    flightBCashPrize3rd: dbEvent.flight_b_cash_prize_3rd,
    flightCCashPrize1st: dbEvent.flight_c_cash_prize_1st,
    flightCCashPrize2nd: dbEvent.flight_c_cash_prize_2nd,
    flightCCashPrize3rd: dbEvent.flight_c_cash_prize_3rd,
    flightLCashPrize1st: dbEvent.flight_l_cash_prize_1st,
    flightLCashPrize2nd: dbEvent.flight_l_cash_prize_2nd,
    flightLCashPrize3rd: dbEvent.flight_l_cash_prize_3rd,
    lowGrossTrophy: dbEvent.low_gross_trophy,
    lowGrossCashPrize: dbEvent.low_gross_cash_prize,
    closestToPin: dbEvent.closest_to_pin,
  };
}

function transformEventToDB(event: Partial<Event>): any {
  const dbEvent: any = {};
  if (event.id !== undefined) dbEvent.id = event.id;
  if (event.name !== undefined) dbEvent.name = event.name;
  if (event.date !== undefined) dbEvent.date = event.date;
  if (event.startDate !== undefined) dbEvent.start_date = event.startDate;
  if (event.endDate !== undefined) dbEvent.end_date = event.endDate;
  if (event.venue !== undefined) dbEvent.venue = event.venue;
  if (event.location !== undefined) dbEvent.location = event.location;
  if (event.course !== undefined) dbEvent.course = event.course;
  if (event.status !== undefined) dbEvent.status = event.status;
  if (event.description !== undefined) dbEvent.description = event.description;
  if (event.memo !== undefined) dbEvent.memo = event.memo;
  if (event.registrationDeadline !== undefined) dbEvent.registration_deadline = event.registrationDeadline;
  if (event.maxParticipants !== undefined) dbEvent.max_participants = event.maxParticipants;
  if (event.createdAt !== undefined) dbEvent.created_at = event.createdAt;
  if (event.createdBy !== undefined) dbEvent.created_by = event.createdBy;
  if (event.type !== undefined) dbEvent.type = event.type;
  if (event.photoUrl !== undefined) dbEvent.photo_url = event.photoUrl;
  if (event.entryFee !== undefined) dbEvent.entry_fee = event.entryFee;
  if (event.numberOfDays !== undefined) dbEvent.number_of_days = event.numberOfDays;
  if (event.address !== undefined) dbEvent.address = event.address;
  if (event.city !== undefined) dbEvent.city = event.city;
  if (event.state !== undefined) dbEvent.state = event.state;
  if (event.zipcode !== undefined) dbEvent.zipcode = event.zipcode;
  if (event.day1StartTime !== undefined) dbEvent.day1_start_time = event.day1StartTime;
  if (event.day1StartPeriod !== undefined) dbEvent.day1_start_period = event.day1StartPeriod;
  if (event.day1EndTime !== undefined) dbEvent.day1_end_time = event.day1EndTime;
  if (event.day1EndPeriod !== undefined) dbEvent.day1_end_period = event.day1EndPeriod;
  if (event.day1Course !== undefined) dbEvent.day1_course = event.day1Course;
  if (event.day1StartType !== undefined) dbEvent.day1_start_type = event.day1StartType;
  if (event.day1LeadingHole !== undefined) dbEvent.day1_leading_hole = event.day1LeadingHole;
  if (event.day1Par !== undefined) dbEvent.day1_par = event.day1Par;
  if (event.day1HolePars !== undefined) dbEvent.day1_hole_pars = event.day1HolePars;
  if (event.day2StartTime !== undefined) dbEvent.day2_start_time = event.day2StartTime;
  if (event.day2StartPeriod !== undefined) dbEvent.day2_start_period = event.day2StartPeriod;
  if (event.day2EndTime !== undefined) dbEvent.day2_end_time = event.day2EndTime;
  if (event.day2EndPeriod !== undefined) dbEvent.day2_end_period = event.day2EndPeriod;
  if (event.day2Course !== undefined) dbEvent.day2_course = event.day2Course;
  if (event.day2StartType !== undefined) dbEvent.day2_start_type = event.day2StartType;
  if (event.day2LeadingHole !== undefined) dbEvent.day2_leading_hole = event.day2LeadingHole;
  if (event.day2Par !== undefined) dbEvent.day2_par = event.day2Par;
  if (event.day2HolePars !== undefined) dbEvent.day2_hole_pars = event.day2HolePars;
  if (event.day3StartTime !== undefined) dbEvent.day3_start_time = event.day3StartTime;
  if (event.day3StartPeriod !== undefined) dbEvent.day3_start_period = event.day3StartPeriod;
  if (event.day3EndTime !== undefined) dbEvent.day3_end_time = event.day3EndTime;
  if (event.day3EndPeriod !== undefined) dbEvent.day3_end_period = event.day3EndPeriod;
  if (event.day3Course !== undefined) dbEvent.day3_course = event.day3Course;
  if (event.day3StartType !== undefined) dbEvent.day3_start_type = event.day3StartType;
  if (event.day3LeadingHole !== undefined) dbEvent.day3_leading_hole = event.day3LeadingHole;
  if (event.day3Par !== undefined) dbEvent.day3_par = event.day3Par;
  if (event.day3HolePars !== undefined) dbEvent.day3_hole_pars = event.day3HolePars;
  if (event.flightACutoff !== undefined) dbEvent.flight_a_cutoff = event.flightACutoff;
  if (event.flightBCutoff !== undefined) dbEvent.flight_b_cutoff = event.flightBCutoff;
  if (event.flightATeebox !== undefined) dbEvent.flight_a_teebox = event.flightATeebox;
  if (event.flightBTeebox !== undefined) dbEvent.flight_b_teebox = event.flightBTeebox;
  if (event.flightLTeebox !== undefined) dbEvent.flight_l_teebox = event.flightLTeebox;
  if (event.flightATrophy1st !== undefined) dbEvent.flight_a_trophy_1st = event.flightATrophy1st;
  if (event.flightATrophy2nd !== undefined) dbEvent.flight_a_trophy_2nd = event.flightATrophy2nd;
  if (event.flightATrophy3rd !== undefined) dbEvent.flight_a_trophy_3rd = event.flightATrophy3rd;
  if (event.flightBTrophy1st !== undefined) dbEvent.flight_b_trophy_1st = event.flightBTrophy1st;
  if (event.flightBTrophy2nd !== undefined) dbEvent.flight_b_trophy_2nd = event.flightBTrophy2nd;
  if (event.flightBTrophy3rd !== undefined) dbEvent.flight_b_trophy_3rd = event.flightBTrophy3rd;
  if (event.flightCTrophy1st !== undefined) dbEvent.flight_c_trophy_1st = event.flightCTrophy1st;
  if (event.flightCTrophy2nd !== undefined) dbEvent.flight_c_trophy_2nd = event.flightCTrophy2nd;
  if (event.flightCTrophy3rd !== undefined) dbEvent.flight_c_trophy_3rd = event.flightCTrophy3rd;
  if (event.flightLTrophy1st !== undefined) dbEvent.flight_l_trophy_1st = event.flightLTrophy1st;
  if (event.flightLTrophy2nd !== undefined) dbEvent.flight_l_trophy_2nd = event.flightLTrophy2nd;
  if (event.flightLTrophy3rd !== undefined) dbEvent.flight_l_trophy_3rd = event.flightLTrophy3rd;
  if (event.flightACashPrize1st !== undefined) dbEvent.flight_a_cash_prize_1st = event.flightACashPrize1st;
  if (event.flightACashPrize2nd !== undefined) dbEvent.flight_a_cash_prize_2nd = event.flightACashPrize2nd;
  if (event.flightACashPrize3rd !== undefined) dbEvent.flight_a_cash_prize_3rd = event.flightACashPrize3rd;
  if (event.flightBCashPrize1st !== undefined) dbEvent.flight_b_cash_prize_1st = event.flightBCashPrize1st;
  if (event.flightBCashPrize2nd !== undefined) dbEvent.flight_b_cash_prize_2nd = event.flightBCashPrize2nd;
  if (event.flightBCashPrize3rd !== undefined) dbEvent.flight_b_cash_prize_3rd = event.flightBCashPrize3rd;
  if (event.flightCCashPrize1st !== undefined) dbEvent.flight_c_cash_prize_1st = event.flightCCashPrize1st;
  if (event.flightCCashPrize2nd !== undefined) dbEvent.flight_c_cash_prize_2nd = event.flightCCashPrize2nd;
  if (event.flightCCashPrize3rd !== undefined) dbEvent.flight_c_cash_prize_3rd = event.flightCCashPrize3rd;
  if (event.flightLCashPrize1st !== undefined) dbEvent.flight_l_cash_prize_1st = event.flightLCashPrize1st;
  if (event.flightLCashPrize2nd !== undefined) dbEvent.flight_l_cash_prize_2nd = event.flightLCashPrize2nd;
  if (event.flightLCashPrize3rd !== undefined) dbEvent.flight_l_cash_prize_3rd = event.flightLCashPrize3rd;
  if (event.lowGrossTrophy !== undefined) dbEvent.low_gross_trophy = event.lowGrossTrophy;
  if (event.lowGrossCashPrize !== undefined) dbEvent.low_gross_cash_prize = event.lowGrossCashPrize;
  if (event.closestToPin !== undefined) dbEvent.closest_to_pin = event.closestToPin;
  return dbEvent;
}

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
        console.error('❌ [EventsContext] Failed to fetch events:', JSON.stringify(error, null, 2));
        return;
      }

      console.log('✅ [EventsContext] Successfully fetched events:', data?.length || 0);
      const transformedEvents = (data || []).map(transformEventFromDB);
      setEvents(transformedEvents);
    } catch (error) {
      console.error('❌ [EventsContext] Exception fetching events:', error instanceof Error ? error.message : String(error));
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
      const dbEvent = transformEventToDB(eventWithDefaults);
      
      const { error } = await supabase
        .from('events')
        .insert([dbEvent]);

      if (error) {
        console.error('❌ [EventsContext] Failed to add event:', JSON.stringify(error, null, 2));
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception adding event:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [fetchEvents]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>) => {
    try {
      const dbUpdates = transformEventToDB(updates);
      const { error } = await supabase
        .from('events')
        .update(dbUpdates)
        .eq('id', eventId);

      if (error) {
        console.error('❌ [EventsContext] Failed to update event:', JSON.stringify(error, null, 2));
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception updating event:', error instanceof Error ? error.message : String(error));
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
        console.error('❌ [EventsContext] Failed to delete event:', JSON.stringify(error, null, 2));
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception deleting event:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [fetchEvents]);

  const addRegistration = useCallback(async (registration: EventRegistration) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert([registration]);

      if (error) {
        console.error('❌ [EventsContext] Failed to add registration:', JSON.stringify(error, null, 2));
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception adding registration:', error instanceof Error ? error.message : String(error));
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
        console.error('❌ [EventsContext] Failed to add financial record:', JSON.stringify(error, null, 2));
        throw error;
      }

      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception adding financial record:', error instanceof Error ? error.message : String(error));
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
