'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  TrendingUp,
  Database,
  Clock,
  Activity,
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Eye,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { predictiveCache } from '@/lib/offline/predictive-cache';
import { patternAnalyzer } from '@/lib/offline/user-pattern-analyzer';
import { formatDistanceToNow } from 'date-fns';

// Utility function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface CacheMetrics {
  size: number;
  maxSize: number;
  utilizationPercent: number;
}

interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface PredictedAction {
  action: any;
  probability: number;
  timeWindow: { start: number; end: number };
}

export function PredictiveCacheStatus() {
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics>({
    size: 0,
    maxSize: 50 * 1024 * 1024,
    utilizationPercent: 0
  });
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [predictions, setPredictions] = useState<PredictedAction[]>([]);
  const [patterns, setPatterns] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      setCacheMetrics(predictiveCache.getCacheMetrics());
      setQueueStatus(predictiveCache.getQueueStatus());
      setPredictions(patternAnalyzer.getPredictions());
      setPatterns(patternAnalyzer.getPatterns());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    // Listen for pattern updates
    const handlePatternUpdate = (e: CustomEvent) => {
      setPatterns(e.detail);
      setPredictions(patternAnalyzer.getPredictions());
    };

    window.addEventListener('patterns-updated', handlePatternUpdate as any);

    return () => {
      clearInterval(interval);
      window.removeEventListener('patterns-updated', handlePatternUpdate as any);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Force pattern re-analysis
      const patterns = patternAnalyzer.getPatterns();
      if (patterns) {
        window.dispatchEvent(new CustomEvent('patterns-updated', {
          detail: patterns
        }));
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the predictive cache? This will remove all prefetched data.')) {
      await predictiveCache.clearCache();
      setCacheMetrics(predictiveCache.getCacheMetrics());
      setQueueStatus(predictiveCache.getQueueStatus());
    }
  };

  const formatBytesDisplay = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusColor = (percent: number): string => {
    if (percent < 50) return 'text-green-500';
    if (percent < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProbabilityColor = (probability: number): string => {
    if (probability > 0.8) return 'bg-green-500';
    if (probability > 0.6) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Predictive Cache</h3>
              <p className="text-purple-100 text-sm">
                AI-powered content prefetching
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              {isRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </button>
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
      </div>

      {/* Metrics Summary */}
      <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cache Usage */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Cache Usage
            </span>
          </div>
          <div className="relative">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${getStatusColor(cacheMetrics.utilizationPercent)}`}>
                {cacheMetrics.utilizationPercent.toFixed(0)}%
              </span>
              <span className="text-sm text-gray-500">
                {formatBytesDisplay(cacheMetrics.size)} / {formatBytesDisplay(cacheMetrics.maxSize)}
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cacheMetrics.utilizationPercent}%` }}
                className={`h-full ${
                  cacheMetrics.utilizationPercent < 50 ? 'bg-green-500' :
                  cacheMetrics.utilizationPercent < 80 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Queue Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Queue Status
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Processing</span>
              <span className="text-sm font-medium text-blue-500">{queueStatus.processing}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Pending</span>
              <span className="text-sm font-medium text-yellow-500">{queueStatus.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Completed</span>
              <span className="text-sm font-medium text-green-500">{queueStatus.completed}</span>
            </div>
          </div>
        </div>

        {/* Hit Rate */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Hit Rate
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-green-500">
                {patterns?.hitRate ? `${(patterns.hitRate * 100).toFixed(0)}%` : '0%'}
              </span>
              <span className="text-sm text-gray-500">accuracy</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-1 rounded-full ${
                    patterns?.hitRate && patterns.hitRate * 5 > i 
                      ? 'bg-green-500' 
                      : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Predictions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Predictions
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-purple-500">
                {predictions.length}
              </span>
              <span className="text-sm text-gray-500">active</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Next refresh in 5s
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            {/* Pattern Insights */}
            {patterns && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Usage Patterns
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Most Accessed Items */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Frequently Accessed
                    </div>
                    <div className="space-y-1">
                      {patterns.mostAccessedItems?.slice(0, 5).map((itemId: string, index: number) => (
                        <div key={itemId} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            Item #{itemId.slice(-6)}
                          </span>
                          <span className="text-xs text-gray-500">
                            #{index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Peak Usage Times */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Peak Activity Hours
                    </div>
                    <div className="flex items-end gap-1 h-20">
                      {[...Array(24)].map((_, hour) => {
                        const peak = patterns.peakUsageTimes?.find((t: any) => t.hour === hour);
                        const height = peak ? peak.probability * 100 : 0;
                        return (
                          <div
                            key={hour}
                            className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t relative group"
                            style={{ height: `${height}%` }}
                          >
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 
                                          group-hover:opacity-100 transition-opacity bg-gray-800 text-white 
                                          text-xs px-1 py-0.5 rounded whitespace-nowrap">
                              {hour}:00 - {height.toFixed(0)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Predictions */}
            <div className="p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Active Predictions
              </h4>
              {predictions.length > 0 ? (
                <div className="space-y-2">
                  {predictions.slice(0, 5).map((prediction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${getProbabilityColor(prediction.probability)}`}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {prediction.action.type} {prediction.action.resource}
                          </div>
                          <div className="text-xs text-gray-500">
                            {prediction.action.resourceId ? `ID: ${prediction.action.resourceId.slice(-6)}` : 'List'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {(prediction.probability * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          confidence
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No predictions yet. Keep using the app to train the AI.</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={handleClearCache}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 
                         rounded-lg transition-colors text-sm font-medium"
              >
                Clear Cache
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}