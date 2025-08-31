# Week 9 Implementation Guide - Advanced Offline Features
## Day-by-Day Implementation with Code Examples

**Week**: 9 of PWA Migration  
**Focus**: Advanced Offline Features  
**Duration**: 5 Days  
**Status**: Ready to Implement  

---

## Day 1-2: Smart Caching with Predictive Prefetching

### Day 1 Morning: Pattern Recognition Engine

#### Step 1: Create User Pattern Analyzer
```typescript
// lib/offline/user-pattern-analyzer.ts
import { Item, Category } from '@/types/inventory';

interface UserAction {
  type: 'view' | 'edit' | 'add' | 'delete';
  resource: 'item' | 'category' | 'report';
  resourceId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface UserPattern {
  mostAccessedItems: string[];
  peakUsageTimes: { hour: number; probability: number }[];
  categoryPreferences: { categoryId: string; frequency: number }[];
  actionSequences: ActionSequence[];
  predictedNextActions: PredictedAction[];
}

interface ActionSequence {
  actions: UserAction[];
  frequency: number;
  lastOccurred: number;
}

interface PredictedAction {
  action: UserAction;
  probability: number;
  timeWindow: { start: number; end: number };
}

export class UserPatternAnalyzer {
  private actionHistory: UserAction[] = [];
  private patterns: UserPattern | null = null;
  private readonly MAX_HISTORY_SIZE = 1000;
  private readonly PATTERN_THRESHOLD = 0.3; // 30% probability threshold

  constructor() {
    this.loadHistoryFromStorage();
    this.analyzePatterns();
  }

  // Track user actions
  trackAction(action: UserAction): void {
    this.actionHistory.push({
      ...action,
      timestamp: Date.now()
    });

    // Limit history size
    if (this.actionHistory.length > this.MAX_HISTORY_SIZE) {
      this.actionHistory = this.actionHistory.slice(-this.MAX_HISTORY_SIZE);
    }

    this.saveHistoryToStorage();
    this.analyzePatterns();
  }

  // Analyze patterns using frequency analysis
  private analyzePatterns(): void {
    if (this.actionHistory.length < 10) return;

    const patterns: UserPattern = {
      mostAccessedItems: this.findMostAccessedItems(),
      peakUsageTimes: this.analyzePeakTimes(),
      categoryPreferences: this.analyzeCategoryPreferences(),
      actionSequences: this.findActionSequences(),
      predictedNextActions: this.predictNextActions()
    };

    this.patterns = patterns;
    this.notifyPrefetchManager(patterns);
  }

  // Find frequently accessed items
  private findMostAccessedItems(): string[] {
    const itemAccess = new Map<string, number>();
    
    this.actionHistory
      .filter(a => a.resource === 'item' && a.resourceId)
      .forEach(action => {
        const count = itemAccess.get(action.resourceId!) || 0;
        itemAccess.set(action.resourceId!, count + 1);
      });

    // Sort by frequency and return top 20
    return Array.from(itemAccess.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);
  }

  // Analyze peak usage times
  private analyzePeakTimes(): { hour: number; probability: number }[] {
    const hourlyUsage = new Array(24).fill(0);
    
    this.actionHistory.forEach(action => {
      const hour = new Date(action.timestamp).getHours();
      hourlyUsage[hour]++;
    });

    const total = this.actionHistory.length;
    return hourlyUsage.map((count, hour) => ({
      hour,
      probability: count / total
    })).filter(t => t.probability > 0.05); // At least 5% activity
  }

  // Analyze category preferences
  private analyzeCategoryPreferences(): { categoryId: string; frequency: number }[] {
    const categoryAccess = new Map<string, number>();
    
    this.actionHistory
      .filter(a => a.metadata?.categoryId)
      .forEach(action => {
        const categoryId = action.metadata!.categoryId;
        const count = categoryAccess.get(categoryId) || 0;
        categoryAccess.set(categoryId, count + 1);
      });

    return Array.from(categoryAccess.entries())
      .map(([categoryId, count]) => ({
        categoryId,
        frequency: count / this.actionHistory.length
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  // Find common action sequences using n-gram analysis
  private findActionSequences(): ActionSequence[] {
    const sequences = new Map<string, ActionSequence>();
    const windowSize = 3; // Look for 3-action sequences

    for (let i = 0; i <= this.actionHistory.length - windowSize; i++) {
      const sequence = this.actionHistory.slice(i, i + windowSize);
      const key = this.sequenceToKey(sequence);
      
      if (sequences.has(key)) {
        const existing = sequences.get(key)!;
        existing.frequency++;
        existing.lastOccurred = sequence[sequence.length - 1].timestamp;
      } else {
        sequences.set(key, {
          actions: sequence,
          frequency: 1,
          lastOccurred: sequence[sequence.length - 1].timestamp
        });
      }
    }

    return Array.from(sequences.values())
      .filter(s => s.frequency > 2) // At least 3 occurrences
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  // Predict next likely actions based on current context
  private predictNextActions(): PredictedAction[] {
    const predictions: PredictedAction[] = [];
    const currentHour = new Date().getHours();
    const recentActions = this.actionHistory.slice(-5);

    // Time-based predictions
    const peakTime = this.analyzePeakTimes()
      .find(t => Math.abs(t.hour - currentHour) <= 1);
    
    if (peakTime && peakTime.probability > this.PATTERN_THRESHOLD) {
      // Predict frequently accessed items during peak times
      this.findMostAccessedItems().slice(0, 5).forEach(itemId => {
        predictions.push({
          action: {
            type: 'view',
            resource: 'item',
            resourceId: itemId,
            timestamp: Date.now()
          },
          probability: peakTime.probability,
          timeWindow: {
            start: Date.now(),
            end: Date.now() + 3600000 // Next hour
          }
        });
      });
    }

    // Sequence-based predictions
    const matchingSequences = this.findMatchingSequences(recentActions);
    matchingSequences.forEach(sequence => {
      if (sequence.frequency > 5) {
        const nextAction = sequence.actions[sequence.actions.length - 1];
        predictions.push({
          action: nextAction,
          probability: sequence.frequency / this.actionHistory.length,
          timeWindow: {
            start: Date.now(),
            end: Date.now() + 300000 // Next 5 minutes
          }
        });
      }
    });

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  // Helper: Convert sequence to string key
  private sequenceToKey(actions: UserAction[]): string {
    return actions.map(a => `${a.type}:${a.resource}`).join('->');
  }

  // Helper: Find sequences matching recent actions
  private findMatchingSequences(recentActions: UserAction[]): ActionSequence[] {
    if (recentActions.length < 2) return [];
    
    const recentKey = this.sequenceToKey(recentActions.slice(-2));
    return this.findActionSequences()
      .filter(seq => this.sequenceToKey(seq.actions.slice(0, 2)) === recentKey);
  }

  // Notify prefetch manager of new patterns
  private notifyPrefetchManager(patterns: UserPattern): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('patterns-updated', {
        detail: patterns
      }));
    }
  }

  // Storage management
  private loadHistoryFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem('user-action-history');
    if (stored) {
      try {
        this.actionHistory = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load action history:', e);
      }
    }
  }

  private saveHistoryToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('user-action-history', JSON.stringify(this.actionHistory));
    } catch (e) {
      console.error('Failed to save action history:', e);
    }
  }

  // Public API
  getPatterns(): UserPattern | null {
    return this.patterns;
  }

  getPredictions(): PredictedAction[] {
    return this.patterns?.predictedNextActions || [];
  }

  clearHistory(): void {
    this.actionHistory = [];
    this.patterns = null;
    this.saveHistoryToStorage();
  }
}

// Singleton instance
export const patternAnalyzer = new UserPatternAnalyzer();
```

