import { supabase } from '@/integrations/supabase/client';
import { validateMemberData, validateEventData, validateRegistrationData, validateScoreData, validateGroupingData, validateFinancialData } from '@/utils/dataValidation';

const mapEventFromDB = (e: any) => ({
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
  registeredPlayers: e.registered_players,
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
});

export const supabaseService = {
  events: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const events = data || [];
      
      const eventsWithRegistrations = await Promise.all(events.map(async (e) => {
        const { data: regs } = await supabase
          .from('event_registrations')
          .select('member_id')
          .eq('event_id', e.id);
        
        const registeredPlayers = (regs || []).map((r: any) => r.member_id);
        
        return {
          ...mapEventFromDB(e),
          registeredPlayers,
        };
      }));
      
      return eventsWithRegistrations;
    },
    
    get: async (eventId: string) => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (error) throw error;
      
      const { data: regs } = await supabase
        .from('event_registrations')
        .select('member_id')
        .eq('event_id', eventId);
      
      const registeredPlayers = (regs || []).map((r: any) => r.member_id);
      
      return {
        ...mapEventFromDB(data),
        registeredPlayers,
      };
    },

    create: async (event: any) => {
      const validation = validateEventData(event);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      const { error } = await supabase.from('events').insert({
        id: event.id,
        name: event.name,
        date: event.date,
        start_date: event.startDate || event.date,
        end_date: event.endDate,
        venue: event.venue,
        location: event.location,
        course: event.course,
        status: event.status || 'upcoming',
        description: event.description,
        memo: event.memo,
        registration_deadline: event.registrationDeadline,
        max_participants: event.maxParticipants,
        created_by: event.createdBy,
        type: event.type || 'tournament',
        photo_url: event.photoUrl,
        entry_fee: event.entryFee,
        number_of_days: event.numberOfDays || 1,
        address: event.address,
        city: event.city,
        state: event.state,
        zipcode: event.zipcode,
      });
      
      if (error) throw error;
    },

    update: async (eventId: string, updates: any) => {
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
    },

    delete: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
    },
    
    register: async (eventId: string, memberId: string, isSponsor?: boolean) => {
      const insertData: any = {
        event_id: eventId,
        member_id: memberId,
        status: 'registered',
        payment_status: 'pending',
      };
      
      if (isSponsor !== undefined) {
        insertData.is_sponsor = isSponsor;
      }
      
      const { data, error } = await supabase
        .from('event_registrations')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('[supabaseService] Registration error:', error);
        throw new Error(`Failed to register: ${error.message}`);
      }
      
      return data;
    },
    
    unregister: async (eventId: string, memberId: string) => {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('event_id', eventId)
        .eq('member_id', memberId);
      
      if (error) throw error;
    },
  },
  
  members: {
    getAll: async () => {
      const { data, error } = await supabase.from('members').select('*');
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.full_name || '',
        username: m.username || m.name || '',
        pin: m.pin || '',
        isAdmin: m.is_admin || false,
        rolexPoints: m.rolex_points || 0,
        email: m.email || '',
        phone: m.phone || '',
        handicap: m.handicap || 0,
        membershipType: m.membership_type || 'active',
        joinDate: m.join_date || new Date().toISOString().split('T')[0],
        createdAt: m.created_at || new Date().toISOString(),
        gender: m.gender,
        address: m.address,
        city: m.city,
        state: m.state,
        flight: m.flight,
        rolexFlight: m.rolex_flight,
        currentHandicap: m.current_handicap,
        dateOfBirth: m.date_of_birth,
        emergencyContactName: m.emergency_contact_name,
        emergencyContactPhone: m.emergency_contact_phone,
        profilePhotoUrl: m.profile_photo_url,
        adjustedHandicap: m.adjusted_handicap,
        ghin: m.ghin,
      }));
    },

    create: async (member: any) => {
      const skipPinValidation = member.membershipType === 'guest' && member.id?.startsWith('guest_');
      const validation = validateMemberData(member, skipPinValidation);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      const { error } = await supabase.from('members').insert({
        id: member.id,
        name: member.name,
        username: member.username || member.name,
        pin: member.pin,
        is_admin: member.isAdmin || false,
        rolex_points: member.rolexPoints || 0,
        email: member.email || '',
        phone: member.phone || '',
        handicap: member.handicap || 0,
        membership_type: member.membershipType || 'active',
        join_date: member.joinDate || new Date().toISOString().split('T')[0],
        full_name: member.name,
      });
      if (error) throw error;
    },

    update: async (memberId: string, updates: any) => {
      const supabaseUpdates: any = {};
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.handicap !== undefined) supabaseUpdates.handicap = updates.handicap;
      if (updates.phone !== undefined) supabaseUpdates.phone = updates.phone;
      if (updates.email !== undefined) supabaseUpdates.email = updates.email;

      const { error } = await supabase
        .from('members')
        .update(supabaseUpdates)
        .eq('id', memberId);
      if (error) throw error;
    },

    delete: async (memberId: string) => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
  },

  registrations: {
    getAll: async (eventId: string) => {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*, members(*)')
        .eq('event_id', eventId);
      
      if (error) throw error;
      
      return (data || []).map((r: any) => ({
        id: r.id,
        eventId: r.event_id,
        memberId: r.member_id,
        status: r.status,
        paymentStatus: r.payment_status,
        playerPhone: r.player_phone,
        adjustedHandicap: r.adjusted_handicap,
        numberOfGuests: r.number_of_guests,
        guestNames: r.guest_names,
        isSponsor: r.is_sponsor,
        isCustomGuest: r.is_custom_guest,
        customGuestName: r.custom_guest_name,
        registeredAt: r.registered_at,
        emailSent: r.email_sent || false,
        member: r.members,
      }));
    },

    create: async (registration: any) => {
      const validation = validateRegistrationData(registration);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      const insertData: any = {
        event_id: registration.eventId,
        member_id: registration.memberId,
        status: registration.status || 'registered',
        payment_status: registration.paymentStatus || 'unpaid',
      };
      
      if (registration.playerPhone !== undefined) insertData.player_phone = registration.playerPhone;
      if (registration.adjustedHandicap !== undefined) insertData.adjusted_handicap = registration.adjustedHandicap;
      if (registration.numberOfGuests !== undefined) insertData.number_of_guests = registration.numberOfGuests;
      if (registration.guestNames !== undefined) insertData.guest_names = registration.guestNames;
      if (registration.isSponsor !== undefined) insertData.is_sponsor = registration.isSponsor;
      
      const { data, error } = await supabase
        .from('event_registrations')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    update: async (registrationId: string, updates: any) => {
      const supabaseUpdates: any = {};
      if (updates.status !== undefined) supabaseUpdates.status = updates.status;
      if (updates.paymentStatus !== undefined) supabaseUpdates.payment_status = updates.paymentStatus;
      if (updates.playerPhone !== undefined) supabaseUpdates.player_phone = updates.playerPhone;
      if (updates.adjustedHandicap !== undefined) supabaseUpdates.adjusted_handicap = updates.adjustedHandicap;
      if (updates.numberOfGuests !== undefined) supabaseUpdates.number_of_guests = updates.numberOfGuests;
      if (updates.guestNames !== undefined) supabaseUpdates.guest_names = updates.guestNames;
      if (updates.isSponsor !== undefined) supabaseUpdates.is_sponsor = updates.isSponsor;
      if (updates.emailSent !== undefined) supabaseUpdates.email_sent = updates.emailSent;
      
      const { error } = await supabase
        .from('event_registrations')
        .update(supabaseUpdates)
        .eq('id', registrationId);
      
      if (error) throw error;
    },

    delete: async (registrationId: string) => {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', registrationId);
      if (error) throw error;
    },
  },
  
  groupings: {
    getAll: async (eventId: string) => {
      const { data, error } = await supabase
        .from('groupings')
        .select('*')
        .eq('event_id', eventId);
      
      if (error) throw error;
      
      return (data || []).map((g: any) => ({
        id: g.id,
        eventId: g.event_id,
        day: g.day,
        hole: g.hole,
        slots: g.slots,
      }));
    },

    create: async (grouping: any) => {
      const validation = validateGroupingData(grouping);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      const { error } = await supabase.from('groupings').insert({
        event_id: grouping.eventId,
        day: grouping.day,
        hole: grouping.hole,
        slots: grouping.slots,
      });
      if (error) throw error;
    },

    update: async (groupingId: string, updates: any) => {
      const supabaseUpdates: any = {};
      if (updates.slots !== undefined) supabaseUpdates.slots = updates.slots;
      if (updates.day !== undefined) supabaseUpdates.day = updates.day;
      if (updates.hole !== undefined) supabaseUpdates.hole = updates.hole;

      const { error } = await supabase
        .from('groupings')
        .update(supabaseUpdates)
        .eq('id', groupingId);
      if (error) throw error;
    },

    delete: async (groupingId: string) => {
      const { error } = await supabase
        .from('groupings')
        .delete()
        .eq('id', groupingId);
      if (error) throw error;
    },
    
    sync: async (eventId: string, groupings: any[]) => {
      console.log('[supabaseService.groupings.sync] Syncing groupings:', groupings.length);
      
      const groupingsToUpsert = groupings.map(g => {
        const id = `${eventId}-day${g.day}-hole${g.hole}`;
        console.log('[supabaseService.groupings.sync] Preparing grouping:', { id, day: g.day, hole: g.hole, slots: g.slots });
        return {
          id,
          event_id: eventId,
          day: g.day,
          hole: g.hole,
          slots: g.slots,
          updated_at: new Date().toISOString(),
        };
      });
      
      console.log('[supabaseService.groupings.sync] Upserting groupings:', groupingsToUpsert.length);
      const { error } = await supabase
        .from('groupings')
        .upsert(groupingsToUpsert, { onConflict: 'id' });
      
      if (error) {
        console.error('[supabaseService.groupings.sync] Error upserting groupings:', error);
        throw error;
      }
      
      console.log('[supabaseService.groupings.sync] ✅ Successfully synced groupings');
    },
  },
  
  scores: {
    getAll: async (eventId: string) => {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('event_id', eventId);
      
      if (error) throw error;
      
      return (data || []).map((s: any) => ({
        id: s.id,
        eventId: s.event_id,
        memberId: s.member_id,
        day: s.day,
        holes: s.holes,
        totalScore: s.total_score,
        submittedBy: s.submitted_by,
      }));
    },

    create: async (score: any) => {
      const validation = validateScoreData(score);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      const { error } = await supabase.from('scores').insert({
        event_id: score.eventId,
        member_id: score.memberId,
        day: score.day,
        holes: score.holes,
        total_score: score.totalScore,
        submitted_by: score.submittedBy,
      });
      if (error) throw error;
    },

    update: async (scoreId: string, updates: any) => {
      const supabaseUpdates: any = {};
      if (updates.holes !== undefined) supabaseUpdates.holes = updates.holes;
      if (updates.totalScore !== undefined) supabaseUpdates.total_score = updates.totalScore;

      const { error } = await supabase
        .from('scores')
        .update(supabaseUpdates)
        .eq('id', scoreId);
      if (error) throw error;
    },

    delete: async (scoreId: string) => {
      const { error } = await supabase
        .from('scores')
        .delete()
        .eq('id', scoreId);
      if (error) throw error;
    },
    
    submit: async (eventId: string, memberId: string, day: number, holes: any[], totalScore: number, submittedBy: string) => {
      const scoreData = { eventId, memberId, day, holes, totalScore, submittedBy };
      const validation = validateScoreData(scoreData);
      if (!validation.valid) {
        throw new Error(`Score validation failed: ${validation.errors.join(', ')}`);
      }
      
      console.log('[supabaseService.scores.submit] Submitting score:', {
        event_id: eventId,
        member_id: memberId,
        day,
        total_score: totalScore,
      });
      
      const { error } = await supabase.from('scores').upsert({
        event_id: eventId,
        member_id: memberId,
        day,
        holes,
        total_score: totalScore,
        submitted_by: submittedBy,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'event_id,member_id,day',
        ignoreDuplicates: false,
      });
      
      if (error) {
        console.error('[supabaseService.scores.submit] Error submitting score:', error);
        throw error;
      }
      
      console.log('[supabaseService.scores.submit] ✅ Score submitted successfully');
    },
    
    deleteAll: async (eventId: string) => {
      const { error } = await supabase
        .from('scores')
        .delete()
        .eq('event_id', eventId);
      if (error) throw error;
    },
  },
  
  financials: {
    getAll: async (eventId: string) => {
      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('event_id', eventId);
      
      if (error) throw error;
      
      return (data || []).map((f: any) => ({
        id: f.id,
        eventId: f.event_id,
        memberId: f.member_id,
        type: f.type,
        amount: f.amount,
        description: f.description,
        date: f.date,
      }));
    },
    
    create: async (financial: any) => {
      const validation = validateFinancialData(financial);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      const { error } = await supabase.from('financial_records').insert({
        event_id: financial.eventId,
        member_id: financial.memberId,
        type: financial.type,
        amount: financial.amount,
        description: financial.description,
        date: financial.date,
      });
      
      if (error) throw error;
    },

    update: async (financialId: string, updates: any) => {
      const supabaseUpdates: any = {};
      if (updates.amount !== undefined) supabaseUpdates.amount = updates.amount;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;

      const { error } = await supabase
        .from('financial_records')
        .update(supabaseUpdates)
        .eq('id', financialId);
      if (error) throw error;
    },

    delete: async (financialId: string) => {
      const { error } = await supabase
        .from('financial_records')
        .delete()
        .eq('id', financialId);
      if (error) throw error;
    },
  },

  games: {
    getAll: async (memberId: string) => {
      const { data, error } = await supabase
        .from('personal_games')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((g: any) => ({
        id: g.id,
        memberId: g.member_id,
        gameType: g.game_type,
        players: g.players,
        scores: g.scores,
        date: g.date,
        courseName: g.course_name,
        createdAt: g.created_at,
      }));
    },

    create: async (game: any) => {
      const { error } = await supabase.from('personal_games').insert({
        id: game.id,
        member_id: game.memberId,
        game_type: game.gameType,
        players: game.players,
        scores: game.scores,
        date: game.date,
        course_name: game.courseName,
      });
      if (error) throw error;
    },

    update: async (gameId: string, updates: any) => {
      const supabaseUpdates: any = {};
      if (updates.scores !== undefined) supabaseUpdates.scores = updates.scores;
      if (updates.players !== undefined) supabaseUpdates.players = updates.players;

      const { error } = await supabase
        .from('personal_games')
        .update(supabaseUpdates)
        .eq('id', gameId);
      if (error) throw error;
    },

    delete: async (gameId: string) => {
      const { error } = await supabase
        .from('personal_games')
        .delete()
        .eq('id', gameId);
      if (error) throw error;
    },
  },

  courses: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        location: c.location,
        par: c.par,
        holePars: c.hole_pars,
        teeboxes: c.teeboxes,
        createdAt: c.created_at,
      }));
    },

    get: async (courseId: string) => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        location: data.location,
        par: data.par,
        holePars: data.hole_pars,
        teeboxes: data.teeboxes,
        createdAt: data.created_at,
      };
    },

    create: async (course: any) => {
      const { error } = await supabase.from('courses').insert({
        id: course.id,
        name: course.name,
        location: course.location,
        par: course.par,
        hole_pars: course.holePars,
        teeboxes: course.teeboxes,
      });
      if (error) throw error;
    },

    update: async (courseId: string, updates: any) => {
      const supabaseUpdates: any = {};
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.location !== undefined) supabaseUpdates.location = updates.location;
      if (updates.par !== undefined) supabaseUpdates.par = updates.par;
      if (updates.holePars !== undefined) supabaseUpdates.hole_pars = updates.holePars;
      if (updates.teeboxes !== undefined) supabaseUpdates.teeboxes = updates.teeboxes;

      const { error } = await supabase
        .from('courses')
        .update(supabaseUpdates)
        .eq('id', courseId);
      if (error) throw error;
    },

    delete: async (courseId: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      if (error) throw error;
    },
  },
};
