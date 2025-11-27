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
  startDate: z.string().optional().nullable(),
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
  day1Course: z.string().optional().nullable(),
  day1StartType: z.enum(['tee-time', 'shotgun', 'gala', 'happy-hour', 'party']).optional().nullable(),
  day1LeadingHole: z.string().optional().nullable(),
  day1Par: z.string().optional().nullable(),
  day1HolePars: z.array(z.string()).optional().nullable(),
  day2StartTime: z.string().optional().nullable(),
  day2StartPeriod: z.enum(['AM', 'PM']).optional().nullable(),
  day2Course: z.string().optional().nullable(),
  day2StartType: z.enum(['tee-time', 'shotgun', 'gala', 'happy-hour', 'party']).optional().nullable(),
  day2LeadingHole: z.string().optional().nullable(),
  day2Par: z.string().optional().nullable(),
  day2HolePars: z.array(z.string()).optional().nullable(),
  day3StartTime: z.string().optional().nullable(),
  day3StartPeriod: z.enum(['AM', 'PM']).optional().nullable(),
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
  registeredPlayers: z.array(z.string()).optional().nullable(),
});

export const syncEventProcedure = publicProcedure
  .input(z.object({
    event: eventSchema,
    syncedBy: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('🔄 Syncing event to Supabase...', input.event.id);
    
    const eventToUpsert = {
      id: input.event.id,
      name: input.event.name,
      date: input.event.date,
      start_date: input.event.startDate,
      end_date: input.event.endDate,
      venue: input.event.venue,
      location: input.event.location,
      course: input.event.course,
      status: input.event.status,
      description: input.event.description,
      memo: input.event.memo,
      registration_deadline: input.event.registrationDeadline,
      max_participants: input.event.maxParticipants,
      created_at: input.event.createdAt,
      created_by: input.event.createdBy,
      type: input.event.type,
      photo_url: input.event.photoUrl,
      entry_fee: input.event.entryFee,
      number_of_days: input.event.numberOfDays,
      address: input.event.address,
      city: input.event.city,
      state: input.event.state,
      zipcode: input.event.zipcode,
      day1_start_time: input.event.day1StartTime,
      day1_start_period: input.event.day1StartPeriod,
      day1_course: input.event.day1Course,
      day1_start_type: input.event.day1StartType,
      day1_leading_hole: input.event.day1LeadingHole,
      day1_par: input.event.day1Par,
      day1_hole_pars: input.event.day1HolePars,
      day2_start_time: input.event.day2StartTime,
      day2_start_period: input.event.day2StartPeriod,
      day2_course: input.event.day2Course,
      day2_start_type: input.event.day2StartType,
      day2_leading_hole: input.event.day2LeadingHole,
      day2_par: input.event.day2Par,
      day2_hole_pars: input.event.day2HolePars,
      day3_start_time: input.event.day3StartTime,
      day3_start_period: input.event.day3StartPeriod,
      day3_course: input.event.day3Course,
      day3_start_type: input.event.day3StartType,
      day3_leading_hole: input.event.day3LeadingHole,
      day3_par: input.event.day3Par,
      day3_hole_pars: input.event.day3HolePars,
      flight_a_cutoff: input.event.flightACutoff,
      flight_b_cutoff: input.event.flightBCutoff,
      flight_a_teebox: input.event.flightATeebox,
      flight_b_teebox: input.event.flightBTeebox,
      flight_l_teebox: input.event.flightLTeebox,
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('events')
      .upsert(eventToUpsert, { onConflict: 'id' });

    if (error) {
      console.error('❌ Error syncing event:', error);
      throw new Error(`Failed to sync event: ${error.message}`);
    }

    if (input.event.registeredPlayers && input.event.registeredPlayers.length > 0) {
      const registrations = input.event.registeredPlayers.map(memberId => ({
        id: `${input.event.id}-${memberId}`,
        event_id: input.event.id,
        member_id: memberId,
        status: 'registered' as const,
        registered_at: new Date().toISOString(),
      }));

      const { error: regError } = await supabase
        .from('event_registrations')
        .upsert(registrations, { onConflict: 'event_id,member_id' });

      if (regError) {
        console.error('❌ Error syncing registrations:', regError);
      }
    }

    const { error: syncError } = await supabase
      .from('sync_status')
      .upsert({
        id: `event-${input.event.id}`,
        entity_type: 'event',
        entity_id: input.event.id,
        last_synced_at: new Date().toISOString(),
        synced_by: input.syncedBy,
        sync_version: Date.now(),
      }, { onConflict: 'entity_type,entity_id' });

    if (syncError) {
      console.error('❌ Error updating sync status:', syncError);
    }

    console.log('✅ Event synced successfully');
    return { success: true, eventId: input.event.id };
  });

export const getEventsProcedure = publicProcedure
  .query(async () => {
    console.log('📥 Fetching events from Supabase...');
    
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

    const events: Event[] = (eventsData || []).map(e => ({
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
      registeredPlayers: registrationsByEvent.get(e.id) || [],
      address: e.address,
      city: e.city,
      state: e.state,
      zipcode: e.zipcode,
      day1StartTime: e.day1_start_time,
      day1StartPeriod: e.day1_start_period,
      day1Course: e.day1_course,
      day1StartType: e.day1_start_type,
      day1LeadingHole: e.day1_leading_hole,
      day1Par: e.day1_par,
      day1HolePars: e.day1_hole_pars,
      day2StartTime: e.day2_start_time,
      day2StartPeriod: e.day2_start_period,
      day2Course: e.day2_course,
      day2StartType: e.day2_start_type,
      day2LeadingHole: e.day2_leading_hole,
      day2Par: e.day2_par,
      day2HolePars: e.day2_hole_pars,
      day3StartTime: e.day3_start_time,
      day3StartPeriod: e.day3_start_period,
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
    }));

    console.log('✅ Fetched events:', events.length);
    return events;
  });

export default {
  sync: syncEventProcedure,
  get: getEventsProcedure,
};
