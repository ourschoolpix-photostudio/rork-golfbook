import { supabase } from '@/integrations/supabase/client';

export const supabaseService = {
  events: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((e: any) => ({
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
      }));
    },
    
    get: async (eventId: string) => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        date: data.date,
        startDate: data.start_date || data.date,
        endDate: data.end_date,
        venue: data.venue,
        location: data.location,
        course: data.course,
        status: data.status,
        description: data.description,
        memo: data.memo,
        registrationDeadline: data.registration_deadline,
        maxParticipants: data.max_participants,
        createdAt: data.created_at,
        createdBy: data.created_by,
        type: data.type,
        photoUrl: data.photo_url,
        entryFee: data.entry_fee,
        numberOfDays: data.number_of_days,
      };
    },
    
    register: async (eventId: string, memberId: string) => {
      const { error } = await supabase.from('event_registrations').insert({
        event_id: eventId,
        member_id: memberId,
        status: 'registered',
      });
      
      if (error) throw error;
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
        adjustedHandicap: r.adjusted_handicap,
        numberOfGuests: r.number_of_guests,
        guestNames: r.guest_names,
        isSponsor: r.is_sponsor,
        registeredAt: r.registered_at,
        member: r.members,
      }));
    },
    
    update: async (registrationId: string, updates: any) => {
      const supabaseUpdates: any = {};
      if (updates.status) supabaseUpdates.status = updates.status;
      if (updates.paymentStatus) supabaseUpdates.payment_status = updates.paymentStatus;
      if (updates.adjustedHandicap) supabaseUpdates.adjusted_handicap = updates.adjustedHandicap;
      if (updates.numberOfGuests !== undefined) supabaseUpdates.number_of_guests = updates.numberOfGuests;
      if (updates.guestNames) supabaseUpdates.guest_names = updates.guestNames;
      if (updates.isSponsor !== undefined) supabaseUpdates.is_sponsor = updates.isSponsor;
      
      const { error } = await supabase
        .from('event_registrations')
        .update(supabaseUpdates)
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
    
    sync: async (eventId: string, groupings: any[]) => {
      for (const grouping of groupings) {
        const { error } = await supabase.from('groupings').upsert({
          event_id: eventId,
          day: grouping.day,
          hole: grouping.hole,
          slots: grouping.slots,
        }, {
          onConflict: 'event_id,day,hole'
        });
        
        if (error) throw error;
      }
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
    
    submit: async (eventId: string, memberId: string, day: number, holes: any[], totalScore: number, submittedBy: string) => {
      const { error } = await supabase.from('scores').upsert({
        event_id: eventId,
        member_id: memberId,
        day,
        holes,
        total_score: totalScore,
        submitted_by: submittedBy,
      }, {
        onConflict: 'event_id,member_id,day'
      });
      
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
  },
};
