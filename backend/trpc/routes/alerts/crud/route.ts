import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";

const getAllAlertsProcedure = publicProcedure
  .input(z.object({ 
    memberId: z.string().optional(),
    eventId: z.string().optional(),
    includeOrgAlerts: z.boolean().optional(),
  }).optional())
  .query(async ({ ctx, input }) => {
    try {
      console.log('[Alerts tRPC] Getting alerts');
      
      let query = ctx.supabase.from('alerts').select('*').order('created_at', { ascending: false });
      
      if (input?.eventId) {
        if (input.includeOrgAlerts) {
          query = query.or(`event_id.eq.${input.eventId},type.eq.organizational`);
        } else {
          query = query.eq('event_id', input.eventId);
        }
      }
      
      const { data: alertsData, error: alertsError } = await query;
      
      if (alertsError) {
        console.error('[Alerts tRPC] Error fetching alerts:', alertsError);
        throw new Error(`Failed to fetch alerts: ${alertsError.message}`);
      }

      if (input?.memberId) {
        const { data: dismissalsData, error: dismissalsError } = await ctx.supabase
          .from('alert_dismissals')
          .select('*')
          .eq('member_id', input.memberId);
        
        if (dismissalsError) {
          console.error('[Alerts tRPC] Error fetching dismissals:', dismissalsError);
        }

        const dismissedIds = new Set((dismissalsData || []).map(d => d.alert_id));
        
        const now = new Date().toISOString();
        const activeAlertsData = alertsData.filter(alert => 
          !alert.expires_at || alert.expires_at > now
        );
        
        const alerts = activeAlertsData.map(alert => ({
          id: alert.id,
          title: alert.title,
          message: alert.message,
          type: alert.type,
          priority: alert.priority,
          eventId: alert.event_id,
          createdBy: alert.created_by,
          createdAt: alert.created_at,
          expiresAt: alert.expires_at,
          isDismissed: dismissedIds.has(alert.id),
        }));

        console.log('[Alerts tRPC] Fetched alerts with dismissal status:', alerts.length);
        return alerts;
      } else {
        const now = new Date().toISOString();
        const activeAlertsData = alertsData.filter(alert => 
          !alert.expires_at || alert.expires_at > now
        );
        
        const alerts = activeAlertsData.map(alert => ({
          id: alert.id,
          title: alert.title,
          message: alert.message,
          type: alert.type,
          priority: alert.priority,
          eventId: alert.event_id,
          createdBy: alert.created_by,
          createdAt: alert.created_at,
          expiresAt: alert.expires_at,
        }));

        console.log('[Alerts tRPC] Fetched alerts:', alerts.length);
        return alerts;
      }
    } catch (error) {
      console.error('[Alerts tRPC] Error in getAllAlerts:', error);
      throw error;
    }
  });

const createAlertProcedure = publicProcedure
  .input(z.object({
    title: z.string(),
    message: z.string(),
    type: z.enum(['organizational', 'event']),
    priority: z.enum(['normal', 'critical']),
    eventId: z.string().optional(),
    createdBy: z.string(),
    expiresAt: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Alerts tRPC] Creating alert:', input.title);
      
      const { data, error } = await ctx.supabase
        .from('alerts')
        .insert({
          id: `alert-${Date.now()}`,
          title: input.title,
          message: input.message,
          type: input.type,
          priority: input.priority,
          event_id: input.eventId,
          created_by: input.createdBy,
          expires_at: input.expiresAt,
        })
        .select()
        .single();

      if (error) {
        console.error('[Alerts tRPC] Error creating alert:', error);
        throw new Error(`Failed to create alert: ${error.message}`);
      }

      console.log('[Alerts tRPC] Created alert:', data.id);
      return {
        id: data.id,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority,
        eventId: data.event_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
      };
    } catch (error) {
      console.error('[Alerts tRPC] Error in createAlert:', error);
      throw error;
    }
  });

