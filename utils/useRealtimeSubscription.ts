import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeScores(eventId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !eventId) return;

    console.log('[Realtime] 🔴 Subscribing to scores for event:', eventId);

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
          console.log('[Realtime] 📊 Score change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['scores', eventId] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Scores subscription status:', status);
      });

    return () => {
      console.log('[Realtime] 🔴 Unsubscribing from scores');
      supabase.removeChannel(channel);
    };
  }, [eventId, enabled]);
}

export function useRealtimeGroupings(eventId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !eventId) return;

    console.log('[Realtime] 🔴 Subscribing to groupings for event:', eventId);

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
          console.log('[Realtime] 👥 Grouping change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['groupings', eventId] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Groupings subscription status:', status);
      });

    return () => {
      console.log('[Realtime] 🔴 Unsubscribing from groupings');
      supabase.removeChannel(channel);
    };
  }, [eventId, enabled]);
}

export function useRealtimeRegistrations(eventId: string, enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !eventId) return;

    console.log('[Realtime] 🔴 Subscribing to registrations for event:', eventId);

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
          console.log('[Realtime] 📝 Registration change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['registrations', eventId] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Registrations subscription status:', status);
      });

    return () => {
      console.log('[Realtime] 🔴 Unsubscribing from registrations');
      supabase.removeChannel(channel);
    };
  }, [eventId, enabled]);
}