#### Step 2: Create Predictive Cache Manager
```typescript
// lib/offline/predictive-cache.ts
import { patternAnalyzer, type PredictedAction } from './user-pattern-analyzer';
import { supabase } from '@/lib/supabase';
import { getOfflineDB } from './db';

interface CacheStrategy {
  maxSize: number; // in MB
  ttl: number; // in ms
  priority: 'high' | 'medium' | 'low';
}

interface PrefetchTask {
  id: string;
  resource: string;
  priority: number;
  strategy: CacheStrategy;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export class PredictiveCacheManager {
  private prefetchQueue: PrefetchTask[] = [];
  private isProcessing = false;
  private cacheSize = 0;
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly BATCH_SIZE = 5;
  private worker: Worker | null = null;

  constructor() {
    this.initializeWorker();
    this.listenForPatterns();
    this.startQueueProcessor();
    this.calculateCacheSize();
  }

  private initializeWorker(): void {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      // Create a web worker for background prefetching
      const workerCode = `
        self.addEventListener('message', async (e) => {
          const { type, data } = e.data;
          
          if (type === 'prefetch') {
            try {
              const response = await fetch(data.url);
              const content = await response.text();
              self.postMessage({
                type: 'prefetch-complete',
                taskId: data.taskId,
                content,
                size: new Blob([content]).size
              });
            } catch (error) {
              self.postMessage({
                type: 'prefetch-error',
                taskId: data.taskId,
                error: error.message
              });
            }
          }
        });
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.worker.addEventListener('message', (e) => {
        this.handleWorkerMessage(e.data);
      });
    }
  }

  private listenForPatterns(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('patterns-updated', (e: CustomEvent) => {
        const patterns = e.detail;
        this.schedulePrefetch(patterns);
      });
    }
  }

  private async schedulePrefetch(patterns: any): Promise<void> {
    // Clear old pending tasks
    this.prefetchQueue = this.prefetchQueue.filter(
      t => t.status !== 'pending' || Date.now() - t.createdAt < 300000
    );

    // Schedule prefetch for predicted actions
    const predictions = patternAnalyzer.getPredictions();
    
    for (const prediction of predictions) {
      if (prediction.probability > 0.5) {
        await this.addPrefetchTask({
          resource: this.buildResourceUrl(prediction.action),
          priority: this.calculatePriority(prediction.probability),
          strategy: this.determineStrategy(prediction)
        });
      }
    }

    // Prefetch frequently accessed items
    if (patterns.mostAccessedItems) {
      for (const itemId of patterns.mostAccessedItems.slice(0, 10)) {
        await this.addPrefetchTask({
          resource: `/api/items/${itemId}`,
          priority: 0.7,
          strategy: {
            maxSize: 1024 * 1024, // 1MB per item
            ttl: 3600000, // 1 hour
            priority: 'medium'
          }
        });
      }
    }
  }

  private async addPrefetchTask(options: {
    resource: string;
    priority: number;
    strategy: CacheStrategy;
  }): Promise<void> {
    // Check if already cached or queued
    if (await this.isResourceCached(options.resource)) {
      return;
    }

    const task: PrefetchTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      resource: options.resource,
      priority: options.priority,
      strategy: options.strategy,
      status: 'pending',
      createdAt: Date.now()
    };

    this.prefetchQueue.push(task);
    this.prefetchQueue.sort((a, b) => b.priority - a.priority);
  }

  private async startQueueProcessor(): Promise<void> {
    setInterval(() => {
      if (!this.isProcessing && this.prefetchQueue.length > 0) {
        this.processQueue();
      }
    }, 5000); // Check every 5 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;

    this.isProcessing = true;

    try {
      // Get pending tasks
      const pendingTasks = this.prefetchQueue
        .filter(t => t.status === 'pending')
        .slice(0, this.BATCH_SIZE);

      // Process tasks in parallel
      const promises = pendingTasks.map(task => this.processPrefetchTask(task));
      await Promise.allSettled(promises);

    } finally {
      this.isProcessing = false;
    }
  }

  private async processPrefetchTask(task: PrefetchTask): Promise<void> {
    task.status = 'processing';

    try {
      // Check cache size limit
      if (this.cacheSize + (task.strategy.maxSize || 0) > this.MAX_CACHE_SIZE) {
        await this.evictLRUCache(task.strategy.maxSize || 0);
      }

      // Fetch resource
      const response = await fetch(task.resource);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      // Store in cache
      await this.cacheResource(task.resource, data, task.strategy);

      task.status = 'completed';
      task.completedAt = Date.now();

      // Update cache size
      this.cacheSize += new Blob([JSON.stringify(data)]).size;

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Prefetch failed for ${task.resource}:`, error);
    }
  }

  private async cacheResource(
    resource: string,
    data: any,
    strategy: CacheStrategy
  ): Promise<void> {
    const cache = await caches.open('predictive-cache-v1');
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${Math.floor(strategy.ttl / 1000)}`,
        'X-Cache-Priority': strategy.priority,
        'X-Cached-At': new Date().toISOString()
      }
    });

    await cache.put(resource, response);
  }

  private async isResourceCached(resource: string): Promise<boolean> {
    const cache = await caches.open('predictive-cache-v1');
    const response = await cache.match(resource);
    
    if (!response) return false;

    // Check if cache is still valid
    const cachedAt = response.headers.get('X-Cached-At');
    if (cachedAt) {
      const age = Date.now() - new Date(cachedAt).getTime();
      const maxAge = parseInt(response.headers.get('Cache-Control')?.match(/max-age=(\d+)/)?.[1] || '0') * 1000;
      
      if (age > maxAge) {
        await cache.delete(resource);
        return false;
      }
    }

    return true;
  }

  private async evictLRUCache(requiredSpace: number): Promise<void> {
    const cache = await caches.open('predictive-cache-v1');
    const requests = await cache.keys();
    
    // Sort by access time (LRU)
    const cacheEntries = await Promise.all(
      requests.map(async req => {
        const response = await cache.match(req);
        const cachedAt = response?.headers.get('X-Cached-At');
        return {
          request: req,
          cachedAt: cachedAt ? new Date(cachedAt).getTime() : 0,
          priority: response?.headers.get('X-Cache-Priority') || 'low'
        };
      })
    );

    // Sort by priority and age
    cacheEntries.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] - 
               priorityOrder[a.priority as keyof typeof priorityOrder];
      }
      return a.cachedAt - b.cachedAt;
    });

    // Evict until we have enough space
    let freedSpace = 0;
    for (const entry of cacheEntries) {
      if (freedSpace >= requiredSpace) break;
      
      await cache.delete(entry.request);
      freedSpace += 1024 * 100; // Estimate 100KB per entry
    }
  }

  private async calculateCacheSize(): Promise<void> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      this.cacheSize = estimate.usage || 0;
    }
  }

  private buildResourceUrl(action: any): string {
    const baseUrl = '/api';
    
    switch (action.resource) {
      case 'item':
        return action.resourceId 
          ? `${baseUrl}/items/${action.resourceId}`
          : `${baseUrl}/items`;
      case 'category':
        return action.resourceId
          ? `${baseUrl}/categories/${action.resourceId}`
          : `${baseUrl}/categories`;
      case 'report':
        return `${baseUrl}/reports/summary`;
      default:
        return baseUrl;
    }
  }

  private calculatePriority(probability: number): number {
    // Scale probability to priority (0.5-1.0 -> 0.5-1.0)
    return Math.min(1, Math.max(0.5, probability));
  }

  private determineStrategy(prediction: any): CacheStrategy {
    const baseStrategy: CacheStrategy = {
      maxSize: 1024 * 1024, // 1MB default
      ttl: 3600000, // 1 hour default
      priority: 'medium'
    };

    // Adjust based on probability
    if (prediction.probability > 0.8) {
      baseStrategy.priority = 'high';
      baseStrategy.ttl = 7200000; // 2 hours
    } else if (prediction.probability < 0.6) {
      baseStrategy.priority = 'low';
      baseStrategy.ttl = 1800000; // 30 minutes
    }

    return baseStrategy;
  }

  private handleWorkerMessage(data: any): void {
    if (data.type === 'prefetch-complete') {
      const task = this.prefetchQueue.find(t => t.id === data.taskId);
      if (task) {
        task.status = 'completed';
        task.completedAt = Date.now();
        this.cacheSize += data.size;
      }
    } else if (data.type === 'prefetch-error') {
      const task = this.prefetchQueue.find(t => t.id === data.taskId);
      if (task) {
        task.status = 'failed';
        task.error = data.error;
      }
    }
  }

  // Public API
  getQueueStatus(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const status = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    this.prefetchQueue.forEach(task => {
      status[task.status]++;
    });

    return status;
  }

  getCacheMetrics(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    return {
      size: this.cacheSize,
      maxSize: this.MAX_CACHE_SIZE,
      utilizationPercent: (this.cacheSize / this.MAX_CACHE_SIZE) * 100
    };
  }

  async clearCache(): Promise<void> {
    const cache = await caches.open('predictive-cache-v1');
    const requests = await cache.keys();
    await Promise.all(requests.map(req => cache.delete(req)));
    this.cacheSize = 0;
    this.prefetchQueue = [];
  }
}

