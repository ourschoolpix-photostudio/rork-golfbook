import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/utils/supabaseService';

export function useRealtimeScores(eventId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !eventId) return;

    console.log('[Realtime] 🔴 Subscribing to scores for event:', eventId);

    try {
      const channel = supabase
        .channel(`scores-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'scores',
            filter: `event_id=eq.${eventId}`,
          },
          (payload) => {
            try {
              console.log('[Realtime] 📊 Score change detected:', payload);
              queryClient.invalidateQueries({ queryKey: ['scores', eventId] });
            } catch (error) {
              console.error('[Realtime] Error handling score change:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Scores subscription status:', status);
        });

      return () => {
        try {
          console.log('[Realtime] 🔴 Unsubscribing from scores');
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('[Realtime] Error unsubscribing from scores:', error);
        }
      };
    } catch (error) {
      console.error('[Realtime] Error setting up scores subscription:', error);
    }
  }, [eventId, enabled, queryClient]);
}

export function useRealtimeGroupings(eventId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !eventId) return;

    console.log('[Realtime] 🔴 Subscribing to groupings for event:', eventId);

    try {
      const channel = supabase
        .channel(`groupings-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'groupings',
            filter: `event_id=eq.${eventId}`,
          },
          (payload) => {
            try {
              console.log('[Realtime] 👥 Grouping change detected:', payload);
              queryClient.invalidateQueries({ queryKey: ['groupings', eventId] });
            } catch (error) {
              console.error('[Realtime] Error handling grouping change:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Groupings subscription status:', status);
        });

      return () => {
        try {
          console.log('[Realtime] 🔴 Unsubscribing from groupings');
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('[Realtime] Error unsubscribing from groupings:', error);
        }
      };
    } catch (error) {
      console.error('[Realtime] Error setting up groupings subscription:', error);
    }
  }, [eventId, enabled, queryClient]);
}

export function useRealtimeRegistrations(eventId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !eventId) return;

    console.log('[Realtime] 🔴 Subscribing to registrations for event:', eventId);

    try {
      const channel = supabase
        .channel(`registrations-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'event_registrations',
            filter: `event_id=eq.${eventId}`,
          },
          (payload) => {
            try {
              console.log('[Realtime] 📝 Registration change detected:', payload);
              queryClient.invalidateQueries({ queryKey: ['registrations', eventId] });
              queryClient.refetchQueries({ queryKey: ['registrations', eventId] });
            } catch (error) {
              console.error('[Realtime] Error handling registration change:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Registrations subscription status:', status);
        });

      return () => {
        try {
          console.log('[Realtime] 🔴 Unsubscribing from registrations');
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('[Realtime] Error unsubscribing from registrations:', error);
        }
      };
    } catch (error) {
      console.error('[Realtime] Error setting up registrations subscription:', error);
    }
  }, [eventId, enabled, queryClient]);
}

export function useRealtimeEvents(eventId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !eventId) return;

    console.log('[Realtime] 🔴 Subscribing to event:', eventId);

    try {
      const channel = supabase
        .channel(`event-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events',
            filter: `id=eq.${eventId}`,
          },
          async (payload) => {
            try {
              console.log('[Realtime] 🎯 Event change detected:', payload.eventType);
              
              // Immediately fetch fresh data and update cache for instant UI update
              const freshEvent = await supabaseService.events.get(eventId);
              if (freshEvent) {
                console.log('[Realtime] ✅ Immediately updating event cache with fresh data, useCourseHandicap:', freshEvent.useCourseHandicap);
                queryClient.setQueryData(['events', eventId], freshEvent);
              }
              
              // Also invalidate to ensure any other queries are updated
              queryClient.invalidateQueries({ queryKey: ['events'] });
            } catch (error) {
              console.error('[Realtime] Error handling event change:', error);
              // Fallback to refetch on error
              queryClient.invalidateQueries({ queryKey: ['events', eventId] });
              queryClient.refetchQueries({ queryKey: ['events', eventId] });
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Event subscription status:', status);
        });

      return () => {
        try {
          console.log('[Realtime] 🔴 Unsubscribing from event');
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('[Realtime] Error unsubscribing from event:', error);
        }
      };
    } catch (error) {
      console.error('[Realtime] Error setting up event subscription:', error);
    }
  }, [eventId, enabled, queryClient]);
}

export function useRealtimeMembers(onMemberChange: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    console.log('[Realtime] 🔴 Subscribing to members table');

    try {
      const channel = supabase
        .channel('members-all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'members',
          },
          (payload) => {
            try {
              const memberName = (payload.new as any)?.name || (payload.old as any)?.name || 'Unknown';
              console.log('[Realtime] 👤 Member change detected:', payload.eventType, memberName);
              onMemberChange();
            } catch (error) {
              console.error('[Realtime] Error handling member change:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Members subscription status:', status);
        });

      return () => {
        try {
          console.log('[Realtime] 🔴 Unsubscribing from members');
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('[Realtime] Error unsubscribing from members:', error);
        }
      };
    } catch (error) {
      console.error('[Realtime] Error setting up members subscription:', error);
    }
  }, [enabled, onMemberChange]);
}
