'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardDrive,
  Trash2,
  Download,
  Upload,
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
  Archive,
  Clock,
  Shield,
  Loader2,
  ChevronRight,
  FileDown,
  FileUp
} from 'lucide-react';
import { storageOptimizer } from '@/lib/offline/storage-optimizer';
import { formatDistanceToNow } from 'date-fns';

interface StorageMetrics {
  used: number;
  quota: number;
  percentUsed: number;
  persistentStorage: boolean;
}

interface CleanupOption {
  id: string;
  name: string;
  description: string;
  estimatedSize: number;
  risk: 'low' | 'medium' | 'high';
  action: () => Promise<number>;
}

export function StorageOptimizationPanel() {
  const [metrics, setMetrics] = useState<StorageMetrics>({
    used: 0,
    quota: 0,
    percentUsed: 0,
    persistentStorage: false
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCleanupOptions, setSelectedCleanupOptions] = useState<Set<string>>(new Set());
  const [cleanupResults, setCleanupResults] = useState<{ freedSpace: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const cleanupOptions: CleanupOption[] = [
    {
      id: 'old-cache',
      name: 'Old Cache Data',
      description: 'Remove cached data older than 7 days',
      estimatedSize: 5 * 1024 * 1024, // 5MB estimate
      risk: 'low',
      action: () => storageOptimizer.cleanupOldData(7)
    },
    {
      id: 'predictive-cache',
      name: 'Predictive Cache',
      description: 'Clear AI-predicted prefetch data',
      estimatedSize: 10 * 1024 * 1024, // 10MB estimate
      risk: 'low',
      action: async () => {
        const cache = await caches.open('predictive-cache-v1');
        const requests = await cache.keys();
        await Promise.all(requests.map(req => cache.delete(req)));
        return 10 * 1024 * 1024;
      }
    },
    {
      id: 'old-offline-data',
      name: 'Old Offline Data',
      description: 'Remove offline data older than 30 days',
      estimatedSize: 15 * 1024 * 1024, // 15MB estimate
      risk: 'medium',
      action: () => storageOptimizer.cleanupOldData(30)
    },
    {
      id: 'temp-data',
      name: 'Temporary Data',
      description: 'Clear temporary and draft data',
      estimatedSize: 2 * 1024 * 1024, // 2MB estimate
      risk: 'low',
      action: async () => {
        // Clear temporary localStorage items
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('temp-') || key.startsWith('draft-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        return 2 * 1024 * 1024;
      }
    }
  ];

  useEffect(() => {
    const updateMetrics = async () => {
      const newMetrics = await storageOptimizer.updateMetrics();
      setMetrics(newMetrics);
      setSuggestions(storageOptimizer.getSuggestions());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getUsageColor = (percent: number): string => {
    if (percent < 50) return 'bg-green-500';
    if (percent < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'low': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setCleanupResults(null);
    
    try {
      let totalFreed = 0;
      
      for (const optionId of selectedCleanupOptions) {
        const option = cleanupOptions.find(o => o.id === optionId);
        if (option) {
          const freed = await option.action();
          totalFreed += freed;
        }
      }
      
      setCleanupResults({ freedSpace: totalFreed });
      setSelectedCleanupOptions(new Set());
      
      // Update metrics after cleanup
      const newMetrics = await storageOptimizer.updateMetrics();
      setMetrics(newMetrics);
      setSuggestions(storageOptimizer.getSuggestions());
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await storageOptimizer.exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = storageOptimizer.decompressData(text);
      
      // Here you would implement the actual import logic
      console.log('Importing data:', data);
      
      // Update metrics after import
      const newMetrics = await storageOptimizer.updateMetrics();
      setMetrics(newMetrics);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleCleanupOption = (optionId: string) => {
    const newSelected = new Set(selectedCleanupOptions);
    if (newSelected.has(optionId)) {
      newSelected.delete(optionId);
    } else {
      newSelected.add(optionId);
    }
    setSelectedCleanupOptions(newSelected);
  };

  const calculateEstimatedFreedSpace = (): number => {
    return Array.from(selectedCleanupOptions).reduce((total, optionId) => {
      const option = cleanupOptions.find(o => o.id === optionId);
      return total + (option?.estimatedSize || 0);
    }, 0);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Storage Optimization</h3>
              <p className="text-blue-100 text-sm">
                Manage offline storage efficiently
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

      {/* Storage Overview */}
      <div className="p-4">
        <div className="space-y-3">
          {/* Storage Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Storage Usage
              </span>
              <div className="flex items-center gap-2">
                {metrics.persistentStorage && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Shield className="w-3 h-3" />
                    <span>Persistent</span>
                  </div>
                )}
                <span className="text-sm text-gray-500">
                  {formatBytes(metrics.used)} / {formatBytes(metrics.quota)}
                </span>
              </div>
            </div>
            
            <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metrics.percentUsed}%` }}
                className={`absolute inset-y-0 left-0 ${getUsageColor(metrics.percentUsed)}`}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-medium text-white mix-blend-difference">
                  {metrics.percentUsed.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 
                           rounded-lg text-sm"
                >
                  <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 
                       dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                       transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Export Backup
            </button>
            
            <label className="flex-1">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                disabled={isImporting}
              />
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 
                            dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                            transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer">
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileUp className="w-4 h-4" />
                )}
                Import Backup
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Expanded Options */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            {/* Cleanup Options */}
            <div className="p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Cleanup Options
              </h4>
              
              <div className="space-y-2">
                {cleanupOptions.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 
                             rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCleanupOptions.has(option.id)}
                      onChange={() => toggleCleanupOption(option.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {option.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            ~{formatBytes(option.estimatedSize)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(option.risk)}`}>
                            {option.risk} risk
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Cleanup Results */}
              {cleanupResults && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-300">
                    Successfully freed {formatBytes(cleanupResults.freedSpace)} of storage space
                  </span>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {selectedCleanupOptions.size > 0 && (
                    <span>
                      Estimated space to free: {formatBytes(calculateEstimatedFreedSpace())}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing || selectedCleanupOptions.size === 0}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white 
                           rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all 
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Clean Selected
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}