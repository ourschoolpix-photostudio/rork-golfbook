import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';

const STORAGE_KEYS = {
  OFFLINE_MODE: '@golf_offline_mode',
  PENDING_OPERATIONS: '@golf_pending_operations',
  OFFLINE_DATA_CACHE: '@golf_offline_data_cache',
} as const;

export type OperationType =
  | 'score_submit'
  | 'registration_create'
  | 'registration_update'
  | 'registration_delete'
  | 'grouping_sync'
  | 'member_update'
  | 'event_update';

export interface PendingOperation {
  id: string;
  type: OperationType;
  timestamp: string;
  data: any;
  eventId?: string;
  retryCount: number;
}

export interface OfflineDataCache {
  members: any[];
  events: any[];
  registrations: Record<string, any[]>;
  groupings: Record<string, any[]>;
  scores: Record<string, any[]>;
  lastUpdated: string;
}

export const [OfflineModeProvider, useOfflineMode] = createContextHook(() => {
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [offlineDataCache, setOfflineDataCache] = useState<OfflineDataCache>({
    members: [],
    events: [],
    registrations: {},
    groupings: {},
    scores: {},
    lastUpdated: new Date().toISOString(),
  });
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    loadOfflineState();
    
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('[OfflineMode] Network state changed:', state.isConnected);
      setIsConnected(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  const loadOfflineState = async () => {
    try {
      const [offlineModeData, pendingOpsData, cacheData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.PENDING_OPERATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_DATA_CACHE),
      ]);

      if (offlineModeData) {
        setIsOfflineMode(JSON.parse(offlineModeData));
      }

      if (pendingOpsData) {
        const ops = JSON.parse(pendingOpsData);
        setPendingOperations(ops);
        console.log('[OfflineMode] Loaded pending operations:', ops.length);
      }

      if (cacheData) {
        const cache = JSON.parse(cacheData);
        setOfflineDataCache(cache);
        console.log('[OfflineMode] Loaded offline cache, last updated:', cache.lastUpdated);
      }
    } catch (error) {
      console.error('[OfflineMode] Error loading offline state:', error);
    }
  };

  const enableOfflineMode = useCallback(async () => {
    console.log('[OfflineMode] 🔴 Enabling offline mode');
    setIsOfflineMode(true);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, JSON.stringify(true));
  }, []);

  const disableOfflineMode = useCallback(async () => {
    console.log('[OfflineMode] 🟢 Disabling offline mode');
    setIsOfflineMode(false);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, JSON.stringify(false));
  }, []);

  const addPendingOperation = useCallback(async (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) => {
    const newOp: PendingOperation = {
      ...operation,
      id: `${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    console.log('[OfflineMode] ➕ Adding pending operation:', newOp.type, newOp.id);

    const updatedOps = [...pendingOperations, newOp];
    setPendingOperations(updatedOps);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_OPERATIONS, JSON.stringify(updatedOps));

    return newOp.id;
  }, [pendingOperations]);

  const removePendingOperation = useCallback(async (operationId: string) => {
    console.log('[OfflineMode] ➖ Removing pending operation:', operationId);
    const updatedOps = pendingOperations.filter(op => op.id !== operationId);
    setPendingOperations(updatedOps);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_OPERATIONS, JSON.stringify(updatedOps));
  }, [pendingOperations]);

  const clearAllPendingOperations = useCallback(async () => {
    console.log('[OfflineMode] 🗑️ Clearing all pending operations');
    setPendingOperations([]);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_OPERATIONS, JSON.stringify([]));
  }, []);

  const updateOfflineCache = useCallback(async (updates: Partial<OfflineDataCache>) => {
    console.log('[OfflineMode] 💾 Updating offline cache:', Object.keys(updates));
    const updatedCache = {
      ...offlineDataCache,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    setOfflineDataCache(updatedCache);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_DATA_CACHE, JSON.stringify(updatedCache));
  }, [offlineDataCache]);

  const getCachedData = useCallback(<T extends keyof OfflineDataCache>(
    dataType: T,
    id?: string
  ): OfflineDataCache[T] | any => {
    if (id && (dataType === 'registrations' || dataType === 'groupings' || dataType === 'scores')) {
      return (offlineDataCache[dataType] as Record<string, any>)[id] || [];
    }
    return offlineDataCache[dataType];
  }, [offlineDataCache]);

  const setPendingSyncTime = useCallback(async (time: string) => {
    setLastSyncTime(time);
  }, []);

  const hasPendingChanges = useMemo(() => {
    return pendingOperations.length > 0;
  }, [pendingOperations]);

  const getOperationsByEvent = useCallback((eventId: string) => {
    return pendingOperations.filter(op => op.eventId === eventId);
  }, [pendingOperations]);

  const shouldUseOfflineMode = useMemo(() => {
    return isOfflineMode || !isConnected;
  }, [isOfflineMode, isConnected]);

  return useMemo(() => ({
    isOfflineMode,
    isConnected,
    shouldUseOfflineMode,
    isSyncing,
    hasPendingChanges,
    pendingOperations,
    lastSyncTime,
    offlineDataCache,
    enableOfflineMode,
    disableOfflineMode,
    addPendingOperation,
    removePendingOperation,
    clearAllPendingOperations,
    updateOfflineCache,
    getCachedData,
    getOperationsByEvent,
    setIsSyncing,
    setPendingSyncTime,
  }), [
    isOfflineMode,
    isConnected,
    shouldUseOfflineMode,
    isSyncing,
    hasPendingChanges,
    pendingOperations,
    lastSyncTime,
    offlineDataCache,
    enableOfflineMode,
    disableOfflineMode,
    addPendingOperation,
    removePendingOperation,
    clearAllPendingOperations,
    updateOfflineCache,
    getCachedData,
    getOperationsByEvent,
    setIsSyncing,
    setPendingSyncTime,
  ]);
});