const dismissAlertProcedure = publicProcedure
  .input(z.object({ 
    alertId: z.string(),
    memberId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Alerts tRPC] Dismissing alert:', input.alertId);
      
      const { error } = await ctx.supabase
        .from('alert_dismissals')
        .insert({
          id: `dismissal-${Date.now()}`,
          alert_id: input.alertId,
          member_id: input.memberId,
        });

      if (error) {
        console.error('[Alerts tRPC] Error dismissing alert:', error);
        throw new Error(`Failed to dismiss alert: ${error.message}`);
      }

      console.log('[Alerts tRPC] Alert dismissed');
      return { success: true };
    } catch (error) {
      console.error('[Alerts tRPC] Error in dismissAlert:', error);
      throw error;
    }
  });

const deleteAlertProcedure = publicProcedure
  .input(z.object({ alertId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Alerts tRPC] Deleting alert:', input.alertId);
      
      const { error } = await ctx.supabase
        .from('alerts')
        .delete()
        .eq('id', input.alertId);

      if (error) {
        console.error('[Alerts tRPC] Error deleting alert:', error);
        throw new Error(`Failed to delete alert: ${error.message}`);
      }

      console.log('[Alerts tRPC] Deleted alert');
      return { success: true };
    } catch (error) {
      console.error('[Alerts tRPC] Error in deleteAlert:', error);
      throw error;
    }
  });

const getAllTemplatesProcedure = publicProcedure
  .query(async ({ ctx }) => {
    try {
      console.log('[Alerts tRPC] Getting alert templates');
      
      const { data, error } = await ctx.supabase
        .from('alert_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[Alerts tRPC] Error fetching templates:', error);
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      const templates = data.map(template => ({
        id: template.id,
        name: template.name,
        title: template.title,
        message: template.message,
        priority: template.priority,
        createdAt: template.created_at,
      }));

      console.log('[Alerts tRPC] Fetched templates:', templates.length);
      return templates;
    } catch (error) {
      console.error('[Alerts tRPC] Error in getAllTemplates:', error);
      throw error;
    }
  });

const createTemplateProcedure = publicProcedure
  .input(z.object({
    name: z.string(),
    title: z.string(),
    message: z.string(),
    priority: z.enum(['normal', 'critical']),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Alerts tRPC] Creating template:', input.name);
      
      const { data, error } = await ctx.supabase
        .from('alert_templates')
        .insert({
          id: `template-${Date.now()}`,
          name: input.name,
          title: input.title,
          message: input.message,
          priority: input.priority,
        })
        .select()
        .single();

      if (error) {
        console.error('[Alerts tRPC] Error creating template:', error);
        throw new Error(`Failed to create template: ${error.message}`);
      }

      console.log('[Alerts tRPC] Created template:', data.id);
      return {
        id: data.id,
        name: data.name,
        title: data.title,
        message: data.message,
        priority: data.priority,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('[Alerts tRPC] Error in createTemplate:', error);
      throw error;
    }
  });

const deleteTemplateProcedure = publicProcedure
  .input(z.object({ templateId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Alerts tRPC] Deleting template:', input.templateId);
      
      const { error } = await ctx.supabase
        .from('alert_templates')
        .delete()
        .eq('id', input.templateId);

      if (error) {
        console.error('[Alerts tRPC] Error deleting template:', error);
        throw new Error(`Failed to delete template: ${error.message}`);
      }

      console.log('[Alerts tRPC] Deleted template');
      return { success: true };
    } catch (error) {
      console.error('[Alerts tRPC] Error in deleteTemplate:', error);
      throw error;
    }
  });

export default createTRPCRouter({
  getAll: getAllAlertsProcedure,
  create: createAlertProcedure,
  dismiss: dismissAlertProcedure,
  delete: deleteAlertProcedure,
  templates: createTRPCRouter({
    getAll: getAllTemplatesProcedure,
    create: createTemplateProcedure,
    delete: deleteTemplateProcedure,
  }),
});