// Singleton instance
export const predictiveCache = new PredictiveCacheManager();
```

### Day 1 Afternoon: Storage Optimization

#### Step 3: Create Storage Optimizer
```typescript
// lib/offline/storage-optimizer.ts
import { compress, decompress } from 'lz-string';

interface StorageMetrics {
  used: number;
  quota: number;
  percentUsed: number;
  persistentStorage: boolean;
}

interface CompressionResult {
  original: number;
  compressed: number;
  ratio: number;
}

export class StorageOptimizer {
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  private metrics: StorageMetrics | null = null;

  constructor() {
    this.updateMetrics();
    this.requestPersistentStorage();
  }

  // Request persistent storage permission
  private async requestPersistentStorage(): Promise<void> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
    }
  }

  // Update storage metrics
  async updateMetrics(): Promise<StorageMetrics> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      
      this.metrics = {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentUsed: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
        persistentStorage: await navigator.storage.persisted?.() || false
      };

      return this.metrics;
    }

    return {
      used: 0,
      quota: 0,
      percentUsed: 0,
      persistentStorage: false
    };
  }

  // Compress data for storage
  compressData(data: any): CompressionResult {
    const jsonString = JSON.stringify(data);
    const originalSize = new Blob([jsonString]).size;

    if (originalSize < this.COMPRESSION_THRESHOLD) {
      return {
        original: originalSize,
        compressed: originalSize,
        ratio: 1
      };
    }

    const compressed = compress(jsonString);
    const compressedSize = new Blob([compressed]).size;

    return {
      original: originalSize,
      compressed: compressedSize,
      ratio: compressedSize / originalSize
    };
  }

  // Decompress data from storage
  decompressData(compressed: string): any {
    try {
      const decompressed = decompress(compressed);
      return JSON.parse(decompressed);
    } catch (e) {
      // If decompression fails, assume it's not compressed
      return JSON.parse(compressed);
    }
  }

  // Get available storage space
  async getAvailableSpace(): Promise<number> {
    const metrics = await this.updateMetrics();
    return metrics.quota - metrics.used;
  }

  // Check if we have enough space
  async hasEnoughSpace(requiredBytes: number): Promise<boolean> {
    const available = await this.getAvailableSpace();
    return available >= requiredBytes;
  }

  // Clean up old cached data
  async cleanupOldData(daysOld: number = 7): Promise<number> {
    let freedSpace = 0;
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    // Clean up IndexedDB
    const databases = await indexedDB.databases?.() || [];
    for (const dbInfo of databases) {
      if (dbInfo.name?.startsWith('offline-')) {
        const db = await this.openDatabase(dbInfo.name);
        freedSpace += await this.cleanupDatabase(db, cutoffTime);
      }
    }

    // Clean up caches
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      freedSpace += await this.cleanupCache(cache, cutoffTime);
    }

    return freedSpace;
  }

  private async openDatabase(name: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async cleanupDatabase(db: IDBDatabase, cutoffTime: number): Promise<number> {
    let freedSpace = 0;
    
    const transaction = db.transaction(db.objectStoreNames, 'readwrite');
    
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      const storeName = db.objectStoreNames[i];
      const store = transaction.objectStore(storeName);
      
      const request = store.openCursor();
      await new Promise<void>((resolve) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const value = cursor.value;
            if (value.timestamp && value.timestamp < cutoffTime) {
              cursor.delete();
              freedSpace += 1024; // Estimate
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    }

    return freedSpace;
  }

  private async cleanupCache(cache: Cache, cutoffTime: number): Promise<number> {
    let freedSpace = 0;
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      const cachedAt = response?.headers.get('X-Cached-At');
      
      if (cachedAt && new Date(cachedAt).getTime() < cutoffTime) {
        await cache.delete(request);
        freedSpace += 1024 * 10; // Estimate 10KB per entry
      }
    }

    return freedSpace;
  }

  // Export data for backup
  async exportData(): Promise<Blob> {
    const data: any = {
      timestamp: Date.now(),
      version: '1.0',
      indexedDB: {},
      localStorage: {},
      caches: {}
    };

    // Export IndexedDB data
    const databases = await indexedDB.databases?.() || [];
    for (const dbInfo of databases) {
      if (dbInfo.name) {
        data.indexedDB[dbInfo.name] = await this.exportDatabase(dbInfo.name);
      }
    }

    // Export localStorage
    data.localStorage = { ...localStorage };

    // Compress and return as blob
    const compressed = this.compressData(data);
    return new Blob([compressed], { type: 'application/json' });
  }

  private async exportDatabase(name: string): Promise<any> {
    const db = await this.openDatabase(name);
    const data: any = {};

    const transaction = db.transaction(db.objectStoreNames, 'readonly');
    
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      const storeName = db.objectStoreNames[i];
      const store = transaction.objectStore(storeName);
      
      data[storeName] = await new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
      });
    }

    return data;
  }

  // Get storage optimization suggestions
  getSuggestions(): string[] {
    const suggestions: string[] = [];

    if (!this.metrics) return suggestions;

    if (this.metrics.percentUsed > 80) {
      suggestions.push('Storage usage is high. Consider clearing old data.');
    }

    if (!this.metrics.persistentStorage) {
      suggestions.push('Enable persistent storage to prevent data loss.');
    }

    if (this.metrics.percentUsed > 50) {
      suggestions.push('Consider enabling data compression for large items.');
    }

    return suggestions;
  }
}

