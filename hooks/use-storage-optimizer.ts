'use client';

import { useState, useEffect, useCallback } from 'react';
import { storageOptimizer } from '@/lib/offline/storage-optimizer';

export function useStorageOptimizer() {
  const [metrics, setMetrics] = useState<{
    used: number;
    quota: number;
    percentUsed: number;
    persistentStorage: boolean;
  } | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);

  const updateMetrics = useCallback(async () => {
    const newMetrics = await storageOptimizer.updateMetrics();
    setMetrics(newMetrics);
    setSuggestions(storageOptimizer.getSuggestions());
  }, []);

  useEffect(() => {
    updateMetrics();
  }, [updateMetrics]);

  const cleanupOldData = useCallback(async (daysOld: number = 7) => {
    const freedSpace = await storageOptimizer.cleanupOldData(daysOld);
    await updateMetrics();
    return freedSpace;
  }, [updateMetrics]);

  const exportData = useCallback(async () => {
    return await storageOptimizer.exportData();
  }, []);

  const hasEnoughSpace = useCallback(async (requiredBytes: number) => {
    return await storageOptimizer.hasEnoughSpace(requiredBytes);
  }, []);

  const compressData = useCallback((data: any) => {
    return storageOptimizer.compressData(data);
  }, []);

  const decompressData = useCallback((compressed: string) => {
    return storageOptimizer.decompressData(compressed);
  }, []);

  return {
    metrics,
    suggestions,
    updateMetrics,
    cleanupOldData,
    exportData,
    hasEnoughSpace,
    compressData,
    decompressData
  };
}