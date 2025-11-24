import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import type { Event } from "@/types";

const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string().optional().nullable(),
  venue: z.string(),
  status: z.enum(['draft', 'active', 'completed', 'upcoming', 'complete']),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  course: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
  registrationDeadline: z.string().optional().nullable(),
  maxParticipants: z.number().optional().nullable(),
  createdAt: z.string(),
  createdBy: z.string().optional().nullable(),
  type: z.enum(['tournament', 'social']).optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  entryFee: z.string().optional().nullable(),
  numberOfDays: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipcode: z.string().optional().nullable(),
  day1StartTime: z.string().optional().nullable(),
  day1StartPeriod: z.enum(['AM', 'PM']).optional().nullable(),
  day1EndTime: z.string().optional().nullable(),
  day1EndPeriod: z.enum(['AM', 'PM']).optional().nullable(),
  day1Course: z.string().optional().nullable(),
  day1StartType: z.enum(['tee-time', 'shotgun', 'gala', 'happy-hour', 'party']).optional().nullable(),
  day1LeadingHole: z.string().optional().nullable(),
  day1Par: z.string().optional().nullable(),
  day1HolePars: z.array(z.string()).optional().nullable(),
  day2StartTime: z.string().optional().nullable(),
  day2StartPeriod: z.enum(['AM', 'PM']).optional().nullable(),
  day2EndTime: z.string().optional().nullable(),
  day2EndPeriod: z.enum(['AM', 'PM']).optional().nullable(),
  day2Course: z.string().optional().nullable(),
  day2StartType: z.enum(['tee-time', 'shotgun', 'gala', 'happy-hour', 'party']).optional().nullable(),
  day2LeadingHole: z.string().optional().nullable(),
  day2Par: z.string().optional().nullable(),
  day2HolePars: z.array(z.string()).optional().nullable(),
  day3StartTime: z.string().optional().nullable(),
  day3StartPeriod: z.enum(['AM', 'PM']).optional().nullable(),
  day3EndTime: z.string().optional().nullable(),
  day3EndPeriod: z.enum(['AM', 'PM']).optional().nullable(),
  day3Course: z.string().optional().nullable(),
  day3StartType: z.enum(['tee-time', 'shotgun', 'gala', 'happy-hour', 'party']).optional().nullable(),
  day3LeadingHole: z.string().optional().nullable(),
  day3Par: z.string().optional().nullable(),
  day3HolePars: z.array(z.string()).optional().nullable(),
  flightACutoff: z.string().optional().nullable(),
  flightBCutoff: z.string().optional().nullable(),
  flightATeebox: z.string().optional().nullable(),
  flightBTeebox: z.string().optional().nullable(),
  flightLTeebox: z.string().optional().nullable(),
  day1SlopeRating: z.string().optional().nullable(),
  day1CourseRating: z.string().optional().nullable(),
  day2SlopeRating: z.string().optional().nullable(),
  day2CourseRating: z.string().optional().nullable(),
  day3SlopeRating: z.string().optional().nullable(),
  day3CourseRating: z.string().optional().nullable(),
  flightATrophy1st: z.boolean().optional().nullable(),
  flightATrophy2nd: z.boolean().optional().nullable(),
  flightATrophy3rd: z.boolean().optional().nullable(),
  flightBTrophy1st: z.boolean().optional().nullable(),
  flightBTrophy2nd: z.boolean().optional().nullable(),
  flightBTrophy3rd: z.boolean().optional().nullable(),
  flightCTrophy1st: z.boolean().optional().nullable(),
  flightCTrophy2nd: z.boolean().optional().nullable(),
  flightCTrophy3rd: z.boolean().optional().nullable(),
  flightLTrophy1st: z.boolean().optional().nullable(),
  flightLTrophy2nd: z.boolean().optional().nullable(),
  flightLTrophy3rd: z.boolean().optional().nullable(),
  flightACashPrize1st: z.string().optional().nullable(),
  flightACashPrize2nd: z.string().optional().nullable(),
  flightACashPrize3rd: z.string().optional().nullable(),
  flightBCashPrize1st: z.string().optional().nullable(),
  flightBCashPrize2nd: z.string().optional().nullable(),
  flightBCashPrize3rd: z.string().optional().nullable(),
  flightCCashPrize1st: z.string().optional().nullable(),
  flightCCashPrize2nd: z.string().optional().nullable(),
  flightCCashPrize3rd: z.string().optional().nullable(),
  flightLCashPrize1st: z.string().optional().nullable(),
  flightLCashPrize2nd: z.string().optional().nullable(),
  flightLCashPrize3rd: z.string().optional().nullable(),
  lowGrossTrophy: z.boolean().optional().nullable(),
  lowGrossCashPrize: z.string().optional().nullable(),
  closestToPin: z.string().optional().nullable(),
});