// Singleton instance
export const storageOptimizer = new StorageOptimizer();
```

### Day 2: Advanced Conflict Resolution UI

#### Step 4: Create Conflict Resolution System
```typescript
// lib/offline/conflict-resolver.ts
import { Item, Category } from '@/types/inventory';
import { supabase } from '@/lib/supabase';

export interface Conflict {
  id: string;
  type: 'item' | 'category';
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: number;
  remoteTimestamp: number;
  conflictDetectedAt: number;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'keep-local' | 'keep-remote' | 'merge' | 'custom';
  mergedValue?: any;
  resolvedBy: string;
  resolvedAt: number;
}

export interface ConflictContext {
  item?: Item;
  category?: Category;
  conflicts: Conflict[];
  relatedChanges: Change[];
}

interface Change {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  source: 'local' | 'remote';
}

export class ConflictResolver {
  private conflicts: Map<string, Conflict> = new Map();
  private resolutions: ConflictResolution[] = [];
  private conflictListeners: Set<(conflicts: Conflict[]) => void> = new Set();

  // Detect conflicts between local and remote data
  detectConflicts(
    local: Item | Category,
    remote: Item | Category,
    type: 'item' | 'category'
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    const localTimestamp = (local as any).updated_at || Date.now();
    const remoteTimestamp = (remote as any).updated_at || Date.now();

    // Compare all fields
    Object.keys(local).forEach(field => {
      if (field === 'id' || field === 'user_id') return;

      const localValue = (local as any)[field];
      const remoteValue = (remote as any)[field];

      // Check if values differ and both have been modified
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        const conflict: Conflict = {
          id: `conflict-${type}-${(local as any).id}-${field}-${Date.now()}`,
          type,
          field,
          localValue,
          remoteValue,
          localTimestamp,
          remoteTimestamp,
          conflictDetectedAt: Date.now()
        };

        conflicts.push(conflict);
        this.conflicts.set(conflict.id, conflict);
      }
    });

