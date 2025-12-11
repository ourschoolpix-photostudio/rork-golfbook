import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Event, EventRegistration, Grouping, Score, EventRolexPoints, FinancialRecord } from '@/types';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';



export const [EventsProvider, useEvents] = createContextHook(() => {
  const { orgInfo } = useSettings();
  const useLocalStorage = useMemo(() => orgInfo?.useLocalStorage || false, [orgInfo?.useLocalStorage]);
  
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
      
      console.log('📥 [EventsContext] Fetching events from Supabase...');
      const { data, error } = await supabase.from('events').select('*').order('date', { ascending: false });
      
      if (error) throw error;
      
      console.log('📥 [EventsContext] Fetching registrations from Supabase...');
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('event_id, member_id, status');
      
      if (registrationsError) {
        console.error('⚠️ [EventsContext] Failed to fetch registrations:', registrationsError);
      }
      
      const registrationsByEvent = new Map<string, string[]>();
      (registrationsData || []).forEach((reg: any) => {
        if (!registrationsByEvent.has(reg.event_id)) {
          registrationsByEvent.set(reg.event_id, []);
        }
        registrationsByEvent.get(reg.event_id)!.push(reg.member_id);
      });
      
      console.log('✅ [EventsContext] Registrations by event:', Object.fromEntries(registrationsByEvent));
      
      const fetchedEvents = (data || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        date: e.date,
        startDate: e.start_date || e.date,
        endDate: e.end_date,
        venue: e.venue,
        location: e.location,
        course: e.course,
        status: e.status,
        description: e.description,
        memo: e.memo,
        registrationDeadline: e.registration_deadline,
        maxParticipants: e.max_participants,
        createdAt: e.created_at,
        createdBy: e.created_by,
        type: e.type,
        photoUrl: e.photo_url,
        entryFee: e.entry_fee,
        numberOfDays: e.number_of_days,
        address: e.address,
        city: e.city,
        state: e.state,
        zipcode: e.zipcode,
        day1StartTime: e.day1_start_time,
        day1StartPeriod: e.day1_start_period,
        day1EndTime: e.day1_end_time,
        day1EndPeriod: e.day1_end_period,
        day1Course: e.day1_course,
        day1StartType: e.day1_start_type,
        day1LeadingHole: e.day1_leading_hole,
        day1Par: e.day1_par,
        day1HolePars: e.day1_hole_pars,
        day2StartTime: e.day2_start_time,
        day2StartPeriod: e.day2_start_period,
        day2EndTime: e.day2_end_time,
        day2EndPeriod: e.day2_end_period,
        day2Course: e.day2_course,
        day2StartType: e.day2_start_type,
        day2LeadingHole: e.day2_leading_hole,
        day2Par: e.day2_par,
        day2HolePars: e.day2_hole_pars,
        day3StartTime: e.day3_start_time,
        day3StartPeriod: e.day3_start_period,
        day3EndTime: e.day3_end_time,
        day3EndPeriod: e.day3_end_period,
        day3Course: e.day3_course,
        day3StartType: e.day3_start_type,
        day3LeadingHole: e.day3_leading_hole,
        day3Par: e.day3_par,
        day3HolePars: e.day3_hole_pars,
        flightACutoff: e.flight_a_cutoff,
        flightBCutoff: e.flight_b_cutoff,
        flightATeebox: e.flight_a_teebox,
        flightBTeebox: e.flight_b_teebox,
        flightLTeebox: e.flight_l_teebox,
        flightATrophy1st: e.flight_a_trophy_1st,
        flightATrophy2nd: e.flight_a_trophy_2nd,
        flightATrophy3rd: e.flight_a_trophy_3rd,
        flightBTrophy1st: e.flight_b_trophy_1st,
        flightBTrophy2nd: e.flight_b_trophy_2nd,
        flightBTrophy3rd: e.flight_b_trophy_3rd,
        flightCTrophy1st: e.flight_c_trophy_1st,
        flightCTrophy2nd: e.flight_c_trophy_2nd,
        flightCTrophy3rd: e.flight_c_trophy_3rd,
        flightLTrophy1st: e.flight_l_trophy_1st,
        flightLTrophy2nd: e.flight_l_trophy_2nd,
        flightLTrophy3rd: e.flight_l_trophy_3rd,
        flightACashPrize1st: e.flight_a_cash_prize_1st,
        flightACashPrize2nd: e.flight_a_cash_prize_2nd,
        flightACashPrize3rd: e.flight_a_cash_prize_3rd,
        flightBCashPrize1st: e.flight_b_cash_prize_1st,
        flightBCashPrize2nd: e.flight_b_cash_prize_2nd,
        flightBCashPrize3rd: e.flight_b_cash_prize_3rd,
        flightCCashPrize1st: e.flight_c_cash_prize_1st,
        flightCCashPrize2nd: e.flight_c_cash_prize_2nd,
        flightCCashPrize3rd: e.flight_c_cash_prize_3rd,
        flightLCashPrize1st: e.flight_l_cash_prize_1st,
        flightLCashPrize2nd: e.flight_l_cash_prize_2nd,
        flightLCashPrize3rd: e.flight_l_cash_prize_3rd,
        lowGrossTrophy: e.low_gross_trophy,
        lowGrossCashPrize: e.low_gross_cash_prize,
        closestToPin: e.closest_to_pin,
        archived: e.archived || false,
        archivedAt: e.archived_at,
        registeredPlayers: registrationsByEvent.get(e.id) || [],
      }));
      
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
        const { error } = await supabase.from('events').insert({
          id: eventWithDefaults.id,
          name: eventWithDefaults.name,
          date: eventWithDefaults.date,
          start_date: eventWithDefaults.startDate,
          end_date: eventWithDefaults.endDate,
          venue: eventWithDefaults.venue,
          location: eventWithDefaults.location,
          course: eventWithDefaults.course,
          status: eventWithDefaults.status,
          description: eventWithDefaults.description,
          memo: eventWithDefaults.memo,
          registration_deadline: eventWithDefaults.registrationDeadline,
          max_participants: eventWithDefaults.maxParticipants,
          created_by: eventWithDefaults.createdBy,
          type: eventWithDefaults.type,
          photo_url: eventWithDefaults.photoUrl,
          entry_fee: eventWithDefaults.entryFee,
          number_of_days: eventWithDefaults.numberOfDays,
          address: eventWithDefaults.address,
          city: eventWithDefaults.city,
          state: eventWithDefaults.state,
          zipcode: eventWithDefaults.zipcode,
          day1_start_time: eventWithDefaults.day1StartTime,
          day1_start_period: eventWithDefaults.day1StartPeriod,
          day1_end_time: eventWithDefaults.day1EndTime,
          day1_end_period: eventWithDefaults.day1EndPeriod,
          day1_course: eventWithDefaults.day1Course,
          day1_start_type: eventWithDefaults.day1StartType,
          day1_leading_hole: eventWithDefaults.day1LeadingHole,
          day1_par: eventWithDefaults.day1Par,
          day1_hole_pars: eventWithDefaults.day1HolePars,
          day2_start_time: eventWithDefaults.day2StartTime,
          day2_start_period: eventWithDefaults.day2StartPeriod,
          day2_end_time: eventWithDefaults.day2EndTime,
          day2_end_period: eventWithDefaults.day2EndPeriod,
          day2_course: eventWithDefaults.day2Course,
          day2_start_type: eventWithDefaults.day2StartType,
          day2_leading_hole: eventWithDefaults.day2LeadingHole,
          day2_par: eventWithDefaults.day2Par,
          day2_hole_pars: eventWithDefaults.day2HolePars,
          day3_start_time: eventWithDefaults.day3StartTime,
          day3_start_period: eventWithDefaults.day3StartPeriod,
          day3_end_time: eventWithDefaults.day3EndTime,
          day3_end_period: eventWithDefaults.day3EndPeriod,
          day3_course: eventWithDefaults.day3Course,
          day3_start_type: eventWithDefaults.day3StartType,
          day3_leading_hole: eventWithDefaults.day3LeadingHole,
          day3_par: eventWithDefaults.day3Par,
          day3_hole_pars: eventWithDefaults.day3HolePars,
          flight_a_cutoff: eventWithDefaults.flightACutoff,
          flight_b_cutoff: eventWithDefaults.flightBCutoff,
          flight_a_teebox: eventWithDefaults.flightATeebox,
          flight_b_teebox: eventWithDefaults.flightBTeebox,
          flight_l_teebox: eventWithDefaults.flightLTeebox,
          flight_a_trophy_1st: eventWithDefaults.flightATrophy1st,
          flight_a_trophy_2nd: eventWithDefaults.flightATrophy2nd,
          flight_a_trophy_3rd: eventWithDefaults.flightATrophy3rd,
          flight_b_trophy_1st: eventWithDefaults.flightBTrophy1st,
          flight_b_trophy_2nd: eventWithDefaults.flightBTrophy2nd,
          flight_b_trophy_3rd: eventWithDefaults.flightBTrophy3rd,
          flight_c_trophy_1st: eventWithDefaults.flightCTrophy1st,
          flight_c_trophy_2nd: eventWithDefaults.flightCTrophy2nd,
          flight_c_trophy_3rd: eventWithDefaults.flightCTrophy3rd,
          flight_l_trophy_1st: eventWithDefaults.flightLTrophy1st,
          flight_l_trophy_2nd: eventWithDefaults.flightLTrophy2nd,
          flight_l_trophy_3rd: eventWithDefaults.flightLTrophy3rd,
          flight_a_cash_prize_1st: eventWithDefaults.flightACashPrize1st,
          flight_a_cash_prize_2nd: eventWithDefaults.flightACashPrize2nd,
          flight_a_cash_prize_3rd: eventWithDefaults.flightACashPrize3rd,
          flight_b_cash_prize_1st: eventWithDefaults.flightBCashPrize1st,
          flight_b_cash_prize_2nd: eventWithDefaults.flightBCashPrize2nd,
          flight_b_cash_prize_3rd: eventWithDefaults.flightBCashPrize3rd,
          flight_c_cash_prize_1st: eventWithDefaults.flightCCashPrize1st,
          flight_c_cash_prize_2nd: eventWithDefaults.flightCCashPrize2nd,
          flight_c_cash_prize_3rd: eventWithDefaults.flightCCashPrize3rd,
          flight_l_cash_prize_1st: eventWithDefaults.flightLCashPrize1st,
          flight_l_cash_prize_2nd: eventWithDefaults.flightLCashPrize2nd,
          flight_l_cash_prize_3rd: eventWithDefaults.flightLCashPrize3rd,
          low_gross_trophy: eventWithDefaults.lowGrossTrophy,
          low_gross_cash_prize: eventWithDefaults.lowGrossCashPrize,
          closest_to_pin: eventWithDefaults.closestToPin,
          archived: eventWithDefaults.archived || false,
          archived_at: eventWithDefaults.archivedAt,
        });
        
        if (error) throw error;
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
        const supabaseUpdates: any = {};
        if (updates.name !== undefined) supabaseUpdates.name = updates.name;
        if (updates.date !== undefined) supabaseUpdates.date = updates.date;
        if (updates.startDate !== undefined) supabaseUpdates.start_date = updates.startDate;
        if (updates.endDate !== undefined) supabaseUpdates.end_date = updates.endDate;
        if (updates.venue !== undefined) supabaseUpdates.venue = updates.venue;
        if (updates.location !== undefined) supabaseUpdates.location = updates.location;
        if (updates.course !== undefined) supabaseUpdates.course = updates.course;
        if (updates.status !== undefined) supabaseUpdates.status = updates.status;
        if (updates.description !== undefined) supabaseUpdates.description = updates.description;
        if (updates.memo !== undefined) supabaseUpdates.memo = updates.memo;
        if (updates.registrationDeadline !== undefined) supabaseUpdates.registration_deadline = updates.registrationDeadline;
        if (updates.maxParticipants !== undefined) supabaseUpdates.max_participants = updates.maxParticipants;
        if (updates.type !== undefined) supabaseUpdates.type = updates.type;
        if (updates.photoUrl !== undefined) supabaseUpdates.photo_url = updates.photoUrl;
        if (updates.entryFee !== undefined) supabaseUpdates.entry_fee = updates.entryFee;
        if (updates.numberOfDays !== undefined) supabaseUpdates.number_of_days = updates.numberOfDays;
        if (updates.address !== undefined) supabaseUpdates.address = updates.address;
        if (updates.city !== undefined) supabaseUpdates.city = updates.city;
        if (updates.state !== undefined) supabaseUpdates.state = updates.state;
        if (updates.zipcode !== undefined) supabaseUpdates.zipcode = updates.zipcode;
        if (updates.day1StartTime !== undefined) supabaseUpdates.day1_start_time = updates.day1StartTime;
        if (updates.day1StartPeriod !== undefined) supabaseUpdates.day1_start_period = updates.day1StartPeriod;
        if (updates.day1EndTime !== undefined) supabaseUpdates.day1_end_time = updates.day1EndTime;
        if (updates.day1EndPeriod !== undefined) supabaseUpdates.day1_end_period = updates.day1EndPeriod;
        if (updates.day1Course !== undefined) supabaseUpdates.day1_course = updates.day1Course;
        if (updates.day1StartType !== undefined) supabaseUpdates.day1_start_type = updates.day1StartType;
        if (updates.day1LeadingHole !== undefined) supabaseUpdates.day1_leading_hole = updates.day1LeadingHole;
        if (updates.day1Par !== undefined) supabaseUpdates.day1_par = updates.day1Par;
        if (updates.day1HolePars !== undefined) supabaseUpdates.day1_hole_pars = updates.day1HolePars;
        if (updates.day2StartTime !== undefined) supabaseUpdates.day2_start_time = updates.day2StartTime;
        if (updates.day2StartPeriod !== undefined) supabaseUpdates.day2_start_period = updates.day2StartPeriod;
        if (updates.day2EndTime !== undefined) supabaseUpdates.day2_end_time = updates.day2EndTime;
        if (updates.day2EndPeriod !== undefined) supabaseUpdates.day2_end_period = updates.day2EndPeriod;
        if (updates.day2Course !== undefined) supabaseUpdates.day2_course = updates.day2Course;
        if (updates.day2StartType !== undefined) supabaseUpdates.day2_start_type = updates.day2StartType;
        if (updates.day2LeadingHole !== undefined) supabaseUpdates.day2_leading_hole = updates.day2LeadingHole;
        if (updates.day2Par !== undefined) supabaseUpdates.day2_par = updates.day2Par;
        if (updates.day2HolePars !== undefined) supabaseUpdates.day2_hole_pars = updates.day2HolePars;
        if (updates.day3StartTime !== undefined) supabaseUpdates.day3_start_time = updates.day3StartTime;
        if (updates.day3StartPeriod !== undefined) supabaseUpdates.day3_start_period = updates.day3StartPeriod;
        if (updates.day3EndTime !== undefined) supabaseUpdates.day3_end_time = updates.day3EndTime;
        if (updates.day3EndPeriod !== undefined) supabaseUpdates.day3_end_period = updates.day3EndPeriod;
        if (updates.day3Course !== undefined) supabaseUpdates.day3_course = updates.day3Course;
        if (updates.day3StartType !== undefined) supabaseUpdates.day3_start_type = updates.day3StartType;
        if (updates.day3LeadingHole !== undefined) supabaseUpdates.day3_leading_hole = updates.day3LeadingHole;
        if (updates.day3Par !== undefined) supabaseUpdates.day3_par = updates.day3Par;
        if (updates.day3HolePars !== undefined) supabaseUpdates.day3_hole_pars = updates.day3HolePars;
        if (updates.flightACutoff !== undefined) supabaseUpdates.flight_a_cutoff = updates.flightACutoff;
        if (updates.flightBCutoff !== undefined) supabaseUpdates.flight_b_cutoff = updates.flightBCutoff;
        if (updates.flightATeebox !== undefined) supabaseUpdates.flight_a_teebox = updates.flightATeebox;
        if (updates.flightBTeebox !== undefined) supabaseUpdates.flight_b_teebox = updates.flightBTeebox;
        if (updates.flightLTeebox !== undefined) supabaseUpdates.flight_l_teebox = updates.flightLTeebox;
        if (updates.flightATrophy1st !== undefined) supabaseUpdates.flight_a_trophy_1st = updates.flightATrophy1st;
        if (updates.flightATrophy2nd !== undefined) supabaseUpdates.flight_a_trophy_2nd = updates.flightATrophy2nd;
        if (updates.flightATrophy3rd !== undefined) supabaseUpdates.flight_a_trophy_3rd = updates.flightATrophy3rd;
        if (updates.flightBTrophy1st !== undefined) supabaseUpdates.flight_b_trophy_1st = updates.flightBTrophy1st;
        if (updates.flightBTrophy2nd !== undefined) supabaseUpdates.flight_b_trophy_2nd = updates.flightBTrophy2nd;
        if (updates.flightBTrophy3rd !== undefined) supabaseUpdates.flight_b_trophy_3rd = updates.flightBTrophy3rd;
        if (updates.flightCTrophy1st !== undefined) supabaseUpdates.flight_c_trophy_1st = updates.flightCTrophy1st;
        if (updates.flightCTrophy2nd !== undefined) supabaseUpdates.flight_c_trophy_2nd = updates.flightCTrophy2nd;
        if (updates.flightCTrophy3rd !== undefined) supabaseUpdates.flight_c_trophy_3rd = updates.flightCTrophy3rd;
        if (updates.flightLTrophy1st !== undefined) supabaseUpdates.flight_l_trophy_1st = updates.flightLTrophy1st;
        if (updates.flightLTrophy2nd !== undefined) supabaseUpdates.flight_l_trophy_2nd = updates.flightLTrophy2nd;
        if (updates.flightLTrophy3rd !== undefined) supabaseUpdates.flight_l_trophy_3rd = updates.flightLTrophy3rd;
        if (updates.flightACashPrize1st !== undefined) supabaseUpdates.flight_a_cash_prize_1st = updates.flightACashPrize1st;
        if (updates.flightACashPrize2nd !== undefined) supabaseUpdates.flight_a_cash_prize_2nd = updates.flightACashPrize2nd;
        if (updates.flightACashPrize3rd !== undefined) supabaseUpdates.flight_a_cash_prize_3rd = updates.flightACashPrize3rd;
        if (updates.flightBCashPrize1st !== undefined) supabaseUpdates.flight_b_cash_prize_1st = updates.flightBCashPrize1st;
        if (updates.flightBCashPrize2nd !== undefined) supabaseUpdates.flight_b_cash_prize_2nd = updates.flightBCashPrize2nd;
        if (updates.flightBCashPrize3rd !== undefined) supabaseUpdates.flight_b_cash_prize_3rd = updates.flightBCashPrize3rd;
        if (updates.flightCCashPrize1st !== undefined) supabaseUpdates.flight_c_cash_prize_1st = updates.flightCCashPrize1st;
        if (updates.flightCCashPrize2nd !== undefined) supabaseUpdates.flight_c_cash_prize_2nd = updates.flightCCashPrize2nd;
        if (updates.flightCCashPrize3rd !== undefined) supabaseUpdates.flight_c_cash_prize_3rd = updates.flightCCashPrize3rd;
        if (updates.flightLCashPrize1st !== undefined) supabaseUpdates.flight_l_cash_prize_1st = updates.flightLCashPrize1st;
        if (updates.flightLCashPrize2nd !== undefined) supabaseUpdates.flight_l_cash_prize_2nd = updates.flightLCashPrize2nd;
        if (updates.flightLCashPrize3rd !== undefined) supabaseUpdates.flight_l_cash_prize_3rd = updates.flightLCashPrize3rd;
        if (updates.lowGrossTrophy !== undefined) supabaseUpdates.low_gross_trophy = updates.lowGrossTrophy;
        if (updates.lowGrossCashPrize !== undefined) supabaseUpdates.low_gross_cash_prize = updates.lowGrossCashPrize;
        if (updates.closestToPin !== undefined) supabaseUpdates.closest_to_pin = updates.closestToPin;
        if (updates.archived !== undefined) supabaseUpdates.archived = updates.archived;
        if (updates.archivedAt !== undefined) supabaseUpdates.archived_at = updates.archivedAt;
        
        const { error } = await supabase
          .from('events')
          .update(supabaseUpdates)
          .eq('id', eventId);
        
        if (error) throw error;
      }
      
      console.log('✅ [EventsContext] Event updated successfully');
      await fetchEvents();
    } catch (error) {
      console.error('❌ [EventsContext] Exception updating event:', error instanceof Error ? error.message : JSON.stringify(error));
      console.error('❌ [EventsContext] Full error object:', error);
      throw error;
    }
  }, [fetchEvents, useLocalStorage]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      console.log('🗑️ [EventsContext] Deleting event:', eventId);
      
      if (useLocalStorage) {
        await localStorageService.events.delete(eventId);
      } else {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', eventId);
        
        if (error) throw error;
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
