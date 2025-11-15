import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";

const getAllProcedure = publicProcedure
  .input(z.object({ 
    memberId: z.string().optional(),
    eventId: z.string().optional(),
  }).optional())
  .query(async ({ ctx, input }) => {
    try {
      console.log('[Notifications tRPC] Getting notifications');
      
      let query = ctx.supabase.from('notifications').select('*').order('created_at', { ascending: false });
      
      if (input?.memberId) {
        query = query.eq('member_id', input.memberId);
      }
      if (input?.eventId) {
        query = query.eq('event_id', input.eventId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Notifications tRPC] Error fetching notifications:', error);
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      const notifications = data.map(notif => ({
        id: notif.id,
        memberId: notif.member_id,
        eventId: notif.event_id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: notif.is_read,
        metadata: notif.metadata,
        createdAt: notif.created_at,
      }));

      console.log('[Notifications tRPC] Fetched notifications:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('[Notifications tRPC] Error in getAll:', error);
      throw error;
    }
  });

const createProcedure = publicProcedure
  .input(z.object({
    memberId: z.string().optional(),
    eventId: z.string().optional(),
    type: z.enum(['registration', 'cancellation', 'update', 'payment', 'general']),
    title: z.string(),
    message: z.string(),
    metadata: z.any().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Notifications tRPC] Creating notification:', input.title);
      
      const { data, error } = await ctx.supabase
        .from('notifications')
        .insert({
          member_id: input.memberId,
          event_id: input.eventId,
          type: input.type,
          title: input.title,
          message: input.message,
          metadata: input.metadata,
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        console.error('[Notifications tRPC] Error creating notification:', error);
        throw new Error(`Failed to create notification: ${error.message}`);
      }

      console.log('[Notifications tRPC] Created notification:', data.id);
      return {
        id: data.id,
        memberId: data.member_id,
        eventId: data.event_id,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: data.is_read,
        metadata: data.metadata,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('[Notifications tRPC] Error in create:', error);
      throw error;
    }
  });

const markAsReadProcedure = publicProcedure
  .input(z.object({ notificationId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Notifications tRPC] Marking notification as read:', input.notificationId);
      
      const { error } = await ctx.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', input.notificationId);

      if (error) {
        console.error('[Notifications tRPC] Error marking notification as read:', error);
        throw new Error(`Failed to mark notification as read: ${error.message}`);
      }

      console.log('[Notifications tRPC] Marked notification as read');
      return { success: true };
    } catch (error) {
      console.error('[Notifications tRPC] Error in markAsRead:', error);
      throw error;
    }
  });

const markAllAsReadProcedure = publicProcedure
  .input(z.object({ memberId: z.string().optional() }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Notifications tRPC] Marking all notifications as read');
      
      let query = ctx.supabase.from('notifications').update({ is_read: true });
      
      if (input.memberId) {
        query = query.eq('member_id', input.memberId);
      }
      
      const { error } = await query.eq('is_read', false);

      if (error) {
        console.error('[Notifications tRPC] Error marking all as read:', error);
        throw new Error(`Failed to mark all as read: ${error.message}`);
      }

      console.log('[Notifications tRPC] Marked all as read');
      return { success: true };
    } catch (error) {
      console.error('[Notifications tRPC] Error in markAllAsRead:', error);
      throw error;
    }
  });

const deleteProcedure = publicProcedure
  .input(z.object({ notificationId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Notifications tRPC] Deleting notification:', input.notificationId);
      
      const { error } = await ctx.supabase
        .from('notifications')
        .delete()
        .eq('id', input.notificationId);

      if (error) {
        console.error('[Notifications tRPC] Error deleting notification:', error);
        throw new Error(`Failed to delete notification: ${error.message}`);
      }

      console.log('[Notifications tRPC] Deleted notification');
      return { success: true };
    } catch (error) {
      console.error('[Notifications tRPC] Error in delete:', error);
      throw error;
    }
  });

const clearAllProcedure = publicProcedure
  .input(z.object({ memberId: z.string().optional() }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Notifications tRPC] Clearing all notifications');
      
      let query = ctx.supabase.from('notifications').delete();
      
      if (input.memberId) {
        query = query.eq('member_id', input.memberId);
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }
      
      const { error } = await query;

      if (error) {
        console.error('[Notifications tRPC] Error clearing notifications:', error);
        throw new Error(`Failed to clear notifications: ${error.message}`);
      }

      console.log('[Notifications tRPC] Cleared all notifications');
      return { success: true };
    } catch (error) {
      console.error('[Notifications tRPC] Error in clearAll:', error);
      throw error;
    }
  });

export default createTRPCRouter({
  getAll: getAllProcedure,
  create: createProcedure,
  markAsRead: markAsReadProcedure,
  markAllAsRead: markAllAsReadProcedure,
  delete: deleteProcedure,
  clearAll: clearAllProcedure,
});
