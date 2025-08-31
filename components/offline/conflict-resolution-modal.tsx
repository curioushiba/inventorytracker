'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Check, 
  X, 
  GitBranch, 
  Clock, 
  User,
  Smartphone,
  Cloud,
  Merge,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  Conflict, 
  ConflictResolution, 
  conflictResolver 
} from '@/lib/offline/conflict-resolver';
import { formatDistanceToNow } from 'date-fns';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: Conflict[];
  onResolution: (resolutions: ConflictResolution[]) => void;
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  conflicts,
  onResolution
}: ConflictResolutionModalProps) {
  const [selectedResolutions, setSelectedResolutions] = useState<Map<string, string>>(new Map());
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set());
  const [autoResolveStrategy, setAutoResolveStrategy] = useState<'latest-wins' | 'remote-wins' | 'local-wins'>('latest-wins');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (conflicts.length > 0) {
      // Pre-select auto-resolution strategy for each conflict
      const newSelections = new Map<string, string>();
      conflicts.forEach(conflict => {
        const suggestion = getSuggestedResolution(conflict);
        newSelections.set(conflict.id, suggestion);
      });
      setSelectedResolutions(newSelections);
    }
  }, [conflicts]);

  const getSuggestedResolution = (conflict: Conflict): string => {
    if (conflict.localTimestamp > conflict.remoteTimestamp) {
      return 'keep-local';
    } else if (conflict.remoteTimestamp > conflict.localTimestamp) {
      return 'keep-remote';
    }
    return 'merge';
  };

  const handleAutoResolve = async () => {
    setIsResolving(true);
    try {
      const resolutions = await conflictResolver.autoResolve(conflicts, autoResolveStrategy);
      onResolution(resolutions);
      onClose();
    } catch (error) {
      console.error('Failed to auto-resolve conflicts:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleManualResolve = async () => {
    setIsResolving(true);
    try {
      const resolutions: ConflictResolution[] = [];
      
      for (const conflict of conflicts) {
        const resolution = selectedResolutions.get(conflict.id) || 'keep-local';
        const mergedValue = resolution === 'merge' 
          ? conflictResolver.suggestMerge(conflict)
          : undefined;
        
        const resolved = await conflictResolver.resolveConflict(
          conflict.id,
          resolution as any,
          mergedValue
        );
        resolutions.push(resolved);
      }
      
      onResolution(resolutions);
      onClose();
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const toggleConflictExpansion = (conflictId: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedConflicts(newExpanded);
  };

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Sync Conflicts Detected</h2>
                    <p className="text-orange-100 mt-1">
                      {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} need{conflicts.length === 1 ? 's' : ''} resolution
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Auto-resolve options */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Quick Resolution
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Apply the same resolution strategy to all conflicts
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={autoResolveStrategy}
                    onChange={(e) => setAutoResolveStrategy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="latest-wins">Latest Wins</option>
                    <option value="local-wins">Keep Local</option>
                    <option value="remote-wins">Keep Remote</option>
                  </select>
                  <button
                    onClick={handleAutoResolve}
                    disabled={isResolving}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                             transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Auto Resolve All
                  </button>
                </div>
              </div>
            </div>

            {/* Conflicts list */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
              <div className="space-y-4">
                {conflicts.map((conflict) => {
                  const isExpanded = expandedConflicts.has(conflict.id);
                  const resolution = selectedResolutions.get(conflict.id) || 'keep-local';
                  
                  return (
                    <motion.div
                      key={conflict.id}
                      layout
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleConflictExpansion(conflict.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 
                                 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <GitBranch className="w-5 h-5 text-orange-500" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {conflict.type === 'item' ? 'Item' : 'Category'}: {conflict.field}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-4 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(conflict.conflictDetectedAt, { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-200 dark:border-gray-700"
                          >
                            <div className="p-4">
                              {/* Value comparison */}
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <Smartphone className="w-4 h-4" />
                                    Local Value
                                    <span className="text-xs text-gray-500">
                                      ({formatDistanceToNow(conflict.localTimestamp, { addSuffix: true })})
                                    </span>
                                  </div>
                                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <pre className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                                      {formatValue(conflict.localValue)}
                                    </pre>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <Cloud className="w-4 h-4" />
                                    Remote Value
                                    <span className="text-xs text-gray-500">
                                      ({formatDistanceToNow(conflict.remoteTimestamp, { addSuffix: true })})
                                    </span>
                                  </div>
                                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <pre className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap">
                                      {formatValue(conflict.remoteValue)}
                                    </pre>
                                  </div>
                                </div>
                              </div>

                              {/* Resolution options */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Resolution:
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const newSelections = new Map(selectedResolutions);
                                      newSelections.set(conflict.id, 'keep-local');
                                      setSelectedResolutions(newSelections);
                                    }}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                      resolution === 'keep-local'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    Keep Local
                                  </button>
                                  <button
                                    onClick={() => {
                                      const newSelections = new Map(selectedResolutions);
                                      newSelections.set(conflict.id, 'keep-remote');
                                      setSelectedResolutions(newSelections);
                                    }}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                      resolution === 'keep-remote'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    Keep Remote
                                  </button>
                                  <button
                                    onClick={() => {
                                      const newSelections = new Map(selectedResolutions);
                                      newSelections.set(conflict.id, 'merge');
                                      setSelectedResolutions(newSelections);
                                    }}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                      resolution === 'merge'
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    <Merge className="w-4 h-4 inline mr-1" />
                                    Smart Merge
                                  </button>
                                </div>
                              </div>

                              {/* Show merge preview if merge is selected */}
                              {resolution === 'merge' && (
                                <div className="mt-4">
                                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Merge Preview:
                                  </div>
                                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <pre className="text-sm text-purple-900 dark:text-purple-100 whitespace-pre-wrap">
                                      {formatValue(conflictResolver.suggestMerge(conflict))}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-center">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 
                           dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualResolve}
                  disabled={isResolving}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white 
                           rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all 
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Apply Selected Resolutions
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}