    // Notify listeners if conflicts found
    if (conflicts.length > 0) {
      this.notifyListeners();
    }

    return conflicts;
  }

  // Auto-resolve conflicts based on strategy
  async autoResolve(
    conflicts: Conflict[],
    strategy: 'latest-wins' | 'remote-wins' | 'local-wins' = 'latest-wins'
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      let resolution: 'keep-local' | 'keep-remote' = 'keep-local';

      switch (strategy) {
        case 'latest-wins':
          resolution = conflict.localTimestamp > conflict.remoteTimestamp 
            ? 'keep-local' 
            : 'keep-remote';
          break;
        case 'remote-wins':
          resolution = 'keep-remote';
          break;
        case 'local-wins':
          resolution = 'keep-local';
          break;
      }

      const conflictResolution: ConflictResolution = {
        conflictId: conflict.id,
        resolution,
        resolvedBy: 'auto',
        resolvedAt: Date.now()
      };

      resolutions.push(conflictResolution);
      this.resolutions.push(conflictResolution);
      this.conflicts.delete(conflict.id);
    }

    this.notifyListeners();
    return resolutions;
  }

  // Manual conflict resolution
  async resolveConflict(
    conflictId: string,
    resolution: 'keep-local' | 'keep-remote' | 'merge' | 'custom',
    mergedValue?: any
  ): Promise<ConflictResolution> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const conflictResolution: ConflictResolution = {
      conflictId,
      resolution,
      mergedValue: resolution === 'merge' || resolution === 'custom' ? mergedValue : undefined,
      resolvedBy: 'user',
      resolvedAt: Date.now()
    };

    this.resolutions.push(conflictResolution);
    this.conflicts.delete(conflictId);
    this.notifyListeners();

    return conflictResolution;
  }

  // Apply resolutions to data
  applyResolutions(
    data: Item | Category,
    resolutions: ConflictResolution[],
    conflicts: Conflict[]
  ): Item | Category {
    const resolved = { ...data };

    resolutions.forEach(resolution => {
      const conflict = conflicts.find(c => c.id === resolution.conflictId);
      if (!conflict) return;

      switch (resolution.resolution) {
        case 'keep-local':
          (resolved as any)[conflict.field] = conflict.localValue;
          break;
        case 'keep-remote':
          (resolved as any)[conflict.field] = conflict.remoteValue;
          break;
        case 'merge':
        case 'custom':
          if (resolution.mergedValue !== undefined) {
            (resolved as any)[conflict.field] = resolution.mergedValue;
          }
          break;
      }
    });

    return resolved;
  }

  // Intelligent merge suggestions
  suggestMerge(conflict: Conflict): any {
    // For numeric values, suggest average
    if (typeof conflict.localValue === 'number' && typeof conflict.remoteValue === 'number') {
      return (conflict.localValue + conflict.remoteValue) / 2;
    }

    // For strings, suggest concatenation if different
    if (typeof conflict.localValue === 'string' && typeof conflict.remoteValue === 'string') {
      if (conflict.field === 'description' || conflict.field === 'notes') {
        return `${conflict.localValue}\n---\n${conflict.remoteValue}`;
      }
    }

    // For arrays, suggest union
    if (Array.isArray(conflict.localValue) && Array.isArray(conflict.remoteValue)) {
      return [...new Set([...conflict.localValue, ...conflict.remoteValue])];
    }

    // Default to keeping the latest
    return conflict.localTimestamp > conflict.remoteTimestamp 
      ? conflict.localValue 
      : conflict.remoteValue;
  }

  // Get conflict context for better decision making
  async getConflictContext(conflict: Conflict): Promise<ConflictContext> {
    const context: ConflictContext = {
      conflicts: [conflict],
      relatedChanges: []
    };

    // Fetch full item/category data
    if (conflict.type === 'item') {
      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('id', (conflict as any).itemId)
        .single();
      
      if (data) {
        context.item = data;
      }
    } else {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('id', (conflict as any).categoryId)
        .single();
      
      if (data) {
        context.category = data;
      }
    }

    // Get change history (would need activity log)
    // This is a simplified version
    context.relatedChanges = [
      {
        field: conflict.field,
        oldValue: null,
        newValue: conflict.localValue,
        timestamp: conflict.localTimestamp,
        source: 'local'
      },
      {
        field: conflict.field,
        oldValue: null,
        newValue: conflict.remoteValue,
        timestamp: conflict.remoteTimestamp,
        source: 'remote'
      }
    ];

    return context;
  }

  // Subscribe to conflict updates
  subscribe(listener: (conflicts: Conflict[]) => void): () => void {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  private notifyListeners(): void {
    const conflicts = Array.from(this.conflicts.values());
    this.conflictListeners.forEach(listener => listener(conflicts));
  }

  // Get all unresolved conflicts
  getUnresolvedConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }

  // Get resolution history
  getResolutionHistory(): ConflictResolution[] {
    return [...this.resolutions];
  }

  // Clear all conflicts
  clearConflicts(): void {
    this.conflicts.clear();
    this.notifyListeners();
  }

  // Export conflicts for debugging
  exportConflicts(): string {
    return JSON.stringify({
      conflicts: Array.from(this.conflicts.values()),
      resolutions: this.resolutions
    }, null, 2);
  }
}

