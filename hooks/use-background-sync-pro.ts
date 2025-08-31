import { useState, useEffect, useCallback } from 'react';
import { getBackgroundSyncPro, SyncMetrics, SYNC_PRIORITY } from '@/lib/offline/background-sync-pro';

export interface BackgroundSyncState {
  isActive: boolean;
  queueSize: number;
  activeSync: number;
  metrics: SyncMetrics;
  estimatedTime: number;
  priorityBreakdown: Record<number, number>;
}

export function useBackgroundSyncPro() {
  const [state, setState] = useState<BackgroundSyncState>({
    isActive: false,
    queueSize: 0,
    activeSync: 0,
    metrics: {
      totalOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageLatency: 0,
      compressionRatio: 0,
      priorityDistribution: {},
      lastSync: 0,
      backgroundSyncCount: 0
    },
    estimatedTime: 0,
    priorityBreakdown: {}
  });

  const backgroundSync = getBackgroundSyncPro();

  const updateState = useCallback(async () => {
    const queueStatus = backgroundSync.getQueueStatus();
    const metrics = backgroundSync.getMetrics();
    const estimatedTime = await backgroundSync.estimateProcessingTime();

    setState({
      isActive: queueStatus.pending > 0 || queueStatus.active > 0,
      queueSize: queueStatus.pending,
      activeSync: queueStatus.active,
      metrics,
      estimatedTime,
      priorityBreakdown: queueStatus.priorityBreakdown
    });
  }, [backgroundSync]);

  useEffect(() => {
    updateState();
    
    const unsubscribe = backgroundSync.onMetricsUpdate(() => {
      updateState();
    });

    // Update state every 5 seconds
    const interval = setInterval(updateState, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [backgroundSync, updateState]);

  const scheduleSync = useCallback(async (
    entity: 'item' | 'category' | 'activity',
    operation: 'create' | 'update' | 'delete',
    data: any,
    priority: number = SYNC_PRIORITY.MEDIUM,
    fieldChanges?: string[]
  ) => {
    await backgroundSync.scheduleSync(entity, operation, data, priority, fieldChanges);
    await updateState();
  }, [backgroundSync, updateState]);

  const scheduleBatch = useCallback(async (items: any[]) => {
    await backgroundSync.scheduleBatch(items);
    await updateState();
  }, [backgroundSync, updateState]);

  const scheduleBasedOnPattern = useCallback(async (
    entity: 'item' | 'category' | 'activity',
    operation: 'create' | 'update' | 'delete',
    data: any
  ) => {
    await backgroundSync.scheduleBasedOnPattern(entity, operation, data);
    await updateState();
  }, [backgroundSync, updateState]);

  const forceSyncAll = useCallback(async () => {
    await backgroundSync.forceSyncAll();
    await updateState();
  }, [backgroundSync, updateState]);

  const clearQueue = useCallback(async () => {
    await backgroundSync.clearQueue();
    await updateState();
  }, [backgroundSync, updateState]);

  const retryFailedItems = useCallback(async () => {
    await backgroundSync.retryFailedItems();
    await updateState();
  }, [backgroundSync, updateState]);

  const registerBackgroundSync = useCallback(async () => {
    await backgroundSync.registerBackgroundSync();
    await updateState();
  }, [backgroundSync, updateState]);

  const updateConfiguration = useCallback((config: any) => {
    backgroundSync.updateConfiguration(config);
    updateState();
  }, [backgroundSync, updateState]);

  return {
    state,
    actions: {
      scheduleSync,
      scheduleBatch,
      scheduleBasedOnPattern,
      forceSyncAll,
      clearQueue,
      retryFailedItems,
      registerBackgroundSync,
      updateConfiguration
    },
    utils: {
      getPriorityName: (priority: number) => {
        switch (priority) {
          case SYNC_PRIORITY.HIGH: return 'High';
          case SYNC_PRIORITY.MEDIUM: return 'Medium';
          case SYNC_PRIORITY.LOW: return 'Low';
          case SYNC_PRIORITY.BACKGROUND: return 'Background';
          default: return 'Unknown';
        }
      },
      formatEstimatedTime: (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${Math.round(ms / 1000)}s`;
        return `${Math.round(ms / 60000)}m`;
      },
      getSuccessRate: () => {
        const { successfulSyncs, totalOperations } = state.metrics;
        return totalOperations > 0 ? (successfulSyncs / totalOperations) * 100 : 0;
      }
    }
  };
}