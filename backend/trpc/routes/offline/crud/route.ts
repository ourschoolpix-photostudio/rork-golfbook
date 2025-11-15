import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";

const getAllProcedure = publicProcedure
  .input(z.object({ 
    memberId: z.string().optional(),
    eventId: z.string().optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  }).optional())
  .query(async ({ ctx, input }) => {
    try {
      console.log('[Offline Operations tRPC] Getting operations');
      
      let query = ctx.supabase.from('offline_operations').select('*').order('created_at', { ascending: false });
      
      if (input?.memberId) {
        query = query.eq('member_id', input.memberId);
      }
      if (input?.eventId) {
        query = query.eq('event_id', input.eventId);
      }
      if (input?.status) {
        query = query.eq('status', input.status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Offline Operations tRPC] Error fetching operations:', error);
        throw new Error(`Failed to fetch operations: ${error.message}`);
      }

      const operations = data.map(op => ({
        id: op.id,
        memberId: op.member_id,
        type: op.operation_type,
        data: op.operation_data,
        eventId: op.event_id,
        retryCount: op.retry_count,
        status: op.status,
        errorMessage: op.error_message,
        createdAt: op.created_at,
        processedAt: op.processed_at,
      }));

      console.log('[Offline Operations tRPC] Fetched operations:', operations.length);
      return operations;
    } catch (error) {
      console.error('[Offline Operations tRPC] Error in getAll:', error);
      throw error;
    }
  });

const createProcedure = publicProcedure
  .input(z.object({
    memberId: z.string().optional(),
    type: z.enum(['score_submit', 'registration_create', 'registration_update', 'registration_delete', 'grouping_sync', 'member_update', 'event_update']),
    data: z.any(),
    eventId: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Offline Operations tRPC] Creating operation:', input.type);
      
      const { data, error } = await ctx.supabase
        .from('offline_operations')
        .insert({
          member_id: input.memberId,
          operation_type: input.type,
          operation_data: input.data,
          event_id: input.eventId,
          status: 'pending',
          retry_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[Offline Operations tRPC] Error creating operation:', error);
        throw new Error(`Failed to create operation: ${error.message}`);
      }

      console.log('[Offline Operations tRPC] Created operation:', data.id);
      return {
        id: data.id,
        memberId: data.member_id,
        type: data.operation_type,
        data: data.operation_data,
        eventId: data.event_id,
        retryCount: data.retry_count,
        status: data.status,
        errorMessage: data.error_message,
        createdAt: data.created_at,
        processedAt: data.processed_at,
      };
    } catch (error) {
      console.error('[Offline Operations tRPC] Error in create:', error);
      throw error;
    }
  });

const updateStatusProcedure = publicProcedure
  .input(z.object({
    operationId: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    errorMessage: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Offline Operations tRPC] Updating operation status:', input.operationId);
      
      const updateData: any = {
        status: input.status,
      };
      
      if (input.errorMessage) {
        updateData.error_message = input.errorMessage;
      }
      
      if (input.status === 'completed' || input.status === 'failed') {
        updateData.processed_at = new Date().toISOString();
      }

      const { error } = await ctx.supabase
        .from('offline_operations')
        .update(updateData)
        .eq('id', input.operationId);

      if (error) {
        console.error('[Offline Operations tRPC] Error updating operation:', error);
        throw new Error(`Failed to update operation: ${error.message}`);
      }

      console.log('[Offline Operations tRPC] Updated operation status');
      return { success: true };
    } catch (error) {
      console.error('[Offline Operations tRPC] Error in updateStatus:', error);
      throw error;
    }
  });

const incrementRetryProcedure = publicProcedure
  .input(z.object({ operationId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Offline Operations tRPC] Incrementing retry count:', input.operationId);
      
      const { data: currentOp, error: fetchError } = await ctx.supabase
        .from('offline_operations')
        .select('retry_count')
        .eq('id', input.operationId)
        .single();

      if (fetchError) {
        console.error('[Offline Operations tRPC] Error fetching operation:', fetchError);
        throw new Error(`Failed to fetch operation: ${fetchError.message}`);
      }

      const { error } = await ctx.supabase
        .from('offline_operations')
        .update({ retry_count: (currentOp.retry_count || 0) + 1 })
        .eq('id', input.operationId);

      if (error) {
        console.error('[Offline Operations tRPC] Error incrementing retry:', error);
        throw new Error(`Failed to increment retry: ${error.message}`);
      }

      console.log('[Offline Operations tRPC] Incremented retry count');
      return { success: true };
    } catch (error) {
      console.error('[Offline Operations tRPC] Error in incrementRetry:', error);
      throw error;
    }
  });

const deleteProcedure = publicProcedure
  .input(z.object({ operationId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Offline Operations tRPC] Deleting operation:', input.operationId);
      
      const { error } = await ctx.supabase
        .from('offline_operations')
        .delete()
        .eq('id', input.operationId);

      if (error) {
        console.error('[Offline Operations tRPC] Error deleting operation:', error);
        throw new Error(`Failed to delete operation: ${error.message}`);
      }

      console.log('[Offline Operations tRPC] Deleted operation');
      return { success: true };
    } catch (error) {
      console.error('[Offline Operations tRPC] Error in delete:', error);
      throw error;
    }
  });

const clearAllProcedure = publicProcedure
  .input(z.object({ 
    memberId: z.string().optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  }).optional())
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Offline Operations tRPC] Clearing operations');
      
      let query = ctx.supabase.from('offline_operations').delete();
      
      if (input?.memberId) {
        query = query.eq('member_id', input.memberId);
      }
      if (input?.status) {
        query = query.eq('status', input.status);
      }
      
      if (!input?.memberId && !input?.status) {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }
      
      const { error } = await query;

      if (error) {
        console.error('[Offline Operations tRPC] Error clearing operations:', error);
        throw new Error(`Failed to clear operations: ${error.message}`);
      }

      console.log('[Offline Operations tRPC] Cleared operations');
      return { success: true };
    } catch (error) {
      console.error('[Offline Operations tRPC] Error in clearAll:', error);
      throw error;
    }
  });

export default createTRPCRouter({
  getAll: getAllProcedure,
  create: createProcedure,
  updateStatus: updateStatusProcedure,
  incrementRetry: incrementRetryProcedure,
  delete: deleteProcedure,
  clearAll: clearAllProcedure,
});