function mapEventToDb(event: z.infer<typeof eventSchema>) {
  return {
    id: event.id,
    name: event.name,
    date: event.date,
    start_date: event.startDate,
    end_date: event.endDate,
    venue: event.venue,
    location: event.location,
    course: event.course,
    status: event.status,
    description: event.description,
    memo: event.memo,
    registration_deadline: event.registrationDeadline,
    max_participants: event.maxParticipants,
    created_at: event.createdAt,
    created_by: event.createdBy,
    type: event.type,
    photo_url: event.photoUrl,
    entry_fee: event.entryFee,
    number_of_days: event.numberOfDays,
    address: event.address,
    city: event.city,
    state: event.state,
    zipcode: event.zipcode,
    day1_start_time: event.day1StartTime,
    day1_start_period: event.day1StartPeriod,
    day1_end_time: event.day1EndTime,
    day1_end_period: event.day1EndPeriod,
    day1_course: event.day1Course,
    day1_start_type: event.day1StartType,
    day1_leading_hole: event.day1LeadingHole,
    day1_par: event.day1Par,
    day1_hole_pars: event.day1HolePars,
    day2_start_time: event.day2StartTime,
    day2_start_period: event.day2StartPeriod,
    day2_end_time: event.day2EndTime,
    day2_end_period: event.day2EndPeriod,
    day2_course: event.day2Course,
    day2_start_type: event.day2StartType,
    day2_leading_hole: event.day2LeadingHole,
    day2_par: event.day2Par,
    day2_hole_pars: event.day2HolePars,
    day3_start_time: event.day3StartTime,
    day3_start_period: event.day3StartPeriod,
    day3_end_time: event.day3EndTime,
    day3_end_period: event.day3EndPeriod,
    day3_course: event.day3Course,
    day3_start_type: event.day3StartType,
    day3_leading_hole: event.day3LeadingHole,
    day3_par: event.day3Par,
    day3_hole_pars: event.day3HolePars,
    flight_a_cutoff: event.flightACutoff,
    flight_b_cutoff: event.flightBCutoff,
    flight_a_teebox: event.flightATeebox,
    flight_b_teebox: event.flightBTeebox,
    flight_l_teebox: event.flightLTeebox,
    day1_slope_rating: event.day1SlopeRating,
    day1_course_rating: event.day1CourseRating,
    day2_slope_rating: event.day2SlopeRating,
    day2_course_rating: event.day2CourseRating,
    day3_slope_rating: event.day3SlopeRating,
    day3_course_rating: event.day3CourseRating,
    flight_a_trophy_1st: event.flightATrophy1st,
    flight_a_trophy_2nd: event.flightATrophy2nd,
    flight_a_trophy_3rd: event.flightATrophy3rd,
    flight_b_trophy_1st: event.flightBTrophy1st,
    flight_b_trophy_2nd: event.flightBTrophy2nd,
    flight_b_trophy_3rd: event.flightBTrophy3rd,
    flight_c_trophy_1st: event.flightCTrophy1st,
    flight_c_trophy_2nd: event.flightCTrophy2nd,
    flight_c_trophy_3rd: event.flightCTrophy3rd,
    flight_l_trophy_1st: event.flightLTrophy1st,
    flight_l_trophy_2nd: event.flightLTrophy2nd,
    flight_l_trophy_3rd: event.flightLTrophy3rd,
    flight_a_cash_prize_1st: event.flightACashPrize1st,
    flight_a_cash_prize_2nd: event.flightACashPrize2nd,
    flight_a_cash_prize_3rd: event.flightACashPrize3rd,
    flight_b_cash_prize_1st: event.flightBCashPrize1st,
    flight_b_cash_prize_2nd: event.flightBCashPrize2nd,
    flight_b_cash_prize_3rd: event.flightBCashPrize3rd,
    flight_c_cash_prize_1st: event.flightCCashPrize1st,
    flight_c_cash_prize_2nd: event.flightCCashPrize2nd,
    flight_c_cash_prize_3rd: event.flightCCashPrize3rd,
    flight_l_cash_prize_1st: event.flightLCashPrize1st,
    flight_l_cash_prize_2nd: event.flightLCashPrize2nd,
    flight_l_cash_prize_3rd: event.flightLCashPrize3rd,
    low_gross_trophy: event.lowGrossTrophy,
    low_gross_cash_prize: event.lowGrossCashPrize,
    closest_to_pin: event.closestToPin,
    updated_at: new Date().toISOString(),
  };
}

function mapDbToEvent(e: any, registeredPlayers: string[] = []): Event {
  return {
    id: e.id,
    name: e.name,
    date: e.date,
    startDate: e.start_date,
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
    registeredPlayers,
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
    day1SlopeRating: e.day1_slope_rating,
    day1CourseRating: e.day1_course_rating,
    day2SlopeRating: e.day2_slope_rating,
    day2CourseRating: e.day2_course_rating,
    day3SlopeRating: e.day3_slope_rating,
    day3CourseRating: e.day3_course_rating,
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
  };
}

