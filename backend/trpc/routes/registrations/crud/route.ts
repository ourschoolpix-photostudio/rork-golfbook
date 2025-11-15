import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const registrationSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  memberId: z.string(),
  status: z.enum(['registered', 'confirmed', 'withdrawn']),
  paymentStatus: z.enum(['pending', 'paid', 'refunded']).optional(),
  registeredAt: z.string(),
  numberOfGuests: z.number().optional(),
  guestNames: z.string().optional(),
  adjustedHandicap: z.string().nullable().optional(),
});

export const createRegistrationProcedure = publicProcedure
  .input(z.object({
    id: z.string(),
    eventId: z.string(),
    memberId: z.string(),
    status: z.enum(['registered', 'confirmed', 'withdrawn']).default('registered'),
    paymentStatus: z.enum(['pending', 'paid', 'refunded']).optional(),
    numberOfGuests: z.number().optional(),
    guestNames: z.string().optional(),
    adjustedHandicap: z.string().nullable().optional(),
  }))
  .mutation(async ({ input }) => {
    console.log('📝 Creating registration:', input);
    
    const { error } = await supabase
      .from('event_registrations')
      .insert({
        id: input.id,
        event_id: input.eventId,
        member_id: input.memberId,
        status: input.status,
        payment_status: input.paymentStatus || 'pending',
        adjusted_handicap: input.adjustedHandicap,
        registered_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ Error creating registration:', error);
      throw new Error(`Failed to create registration: ${error.message}`);
    }

    console.log('✅ Registration created successfully');
    return { success: true };
  });

export const updateRegistrationProcedure = publicProcedure
  .input(z.object({
    registrationId: z.string(),
    updates: z.object({
      status: z.enum(['registered', 'confirmed', 'withdrawn']).optional(),
      paymentStatus: z.enum(['pending', 'paid', 'refunded']).optional(),
      numberOfGuests: z.number().optional(),
      guestNames: z.string().optional(),
      adjustedHandicap: z.string().nullable().optional(),
    }),
  }))
  .mutation(async ({ input }) => {
    console.log('📝 Updating registration:', input.registrationId, 'Updates:', input.updates);
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (input.updates.status !== undefined) {
      updateData.status = input.updates.status;
    }
    if (input.updates.paymentStatus !== undefined) {
      updateData.payment_status = input.updates.paymentStatus;
    }
    if (input.updates.adjustedHandicap !== undefined) {
      updateData.adjusted_handicap = input.updates.adjustedHandicap || null;
    }
    if (input.updates.numberOfGuests !== undefined) {
      updateData.number_of_guests = input.updates.numberOfGuests;
    }
    if (input.updates.guestNames !== undefined) {
      updateData.guest_names = input.updates.guestNames || null;
    }
    
    const { error } = await supabase
      .from('event_registrations')
      .update(updateData)
      .eq('id', input.registrationId);

    if (error) {
      console.error('❌ Error updating registration:', error);
      throw new Error(`Failed to update registration: ${error.message}`);
    }

    console.log('✅ Registration updated successfully');
    return { success: true };
  });

export const getAllRegistrationsProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .query(async ({ input }) => {
    console.log('📥 Fetching registrations for event:', input.eventId);
    
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        member:member_id (
          id,
          name,
          phone,
          handicap
        )
      `)
      .eq('event_id', input.eventId);

    if (error) {
      console.error('❌ Error fetching registrations:', error);
      throw new Error(`Failed to fetch registrations: ${error.message}`);
    }

    const registrations = (data || []).map((reg: any) => ({
      id: reg.id,
      eventId: reg.event_id,
      memberId: reg.member_id,
      playerName: reg.member?.name || '',
      playerPhone: reg.member?.phone || null,
      paymentStatus: reg.payment_status,
      status: reg.status,
      registeredAt: reg.registered_at,
      adjustedHandicap: reg.adjusted_handicap,
      numberOfGuests: reg.number_of_guests || 0,
      guestNames: reg.guest_names || null,
    }));

    console.log('✅ Fetched registrations:', registrations.length);
    return registrations;
  });

export default createTRPCRouter({
  create: createRegistrationProcedure,
  update: updateRegistrationProcedure,
  getAll: getAllRegistrationsProcedure,
});
