'use client';

import { useState, useEffect, useCallback } from 'react';
import { predictiveCache } from '@/lib/offline/predictive-cache';

export function usePredictiveCache() {
  const [cacheMetrics, setCacheMetrics] = useState({
    size: 0,
    maxSize: 50 * 1024 * 1024,
    utilizationPercent: 0
  });

  const [queueStatus, setQueueStatus] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });

  const updateMetrics = useCallback(() => {
    setCacheMetrics(predictiveCache.getCacheMetrics());
    setQueueStatus(predictiveCache.getQueueStatus());
  }, []);

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  const clearCache = useCallback(async () => {
    await predictiveCache.clearCache();
    updateMetrics();
  }, [updateMetrics]);

  return {
    cacheMetrics,
    queueStatus,
    clearCache,
    updateMetrics
  };
}