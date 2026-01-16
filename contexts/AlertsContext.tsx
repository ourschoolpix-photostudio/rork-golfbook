import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { Alert, AlertTemplate, AlertDismissal } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const [AlertsProvider, useAlerts] = createContextHook(() => {
  const { currentUser } = useAuth();
  const { orgInfo } = useSettings();
  const useLocalStorage = orgInfo?.useLocalStorage || false;
  const memberId = currentUser?.id;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [templates, setTemplates] = useState<AlertTemplate[]>([]);
  const [dismissals, setDismissals] = useState<AlertDismissal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAlerts = useCallback(async () => {
    if (!memberId) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      if (useLocalStorage) {
        console.log('📥 [AlertsContext] Fetching alerts from local storage...');
        const storedAlerts = await localStorageService.alerts.getAll();
        const storedDismissals = await localStorageService.alertDismissals.getByMember(memberId);
        
        const now = new Date().toISOString();
        const activeAlerts = storedAlerts.filter(alert => 
          (!alert.expiresAt || alert.expiresAt > now) &&
          alert.createdBy !== memberId
        );
        
        const alertsWithDismissal = activeAlerts.map(alert => ({
          ...alert,
          isDismissed: storedDismissals.some(d => d.alertId === alert.id)
        }));
        
        console.log('✅ [AlertsContext] Successfully fetched alerts from local storage:', alertsWithDismissal.length);
        setAlerts(alertsWithDismissal);
        setDismissals(storedDismissals);
      } else {
        console.log('📥 [AlertsContext] Fetching alerts from Supabase...');
        
        const [alertsResult, dismissalsResult] = await Promise.all([
          supabase.from('alerts').select('*').order('created_at', { ascending: false }),
          supabase.from('alert_dismissals').select('*').eq('member_id', memberId)
        ]);
        
        if (alertsResult.error) throw alertsResult.error;
        if (dismissalsResult.error) throw dismissalsResult.error;
        
        const now = new Date().toISOString();
        const activeAlertsData = (alertsResult.data || []).filter((a: any) => 
          (!a.expires_at || a.expires_at > now) &&
          a.created_by !== memberId
        );
        
        const fetchedAlerts = activeAlertsData.map((a: any) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          type: a.type,
          priority: a.priority,
          eventId: a.event_id,
          createdBy: a.created_by,
          createdAt: a.created_at,
          expiresAt: a.expires_at,
          isDismissed: (dismissalsResult.data || []).some((d: any) => d.alert_id === a.id)
        }));
        
        const fetchedDismissals = (dismissalsResult.data || []).map((d: any) => ({
          id: d.id,
          alertId: d.alert_id,
          memberId: d.member_id,
          dismissedAt: d.dismissed_at
        }));
        
        console.log('✅ [AlertsContext] Successfully fetched alerts:', fetchedAlerts.length);
        setAlerts(fetchedAlerts);
        setDismissals(fetchedDismissals);
      }
    } catch (error) {
      console.error('❌ [AlertsContext] Failed to fetch alerts:', error instanceof Error ? error.message : JSON.stringify(error));
      console.log('📥 [AlertsContext] Falling back to local storage');
      
      try {
        const fallbackAlerts = await localStorageService.alerts.getAll();
        const fallbackDismissals = await localStorageService.alertDismissals.getByMember(memberId);
        
        const now = new Date().toISOString();
        const activeAlerts = fallbackAlerts.filter(alert => 
          (!alert.expiresAt || alert.expiresAt > now) &&
          alert.createdBy !== memberId
        );
        
        const alertsWithDismissal = activeAlerts.map(alert => ({
          ...alert,
          isDismissed: fallbackDismissals.some(d => d.alertId === alert.id)
        }));
        
        console.log('✅ [AlertsContext] Successfully fetched alerts from local storage fallback:', alertsWithDismissal.length);
        setAlerts(alertsWithDismissal);
        setDismissals(fallbackDismissals);
      } catch (fallbackError) {
        console.error('❌ [AlertsContext] Fallback also failed:', fallbackError instanceof Error ? fallbackError.message : JSON.stringify(fallbackError));
        setAlerts([]);
        setDismissals([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [memberId, useLocalStorage]);

  const fetchTemplates = useCallback(async () => {
    try {
      console.log('📥 [AlertsContext] Fetching alert templates...');
      
      if (useLocalStorage) {
        const storedTemplates = await localStorageService.alertTemplates.getAll();
        console.log('✅ [AlertsContext] Successfully fetched templates from local storage:', storedTemplates.length);
        setTemplates(storedTemplates);
      } else {
        const { data, error } = await supabase
          .from('alert_templates')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const fetchedTemplates = (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          title: t.title,
          message: t.message,
          priority: t.priority,
          createdAt: t.created_at
        }));
        
        console.log('✅ [AlertsContext] Successfully fetched templates:', fetchedTemplates.length);
        setTemplates(fetchedTemplates);
      }
    } catch (error) {
      console.error('❌ [AlertsContext] Failed to fetch templates:', error instanceof Error ? error.message : JSON.stringify(error));
      try {
        const fallbackTemplates = await localStorageService.alertTemplates.getAll();
        console.log('✅ [AlertsContext] Successfully fetched templates from local storage fallback:', fallbackTemplates.length);
        setTemplates(fallbackTemplates);
      } catch (fallbackError) {
        console.error('❌ [AlertsContext] Template fallback also failed:', fallbackError instanceof Error ? fallbackError.message : JSON.stringify(fallbackError));
        setTemplates([]);
      }
    }
  }, [useLocalStorage]);

  useEffect(() => {
    fetchAlerts();
    fetchTemplates();
  }, [fetchAlerts, fetchTemplates]);

  useEffect(() => {
    if (useLocalStorage || !memberId) return;

    console.log('[Realtime] 🔔 Setting up alerts real-time subscriptions');

    let alertsChannel: RealtimeChannel | null = null;
    let dismissalsChannel: RealtimeChannel | null = null;

    try {
      alertsChannel = supabase
        .channel(`alerts-realtime-${memberId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'alerts',
          },
          (payload) => {
            try {
              console.log('[Realtime] 🔔 Alert change detected:', payload.eventType, 'on device:', memberId);
              fetchAlerts();
            } catch (error) {
              console.error('[Realtime] Error handling alert change:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Alerts subscription status:', status, 'for member:', memberId);
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] ✅ Successfully subscribed to alerts');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[Realtime] ❌ Failed to subscribe to alerts - channel error');
          } else if (status === 'TIMED_OUT') {
            console.error('[Realtime] ❌ Failed to subscribe to alerts - timed out');
          }
        });

      dismissalsChannel = supabase
        .channel(`alert-dismissals-realtime-${memberId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'alert_dismissals',
            filter: `member_id=eq.${memberId}`,
          },
          (payload) => {
            try {
              console.log('[Realtime] 🔕 Alert dismissal change detected:', payload.eventType, 'on device:', memberId);
              fetchAlerts();
            } catch (error) {
              console.error('[Realtime] Error handling dismissal change:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Alert dismissals subscription status:', status, 'for member:', memberId);
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] ✅ Successfully subscribed to alert dismissals');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[Realtime] ❌ Failed to subscribe to alert dismissals - channel error');
          } else if (status === 'TIMED_OUT') {
            console.error('[Realtime] ❌ Failed to subscribe to alert dismissals - timed out');
          }
        });
    } catch (error) {
      console.error('[Realtime] Error setting up alerts subscriptions:', error);
    }

    return () => {
      try {
        if (alertsChannel) {
          console.log('[Realtime] 🔴 Unsubscribing from alerts');
          supabase.removeChannel(alertsChannel);
        }
        if (dismissalsChannel) {
          console.log('[Realtime] 🔴 Unsubscribing from alert dismissals');
          supabase.removeChannel(dismissalsChannel);
        }
      } catch (error) {
        console.error('[Realtime] Error unsubscribing from alerts:', error);
      }
    };
  }, [useLocalStorage, memberId, fetchAlerts]);

  const createAlert = useCallback(
    async (alert: Omit<Alert, 'id' | 'createdAt'>) => {
      try {
        console.log('➕ [AlertsContext] Creating alert');
        
        if (useLocalStorage) {
          const newAlert: Alert = {
            id: `alert-${Date.now()}`,
            createdAt: new Date().toISOString(),
            ...alert,
          };
          await localStorageService.alerts.create(newAlert);
        } else {
          const { error } = await supabase.from('alerts').insert({
            id: `alert-${Date.now()}`,
            title: alert.title,
            message: alert.message,
            type: alert.type,
            priority: alert.priority,
            event_id: alert.eventId,
            created_by: alert.createdBy,
            expires_at: alert.expiresAt,
          });
          
          if (error) throw error;
        }
        
        console.log('✅ [AlertsContext] Alert created successfully');
        await fetchAlerts();
      } catch (error) {
        console.error('❌ [AlertsContext] Failed to create alert:', error instanceof Error ? error.message : JSON.stringify(error));
        throw error;
      }
    },
    [fetchAlerts, useLocalStorage]
  );

  const dismissAlert = useCallback(
    async (alertId: string) => {
      if (!memberId) return;
      
      try {
        console.log('✏️ [AlertsContext] Dismissing alert:', alertId);
        
        if (useLocalStorage) {
          const dismissal: AlertDismissal = {
            id: `dismissal-${Date.now()}`,
            alertId,
            memberId,
            dismissedAt: new Date().toISOString()
          };
          await localStorageService.alertDismissals.create(dismissal);
        } else {
          const { error } = await supabase
            .from('alert_dismissals')
            .insert({
              id: `dismissal-${Date.now()}`,
              alert_id: alertId,
              member_id: memberId,
            });
          
          if (error) throw error;
        }
        
        console.log('✅ [AlertsContext] Alert dismissed');
        await fetchAlerts();
      } catch (error) {
        console.error('❌ [AlertsContext] Failed to dismiss alert:', error instanceof Error ? error.message : JSON.stringify(error));
        throw error;
      }
    },
    [memberId, fetchAlerts, useLocalStorage]
  );

  const deleteAlert = useCallback(
    async (alertId: string) => {
      try {
        console.log('🗑️ [AlertsContext] Deleting alert:', alertId);
        
        if (useLocalStorage) {
          await localStorageService.alerts.delete(alertId);
        } else {
          const { error } = await supabase
            .from('alerts')
            .delete()
            .eq('id', alertId);
          
          if (error) throw error;
        }
        
        console.log('✅ [AlertsContext] Alert deleted');
        await fetchAlerts();
      } catch (error) {
        console.error('❌ [AlertsContext] Failed to delete alert:', error instanceof Error ? error.message : JSON.stringify(error));
        throw error;
      }
    },
    [fetchAlerts, useLocalStorage]
  );

  const createTemplate = useCallback(
    async (template: Omit<AlertTemplate, 'id' | 'createdAt'>) => {
      try {
        console.log('➕ [AlertsContext] Creating template');
        
        if (useLocalStorage) {
          const newTemplate: AlertTemplate = {
            id: `template-${Date.now()}`,
            createdAt: new Date().toISOString(),
            ...template,
          };
          await localStorageService.alertTemplates.create(newTemplate);
        } else {
          const { error } = await supabase.from('alert_templates').insert({
            id: `template-${Date.now()}`,
            name: template.name,
            title: template.title,
            message: template.message,
            priority: template.priority,
          });
          
          if (error) throw error;
        }
        
        console.log('✅ [AlertsContext] Template created successfully');
        await fetchTemplates();
      } catch (error) {
        console.error('❌ [AlertsContext] Failed to create template:', error instanceof Error ? error.message : JSON.stringify(error));
        throw error;
      }
    },
    [fetchTemplates, useLocalStorage]
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        console.log('🗑️ [AlertsContext] Deleting template:', templateId);
        
        if (useLocalStorage) {
          await localStorageService.alertTemplates.delete(templateId);
        } else {
          const { error } = await supabase
            .from('alert_templates')
            .delete()
            .eq('id', templateId);
          
          if (error) throw error;
        }
        
        console.log('✅ [AlertsContext] Template deleted');
        await fetchTemplates();
      } catch (error) {
        console.error('❌ [AlertsContext] Failed to delete template:', error instanceof Error ? error.message : JSON.stringify(error));
        throw error;
      }
    },
    [fetchTemplates, useLocalStorage]
  );

  const getAlertsForEvent = useCallback((eventId: string) => {
    return alerts.filter(alert => 
      (alert.type === 'event' && alert.eventId === eventId) || 
      alert.type === 'organizational'
    );
  }, [alerts]);

  const getUndismissedAlerts = useCallback(() => {
    return alerts.filter(alert => !alert.isDismissed);
  }, [alerts]);

  const getCriticalUndismissedAlerts = useCallback(() => {
    return alerts.filter(alert => !alert.isDismissed && alert.priority === 'critical');
  }, [alerts]);

  const undismissedCount = useMemo(() => alerts.filter(a => !a.isDismissed).length, [alerts]);

  return useMemo(() => ({
    alerts,
    templates,
    dismissals,
    undismissedCount,
    isLoading,
    createAlert,
    dismissAlert,
    deleteAlert,
    createTemplate,
    deleteTemplate,
    getAlertsForEvent,
    getUndismissedAlerts,
    getCriticalUndismissedAlerts,
    refreshAlerts: fetchAlerts,
  }), [alerts, templates, dismissals, undismissedCount, isLoading, createAlert, dismissAlert, deleteAlert, createTemplate, deleteTemplate, getAlertsForEvent, getUndismissedAlerts, getCriticalUndismissedAlerts, fetchAlerts]);
});
