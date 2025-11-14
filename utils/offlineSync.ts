import { trpcClient } from '@/lib/trpc';
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
  
  await trpcClient.sync.scores.submit.mutate({
    eventId,
    memberId,
    day,
    holes: holes || [],
    totalScore,
    submittedBy,
  });
}

async function syncRegistrationCreate(operation: PendingOperation): Promise<void> {
  const { eventId, memberId } = operation.data;
  
  await trpcClient.events.register.mutate({
    eventId,
    memberId,
  });
}

async function syncRegistrationUpdate(operation: PendingOperation): Promise<void> {
  const { registrationId, updates } = operation.data;
  
  await trpcClient.registrations.update.mutate({
    registrationId,
    updates,
  });
}

async function syncRegistrationDelete(operation: PendingOperation): Promise<void> {
  const { eventId, memberId } = operation.data;
  
  await trpcClient.events.unregister.mutate({
    eventId,
    memberId,
  });
}

async function syncGroupings(operation: PendingOperation): Promise<void> {
  const { eventId, groupings, syncedBy } = operation.data;
  
  await trpcClient.sync.groupings.sync.mutate({
    eventId,
    groupings,
    syncedBy,
  });
}

async function syncMemberUpdate(operation: PendingOperation): Promise<void> {
  const { memberId, updates } = operation.data;
  
  await trpcClient.members.update.mutate({
    memberId,
    updates,
  });
}

async function syncEventUpdate(operation: PendingOperation): Promise<void> {
  const { eventId, updates } = operation.data;
  
  await trpcClient.events.update.mutate({
    eventId,
    updates,
  });
}