// Singleton instance
export const conflictResolver = new ConflictResolver();
```

---

## Implementation Checklist for Week 9

### Day 1-2: Smart Caching
- [ ] Implement UserPatternAnalyzer class
- [ ] Create PredictiveCacheManager
- [ ] Build StorageOptimizer
- [ ] Create React hooks for pattern tracking
- [ ] Add cache settings UI component
- [ ] Test pattern recognition accuracy
- [ ] Verify prefetch queue processing
- [ ] Validate storage optimization

### Day 3-4: Conflict Resolution
- [ ] Implement ConflictResolver class
- [ ] Create conflict detection logic
- [ ] Build resolution strategies
- [ ] Design conflict UI components
- [ ] Implement merge algorithms
- [ ] Add sync history tracking
- [ ] Create resolution audit trail
- [ ] Test conflict scenarios

### Day 5: Integration & Testing
- [ ] Integrate with existing offline system
- [ ] Update sync manager for conflicts
- [ ] Add analytics tracking
- [ ] Implement error recovery
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Documentation updates
- [ ] Prepare for Week 10

---

## Testing Scripts

### Pattern Recognition Test
```typescript
// tests/pattern-recognition.test.ts
import { UserPatternAnalyzer } from '@/lib/offline/user-pattern-analyzer';

