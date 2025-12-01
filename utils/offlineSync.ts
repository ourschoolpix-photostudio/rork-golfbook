import { supabase } from '@/integrations/supabase/client';
import type { PendingOperation } from '@/contexts/OfflineModeContext';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: { operationId: string; error: string }[];
}

export const syncPendingOperations = async (
  pendingOperations: PendingOperation[],
  onOperationComplete?: (operationId: string, success: boolean) => void
): Promise<SyncResult> => {
  console.log('[OfflineSync] 🔄 Starting sync of', pendingOperations.length, 'operations');
  
  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    failedCount: 0,
    errors: [],
  };

  for (const operation of pendingOperations) {
    try {
      console.log('[OfflineSync] Processing:', operation.type, operation.id);
      
      switch (operation.type) {
        case 'score_submit':
          await syncScoreSubmit(operation);
          break;
        
        case 'registration_create':
          await syncRegistrationCreate(operation);
          break;
        
        case 'registration_update':
          await syncRegistrationUpdate(operation);
          break;
        
        case 'registration_delete':
          await syncRegistrationDelete(operation);
          break;
        
        case 'grouping_sync':
          await syncGroupings(operation);
          break;
        
        case 'member_update':
          await syncMemberUpdate(operation);
          break;
        
        case 'event_update':
          await syncEventUpdate(operation);
          break;
        
        default:
          console.warn('[OfflineSync] Unknown operation type:', operation.type);
      }
      
      result.syncedCount++;
      if (onOperationComplete) {
        onOperationComplete(operation.id, true);
      }
      console.log('[OfflineSync] ✅ Synced:', operation.type, operation.id);
      
    } catch (error) {
      result.failedCount++;
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({
        operationId: operation.id,
        error: errorMessage,
      });
      
      if (onOperationComplete) {
        onOperationComplete(operation.id, false);
      }
      console.error('[OfflineSync] ❌ Failed to sync:', operation.type, operation.id, error);
    }
  }

  console.log('[OfflineSync] 📊 Sync complete:', result);
  return result;
};

async function syncScoreSubmit(operation: PendingOperation): Promise<void> {
  const { eventId, memberId, day, holes, totalScore, submittedBy } = operation.data;
  
  const { data: existing, error: fetchError } = await supabase
    .from('scores')
    .select('updated_at')
    .eq('event_id', eventId)
    .eq('member_id', memberId)
    .eq('day', day)
    .maybeSingle();
  
  if (fetchError) throw fetchError;
  
  if (existing && operation.timestamp) {
    const existingTime = new Date(existing.updated_at).getTime();
    const operationTime = new Date(operation.timestamp).getTime();
    if (existingTime > operationTime) {
      console.log('[OfflineSync] ⚠️ Server has newer score, skipping update');
      return;
    }
  }
  
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
}

async function syncRegistrationCreate(operation: PendingOperation): Promise<void> {
  const { eventId, memberId } = operation.data;
  
  const { error } = await supabase.from('event_registrations').insert({
    event_id: eventId,
    member_id: memberId,
    status: 'registered',
  });
  
  if (error) throw error;
}

async function syncRegistrationUpdate(operation: PendingOperation): Promise<void> {
  const { registrationId, updates } = operation.data;
  
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
}

async function syncRegistrationDelete(operation: PendingOperation): Promise<void> {
  const { eventId, memberId } = operation.data;
  
  const { error } = await supabase
    .from('event_registrations')
    .delete()
    .eq('event_id', eventId)
    .eq('member_id', memberId);
  
  if (error) throw error;
}

async function syncGroupings(operation: PendingOperation): Promise<void> {
  const { eventId, groupings } = operation.data;
  
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
}

async function syncMemberUpdate(operation: PendingOperation): Promise<void> {
  const { memberId, updates } = operation.data;
  
  const supabaseUpdates: any = {};
  if (updates.name) supabaseUpdates.name = updates.name;
  if (updates.email) supabaseUpdates.email = updates.email;
  if (updates.phone) supabaseUpdates.phone = updates.phone;
  if (updates.handicap !== undefined) supabaseUpdates.handicap = updates.handicap;
  
  const { error } = await supabase
    .from('members')
    .update(supabaseUpdates)
    .eq('id', memberId);
  
  if (error) throw error;
}

async function syncEventUpdate(operation: PendingOperation): Promise<void> {
  const { eventId, updates } = operation.data;
  
  const supabaseUpdates: any = {};
  if (updates.status) supabaseUpdates.status = updates.status;
  if (updates.name) supabaseUpdates.name = updates.name;
  if (updates.date) supabaseUpdates.date = updates.date;
  
  const { error } = await supabase
    .from('events')
    .update(supabaseUpdates)
    .eq('id', eventId);
  
  if (error) throw error;
}
