import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const financialRecordSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  type: z.enum(['registration', 'prize', 'expense', 'income', 'other']),
  amount: z.number(),
  description: z.string(),
  date: z.string(),
  memberId: z.string().optional(),
});

export const createFinancialProcedure = publicProcedure
  .input(financialRecordSchema)
  .mutation(async ({ input }) => {
    console.log('📝 Creating financial record:', input);
    
    const { error } = await supabase
      .from('financial_records')
      .insert({
        id: input.id,
        event_id: input.eventId,
        member_id: input.memberId,
        type: input.type,
        amount: input.amount,
        description: input.description,
        date: input.date,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ Error creating financial record:', error);
      throw new Error(`Failed to create financial record: ${error.message}`);
    }

    console.log('✅ Financial record created successfully');
    return { success: true };
  });

export const getAllFinancialsProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
  }))
  .query(async ({ input }) => {
    console.log('📥 Fetching financial records for event:', input.eventId);
    
    const { data, error } = await supabase
      .from('financial_records')
      .select('*')
      .eq('event_id', input.eventId)
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching financial records:', error);
      throw new Error(`Failed to fetch financial records: ${error.message}`);
    }

    const records = (data || []).map(record => ({
      id: record.id,
      eventId: record.event_id,
      memberId: record.member_id,
      type: record.type,
      amount: Number(record.amount),
      description: record.description,
      date: record.date,
      createdAt: record.created_at,
    }));

    console.log('✅ Fetched financial records:', records.length);
    return records;
  });

export const deleteFinancialProcedure = publicProcedure
  .input(z.object({
    id: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('🗑️ Deleting financial record:', input.id);
    
    const { error } = await supabase
      .from('financial_records')
      .delete()
      .eq('id', input.id);

    if (error) {
      console.error('❌ Error deleting financial record:', error);
      throw new Error(`Failed to delete financial record: ${error.message}`);
    }

    console.log('✅ Financial record deleted successfully');
    return { success: true };
  });

export const getAllGlobalFinancialsProcedure = publicProcedure
  .query(async () => {
    console.log('📥 Fetching all global financial records');
    
    const { data, error } = await supabase
      .from('financial_records')
      .select('*')
      .eq('event_id', 'global')
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching global financial records:', error);
      throw new Error(`Failed to fetch global financial records: ${error.message}`);
    }

    const records = (data || []).map(record => ({
      id: record.id,
      eventId: record.event_id,
      memberId: record.member_id,
      type: record.type,
      amount: Number(record.amount),
      description: record.description,
      date: record.date,
      createdAt: record.created_at,
    }));

    console.log('✅ Fetched global financial records:', records.length);
    return records;
  });

export default createTRPCRouter({
  create: createFinancialProcedure,
  getAll: getAllFinancialsProcedure,
  getAllGlobal: getAllGlobalFinancialsProcedure,
  delete: deleteFinancialProcedure,
});