describe('Pattern Recognition', () => {
  let analyzer: UserPatternAnalyzer;

  beforeEach(() => {
    analyzer = new UserPatternAnalyzer();
  });

  test('identifies frequently accessed items', () => {
    // Simulate user actions
    for (let i = 0; i < 10; i++) {
      analyzer.trackAction({
        type: 'view',
        resource: 'item',
        resourceId: 'item-1',
        timestamp: Date.now()
      });
    }

    const patterns = analyzer.getPatterns();
    expect(patterns?.mostAccessedItems).toContain('item-1');
  });

  test('predicts next actions based on sequences', () => {
    // Create a repeating sequence
    const sequence = [
      { type: 'view', resource: 'category' },
      { type: 'view', resource: 'item' },
      { type: 'edit', resource: 'item' }
    ];

    // Repeat sequence multiple times
    for (let i = 0; i < 5; i++) {
      sequence.forEach(action => {
        analyzer.trackAction({
          ...action,
          timestamp: Date.now()
        } as any);
      });
    }

    const predictions = analyzer.getPredictions();
    expect(predictions.length).toBeGreaterThan(0);
    expect(predictions[0].probability).toBeGreaterThan(0.5);
  });
});
```

### Conflict Resolution Test
```typescript
// tests/conflict-resolution.test.ts
import { ConflictResolver } from '@/lib/offline/conflict-resolver';

