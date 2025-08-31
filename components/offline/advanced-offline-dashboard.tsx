'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Zap,
  HardDrive,
  GitBranch,
  Activity,
  Settings,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { ConflictResolutionModal } from './conflict-resolution-modal';
import { PredictiveCacheStatus } from './predictive-cache-status';
import { StorageOptimizationPanel } from './storage-optimization-panel';
import { OfflineIndicator } from './offline-indicator';
import { SyncStatus } from './sync-status';
import { usePatternTracking } from '@/hooks/use-pattern-tracking';
import { usePredictiveCache } from '@/hooks/use-predictive-cache';
import { useStorageOptimizer } from '@/hooks/use-storage-optimizer';
import { conflictResolver } from '@/lib/offline/conflict-resolver';
import { getSyncManager } from '@/lib/offline/sync-manager';

interface OfflineMetrics {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  lastSyncTime: Date | null;
  pendingChanges: number;
  conflicts: any[];
  cacheMetrics: {
    size: number;
    maxSize: number;
    utilizationPercent: number;
  };
  storageMetrics: {
    used: number;
    quota: number;
    percentUsed: number;
    persistentStorage: boolean;
  };
}

export function AdvancedOfflineDashboard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cache' | 'storage' | 'conflicts'>('overview');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [metrics, setMetrics] = useState<OfflineMetrics>({
    isOnline: navigator.onLine,
    syncStatus: 'idle',
    lastSyncTime: null,
    pendingChanges: 0,
    conflicts: [],
    cacheMetrics: {
      size: 0,
      maxSize: 50 * 1024 * 1024,
      utilizationPercent: 0
    },
    storageMetrics: {
      used: 0,
      quota: 0,
      percentUsed: 0,
      persistentStorage: false
    }
  });

  const { trackView } = usePatternTracking();
  const { cacheMetrics, queueStatus } = usePredictiveCache();
  const { metrics: storageMetrics, suggestions } = useStorageOptimizer();

  useEffect(() => {
    // Track dashboard view
    trackView('report', undefined, { section: 'offline-dashboard' });

    // Update metrics
    const updateMetrics = async () => {
      const conflicts = conflictResolver.getUnresolvedConflicts();
      
      // Create simple sync status
      const syncStatus = {
        status: navigator.onLine ? ('idle' as const) : ('error' as const),
        lastSync: new Date(),
        pendingChanges: 0
      };
      
      setMetrics(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        syncStatus: syncStatus.status,
        lastSyncTime: syncStatus.lastSync,
        pendingChanges: syncStatus.pendingChanges,
        conflicts,
        cacheMetrics: cacheMetrics || prev.cacheMetrics,
        storageMetrics: storageMetrics || prev.storageMetrics
      }));
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    // Listen for online/offline events
    const handleOnline = () => {
      setMetrics(prev => ({ ...prev, isOnline: true }));
      const syncManager = getSyncManager();
      syncManager.syncNow(); // Trigger sync when coming online
    };
    
    const handleOffline = () => {
      setMetrics(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for conflict updates
    const unsubscribe = conflictResolver.subscribe((conflicts) => {
      setMetrics(prev => ({ ...prev, conflicts }));
      if (conflicts.length > 0) {
        setShowConflictModal(true);
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [trackView]);

  const handleManualSync = async () => {
    setMetrics(prev => ({ ...prev, syncStatus: 'syncing' }));
    try {
      const syncManager = getSyncManager();
      await syncManager.syncNow();
      setMetrics(prev => ({ ...prev, syncStatus: 'success' }));
    } catch (error) {
      setMetrics(prev => ({ ...prev, syncStatus: 'error' }));
      console.error('Manual sync failed:', error);
    }
  };

  const handleConflictResolution = (resolutions: any[]) => {
    console.log('Conflicts resolved:', resolutions);
    setShowConflictModal(false);
    // Trigger sync after resolution
    handleManualSync();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'syncing': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <AlertTriangle className="w-5 h-5" />;
      case 'syncing': return <Activity className="w-5 h-5 animate-pulse" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                {metrics.isOnline ? (
                  <Cloud className="w-6 h-6 text-white" />
                ) : (
                  <CloudOff className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Advanced Offline System</h2>
                <p className="text-indigo-100 text-sm">
                  {metrics.isOnline ? 'Online' : 'Offline'} • 
                  {metrics.pendingChanges > 0 ? ` ${metrics.pendingChanges} pending changes` : ' All synced'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronRight 
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${metrics.isOnline ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
              {metrics.isOnline ? (
                <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Connection</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {metrics.isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <span className={getStatusColor(metrics.syncStatus)}>
                {getStatusIcon(metrics.syncStatus)}
              </span>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Sync Status</div>
              <div className="font-medium text-gray-900 dark:text-white capitalize">
                {metrics.syncStatus}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Cache Usage</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {metrics.cacheMetrics.utilizationPercent.toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <GitBranch className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Conflicts</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {metrics.conflicts.length}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 dark:border-gray-700"
            >
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'cache', label: 'Predictive Cache' },
                  { id: 'storage', label: 'Storage' },
                  { id: 'conflicts', label: 'Conflicts' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                    {tab.id === 'conflicts' && metrics.conflicts.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs">
                        {metrics.conflicts.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <SyncStatus />
                    <OfflineIndicator />
                    <div className="flex gap-2">
                      <button
                        onClick={handleManualSync}
                        disabled={!metrics.isOnline || metrics.syncStatus === 'syncing'}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                                 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Manual Sync
                      </button>
                      {metrics.conflicts.length > 0 && (
                        <button
                          onClick={() => setShowConflictModal(true)}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 
                                   transition-colors"
                        >
                          Resolve Conflicts ({metrics.conflicts.length})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'cache' && (
                  <PredictiveCacheStatus />
                )}

                {activeTab === 'storage' && (
                  <StorageOptimizationPanel />
                )}

                {activeTab === 'conflicts' && (
                  <div className="space-y-4">
                    {metrics.conflicts.length > 0 ? (
                      <>
                        <p className="text-gray-600 dark:text-gray-400">
                          {metrics.conflicts.length} conflict{metrics.conflicts.length !== 1 ? 's' : ''} detected 
                          during synchronization. Review and resolve them to continue.
                        </p>
                        <button
                          onClick={() => setShowConflictModal(true)}
                          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white 
                                   rounded-lg hover:from-orange-600 hover:to-red-600 transition-all"
                        >
                          Open Conflict Resolution
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                        <p>No conflicts detected. Your data is fully synchronized.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        conflicts={metrics.conflicts}
        onResolution={handleConflictResolution}
      />
    </>
  );
}