export const getAllEventsProcedure = publicProcedure
  .query(async () => {
    console.log('📥 Fetching all events from database...');
    
    const { data: eventsData, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching events:', error);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    const { data: registrationsData } = await supabase
      .from('event_registrations')
      .select('event_id, member_id');

    const registrationsByEvent = new Map<string, string[]>();
    (registrationsData || []).forEach(reg => {
      if (!registrationsByEvent.has(reg.event_id)) {
        registrationsByEvent.set(reg.event_id, []);
      }
      registrationsByEvent.get(reg.event_id)?.push(reg.member_id);
    });

    const events = (eventsData || []).map(e => 
      mapDbToEvent(e, registrationsByEvent.get(e.id) || [])
    );

    console.log('✅ Fetched events:', events.length);
    return events;
  });

export const getEventProcedure = publicProcedure
  .input(z.object({ eventId: z.string() }))
  .query(async ({ input }) => {
    console.log('📥 Fetching event:', input.eventId);
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', input.eventId)
      .single();

    if (error) {
      console.error('❌ Error fetching event:', error);
      throw new Error(`Failed to fetch event: ${error.message}`);
    }

    const { data: registrations } = await supabase
      .from('event_registrations')
      .select('member_id')
      .eq('event_id', input.eventId);

    const registeredPlayers = (registrations || []).map(r => r.member_id);

    return mapDbToEvent(data, registeredPlayers);
  });

export const createEventProcedure = publicProcedure
  .input(eventSchema)
  .mutation(async ({ input }) => {
    console.log('➕ Creating event:', input.name);
    
    const eventData = mapEventToDb(input);

    const { error } = await supabase
      .from('events')
      .insert(eventData);

    if (error) {
      console.error('❌ Error creating event:', error);
      throw new Error(`Failed to create event: ${error.message}`);
    }

    console.log('✅ Event created successfully');
    return { success: true, eventId: input.id };
  });

export const updateEventProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
    updates: eventSchema.partial(),
  }))
  .mutation(async ({ input }) => {
    console.log('✏️ Updating event:', input.eventId);
    console.log('Update payload:', JSON.stringify(input.updates, null, 2));
    
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', input.eventId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching existing event:', fetchError);
      throw new Error(`Failed to fetch existing event: ${fetchError.message}`);
    }

    const mergedEvent = {
      ...existingEvent,
      ...input.updates,
      id: input.eventId,
      created_at: existingEvent.created_at,
    };

    const eventData = mapEventToDb(mergedEvent as any);
    delete (eventData as any).created_at;

    console.log('Mapped event data for update:', JSON.stringify(eventData, null, 2));

    const { error } = await supabase
      .from('events')
      .update(eventData)
      .eq('id', input.eventId);

    if (error) {
      console.error('❌ Error updating event:', error);
      throw new Error(`Failed to update event: ${error.message}`);
    }

    console.log('✅ Event updated successfully');
    return { success: true };
  });

export const deleteEventProcedure = publicProcedure
  .input(z.object({ eventId: z.string() }))
  .mutation(async ({ input }) => {
    console.log('🗑️ Deleting event:', input.eventId);
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', input.eventId);

    if (error) {
      console.error('❌ Error deleting event:', error);
      throw new Error(`Failed to delete event: ${error.message}`);
    }

    console.log('✅ Event deleted successfully');
    return { success: true };
  });

export const registerForEventProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
    memberId: z.string(),
    isSponsor: z.boolean().optional(),
  }))
  .mutation(async ({ input }) => {
    console.log('📝 Registering member for event:', input.memberId, input.eventId);
    
    const { error } = await supabase
      .from('event_registrations')
      .insert({
        id: `${input.eventId}-${input.memberId}`,
        event_id: input.eventId,
        member_id: input.memberId,
        status: 'registered',
        registered_at: new Date().toISOString(),
        is_sponsor: input.isSponsor || false,
      });

    if (error) {
      if (error.code === '23505') {
        console.log('ℹ️ Member already registered');
        return { success: true, message: 'Already registered' };
      }
      console.error('❌ Error registering for event:', error);
      throw new Error(`Failed to register for event: ${error.message}`);
    }

    console.log('✅ Registration successful');
    return { success: true };
  });

export const unregisterFromEventProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
    memberId: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('❌ Unregistering member from event:', input.memberId, input.eventId);
    
    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('event_id', input.eventId)
      .eq('member_id', input.memberId);

    if (error) {
      console.error('❌ Error unregistering from event:', error);
      throw new Error(`Failed to unregister from event: ${error.message}`);
    }

    console.log('✅ Unregistration successful');
    return { success: true };
  });

export default {
  getAll: getAllEventsProcedure,
  get: getEventProcedure,
  create: createEventProcedure,
  update: updateEventProcedure,
  delete: deleteEventProcedure,
  register: registerForEventProcedure,
  unregister: unregisterFromEventProcedure,
};