describe('Conflict Resolution', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  test('detects conflicts between local and remote data', () => {
    const local = {
      id: '1',
      name: 'Local Name',
      quantity: 10,
      updated_at: Date.now()
    };

    const remote = {
      id: '1',
      name: 'Remote Name',
      quantity: 15,
      updated_at: Date.now() - 1000
    };

    const conflicts = resolver.detectConflicts(local, remote, 'item');
    expect(conflicts.length).toBe(2); // name and quantity conflicts
  });

  test('auto-resolves with latest-wins strategy', async () => {
    const conflict = {
      id: 'test-conflict',
      type: 'item' as const,
      field: 'quantity',
      localValue: 10,
      remoteValue: 15,
      localTimestamp: Date.now(),
      remoteTimestamp: Date.now() - 1000,
      conflictDetectedAt: Date.now()
    };

    const resolutions = await resolver.autoResolve([conflict], 'latest-wins');
    expect(resolutions[0].resolution).toBe('keep-local');
  });

  test('suggests intelligent merge for numeric values', () => {
    const conflict = {
      id: 'test-conflict',
      type: 'item' as const,
      field: 'quantity',
      localValue: 10,
      remoteValue: 20,
      localTimestamp: Date.now(),
      remoteTimestamp: Date.now(),
      conflictDetectedAt: Date.now()
    };

    const suggestion = resolver.suggestMerge(conflict);
    expect(suggestion).toBe(15); // Average of 10 and 20
  });
});
```

---

## Notes for Implementation

1. **Pattern Recognition**: Start collecting user behavior data immediately to train the pattern recognition system
2. **Cache Management**: Monitor cache size carefully to avoid filling user's storage
3. **Conflict UI**: Make conflict resolution UI very clear and intuitive - users should understand the implications
4. **Performance**: Use Web Workers for heavy computation to avoid blocking the main thread
5. **Testing**: Test with various network conditions and storage constraints
6. **Progressive Enhancement**: Ensure all features gracefully degrade for older browsers

---

**Next Steps**: After completing Day 1-2 implementation, move to conflict resolution UI components on Day 3-4.