import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { Alert, AlertTemplate, AlertDismissal } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { localStorageService } from '@/utils/localStorageService';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { soundService } from '@/utils/soundService';
import { AppState, AppStateStatus } from 'react-native';

export const [AlertsProvider, useAlerts] = createContextHook(() => {
  const { currentUser } = useAuth();
  const { orgInfo } = useSettings();
  const useLocalStorage = orgInfo?.useLocalStorage || false;
  const memberId = currentUser?.id;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [templates, setTemplates] = useState<AlertTemplate[]>([]);
  const [dismissals, setDismissals] = useState<AlertDismissal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const previousUndismissedCount = useRef<number>(0);
  const isInitialLoad = useRef<boolean>(true);
  const notificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasPlayedOnAppOpen = useRef<boolean>(false);

  const fetchAlerts = useCallback(async (skipLoadingState = false) => {
    if (!memberId) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    try {
      if (!skipLoadingState) {
        setIsLoading(true);
      }
      
      if (useLocalStorage) {
        console.log('📥 [AlertsContext] Fetching alerts from local storage...');
        const storedAlerts = await localStorageService.alerts.getAll();
        const storedDismissals = await localStorageService.alertDismissals.getByMember(memberId);
        const storedRegistrations = await localStorageService.eventRegistrations.getByMember(memberId);
        const storedMembers = await localStorageService.members.getAll();
        
        const currentMember = storedMembers.find(m => m.id === memberId);
        const isAdminOrBoard = currentMember?.isAdmin || (currentMember?.boardMemberRoles && currentMember.boardMemberRoles.length > 0);
        
        const registeredEventIds = new Set(storedRegistrations.map(r => r.eventId));
        
        const now = new Date().toISOString();
        const activeAlerts = storedAlerts.filter(alert => {
          if (alert.createdBy === memberId) return false;
          if (alert.expiresAt && alert.expiresAt <= now) return false;
          
          if (alert.type === 'event' && alert.registrationOnly && alert.eventId) {
            return registeredEventIds.has(alert.eventId) || isAdminOrBoard;
          }
          
          return true;
        });
        
        const alertsWithDismissal = activeAlerts.map(alert => ({
          ...alert,
          isDismissed: storedDismissals.some(d => d.alertId === alert.id)
        }));
        
        console.log('✅ [AlertsContext] Successfully fetched alerts from local storage:', alertsWithDismissal.length);
        
        setAlerts(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(alertsWithDismissal);
          if (!hasChanged && skipLoadingState) {
            console.log('📭 [AlertsContext] No changes detected, skipping state update');
            return prev;
          }
          return alertsWithDismissal;
        });
        setDismissals(storedDismissals);
      } else {
        console.log('📥 [AlertsContext] Fetching alerts from Supabase...');
        
        const [alertsResult, dismissalsResult, registrationsResult, memberResult] = await Promise.all([
          supabase.from('alerts').select('*').order('created_at', { ascending: false }),
          supabase.from('alert_dismissals').select('*').eq('member_id', memberId),
          supabase.from('event_registrations').select('event_id').eq('member_id', memberId),
          supabase.from('members').select('is_admin, board_member_roles').eq('id', memberId).single()
        ]);
        
        if (alertsResult.error) throw alertsResult.error;
        if (dismissalsResult.error) throw dismissalsResult.error;
        
        const isAdminOrBoard = memberResult.data?.is_admin || (memberResult.data?.board_member_roles && memberResult.data.board_member_roles.length > 0);
        const registeredEventIds = new Set((registrationsResult.data || []).map((r: any) => r.event_id));
        
        const now = new Date().toISOString();
        const activeAlertsData = (alertsResult.data || []).filter((a: any) => {
          if (a.created_by === memberId) return false;
          if (a.expires_at && a.expires_at <= now) return false;
          
          if (a.type === 'event' && a.registration_only && a.event_id) {
            return registeredEventIds.has(a.event_id) || isAdminOrBoard;
          }
          
          return true;
        });
        
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
          registrationOnly: a.registration_only || false,
          isDismissed: (dismissalsResult.data || []).some((d: any) => d.alert_id === a.id)
        }));
        
        const fetchedDismissals = (dismissalsResult.data || []).map((d: any) => ({
          id: d.id,
          alertId: d.alert_id,
          memberId: d.member_id,
          dismissedAt: d.dismissed_at
        }));
        
        console.log('✅ [AlertsContext] Successfully fetched alerts:', fetchedAlerts.length);
        
        setAlerts(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(fetchedAlerts);
          if (!hasChanged && skipLoadingState) {
            console.log('📭 [AlertsContext] No changes detected, skipping state update');
            return prev;
          }
          return fetchedAlerts;
        });
        setDismissals(fetchedDismissals);
      }
    } catch (error) {
      console.error('❌ [AlertsContext] Failed to fetch alerts:', error instanceof Error ? error.message : JSON.stringify(error));
      console.log('📥 [AlertsContext] Falling back to local storage');
      
      try {
        const fallbackAlerts = await localStorageService.alerts.getAll();
        const fallbackDismissals = await localStorageService.alertDismissals.getByMember(memberId);
        const fallbackRegistrations = await localStorageService.eventRegistrations.getByMember(memberId);
        const fallbackMembers = await localStorageService.members.getAll();
        
        const currentMember = fallbackMembers.find(m => m.id === memberId);
        const isAdminOrBoard = currentMember?.isAdmin || (currentMember?.boardMemberRoles && currentMember.boardMemberRoles.length > 0);
        
        const registeredEventIds = new Set(fallbackRegistrations.map(r => r.eventId));
        
        const now = new Date().toISOString();
        const activeAlerts = fallbackAlerts.filter(alert => {
          if (alert.createdBy === memberId) return false;
          if (alert.expiresAt && alert.expiresAt <= now) return false;
          
          if (alert.type === 'event' && alert.registrationOnly && alert.eventId) {
            return registeredEventIds.has(alert.eventId) || isAdminOrBoard;
          }
          
          return true;
        });
        
        const alertsWithDismissal = activeAlerts.map(alert => ({
          ...alert,
          isDismissed: fallbackDismissals.some(d => d.alertId === alert.id)
        }));
        
        console.log('✅ [AlertsContext] Successfully fetched alerts from local storage fallback:', alertsWithDismissal.length);
        
        setAlerts(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(alertsWithDismissal);
          if (!hasChanged && skipLoadingState) {
            console.log('📭 [AlertsContext] No changes detected, skipping state update');
            return prev;
          }
          return alertsWithDismissal;
        });
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
    soundService.loadBellSound();
    soundService.loadEmergencySound();
  }, [fetchAlerts, fetchTemplates]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const nonCriticalUnread = alerts.filter(a => !a.isDismissed && a.priority !== 'critical').length;
        if (nonCriticalUnread > 0 && !hasPlayedOnAppOpen.current) {
          console.log('[AlertsContext] 🔔 App opened with unread alerts, playing bell notification');
          soundService.playBellNotification();
          hasPlayedOnAppOpen.current = true;
          setTimeout(() => {
            hasPlayedOnAppOpen.current = false;
          }, 5000);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [alerts]);

  useEffect(() => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
    }

    const nonCriticalUnread = alerts.filter(a => !a.isDismissed && a.priority !== 'critical').length;
    
    if (nonCriticalUnread > 0) {
      console.log('[AlertsContext] ⏰ Setting up 30-minute notification interval');
      notificationIntervalRef.current = setInterval(() => {
        const currentNonCriticalUnread = alerts.filter(a => !a.isDismissed && a.priority !== 'critical').length;
        if (currentNonCriticalUnread > 0) {
          console.log('[AlertsContext] 🔔 30-minute interval: Playing bell notification');
          soundService.playBellNotification();
        }
      }, 30 * 60 * 1000);
    }

    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, [alerts]);

  useEffect(() => {
    if (!memberId) return;

    console.log('[Realtime] 🔔 Setting up alerts real-time subscription for member:', memberId);

    let alertsChannel: RealtimeChannel | null = null;

    try {
      alertsChannel = supabase
        .channel(`alerts-realtime-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'alerts',
          },
          (payload) => {
            try {
              console.log('[Realtime] 🔔 Alert change detected:', payload.eventType);
              fetchAlerts(true);
            } catch (error) {
              console.log('[Realtime] Error handling alert change:', error);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] ✅ Subscribed to alerts channel');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.log('[Realtime] Alerts realtime not available - using manual refresh');
          }
        });

    } catch {
      console.log('[Realtime] Alerts subscription not available');
    }

    return () => {
      try {
        if (alertsChannel) {
          supabase.removeChannel(alertsChannel);
        }
      } catch {
        // Silently handle cleanup errors
      }
    };
  }, [memberId, fetchAlerts]);

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
            registration_only: alert.registrationOnly || false,
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

  const getOrganizationalCriticalAlerts = useCallback(() => {
    return alerts.filter(alert => 
      !alert.isDismissed && 
      alert.priority === 'critical' && 
      alert.type === 'organizational'
    );
  }, [alerts]);

  const undismissedCount = useMemo(() => alerts.filter(a => !a.isDismissed).length, [alerts]);
  const undismissedNonCriticalCount = useMemo(() => alerts.filter(a => !a.isDismissed && a.priority !== 'critical').length, [alerts]);

  useEffect(() => {
    if (isInitialLoad.current) {
      previousUndismissedCount.current = undismissedNonCriticalCount;
      isInitialLoad.current = false;
      return;
    }

    if (undismissedNonCriticalCount > previousUndismissedCount.current && undismissedNonCriticalCount > 0) {
      console.log('[AlertsContext] 🔔 New non-critical alerts detected, playing bell notification');
      soundService.playBellNotification();
    }

    previousUndismissedCount.current = undismissedNonCriticalCount;
  }, [undismissedNonCriticalCount]);

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
    getOrganizationalCriticalAlerts,
    refreshAlerts: fetchAlerts,
  }), [alerts, templates, dismissals, undismissedCount, isLoading, createAlert, dismissAlert, deleteAlert, createTemplate, deleteTemplate, getAlertsForEvent, getUndismissedAlerts, getCriticalUndismissedAlerts, getOrganizationalCriticalAlerts, fetchAlerts]);
});
