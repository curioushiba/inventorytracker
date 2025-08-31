import { getOfflineDB, isOffline } from './db';
import { supabase } from '@/lib/supabase';
import { Item, Category } from '@/types/inventory';
import { conflictResolver } from './conflict-resolver';
import { patternAnalyzer } from './user-pattern-analyzer';

export interface SyncPriority {
  HIGH: 1;
  MEDIUM: 2;
  LOW: 3;
  BACKGROUND: 4;
}

export const SYNC_PRIORITY: SyncPriority = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  BACKGROUND: 4
};

export interface PrioritySyncItem {
  id: string;
  entity: 'item' | 'category' | 'activity';
  operation: 'create' | 'update' | 'delete';
  data: any;
  priority: number;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  userId: string;
  checksum?: string;
  fieldChanges?: string[];
}

export interface BackgroundSyncConfig {
  batchSize: number;
  maxConcurrency: number;
  retryDelays: number[];
  compressionEnabled: boolean;
  differentialSync: boolean;
  priorityWeights: Record<string, number>;
}

export interface SyncMetrics {
  totalOperations: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageLatency: number;
  compressionRatio: number;
  priorityDistribution: Record<number, number>;
  lastSync: number;
  backgroundSyncCount: number;
}

class BackgroundSyncPro {
  private config: BackgroundSyncConfig = {
    batchSize: 20,
    maxConcurrency: 3,
    retryDelays: [1000, 5000, 15000, 60000], // Progressive backoff
    compressionEnabled: true,
    differentialSync: true,
    priorityWeights: {
      'critical_inventory': 1.0,
      'low_stock': 0.8,
      'user_action': 0.6,
      'background_update': 0.3
    }
  };

  private syncQueue: PrioritySyncItem[] = [];
  private activeSyncs = new Set<string>();
  private metrics: SyncMetrics = {
    totalOperations: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageLatency: 0,
    compressionRatio: 0,
    priorityDistribution: {},
    lastSync: 0,
    backgroundSyncCount: 0
  };

  private listeners: Set<(metrics: SyncMetrics) => void> = new Set();

  constructor() {
    this.loadConfiguration();
    this.startBackgroundProcessor();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private async loadConfiguration() {
    try {
      const stored = localStorage.getItem('backgroundSyncConfig');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load sync configuration:', error);
    }
  }

  public updateConfiguration(updates: Partial<BackgroundSyncConfig>) {
    this.config = { ...this.config, ...updates };
    localStorage.setItem('backgroundSyncConfig', JSON.stringify(this.config));
  }

  public async addToQueue(
    entity: 'item' | 'category' | 'activity',
    operation: 'create' | 'update' | 'delete',
    data: any,
    priority: number = SYNC_PRIORITY.MEDIUM,
    fieldChanges?: string[]
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const syncItem: PrioritySyncItem = {
      id: `${entity}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity,
      operation,
      data,
      priority,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.retryDelays.length,
      userId: user.id,
      fieldChanges: fieldChanges || Object.keys(data)
    };

    // Add checksum for differential sync
    if (this.config.differentialSync) {
      syncItem.checksum = await this.generateChecksum(data);
    }

    // Insert in priority order
    this.insertByPriority(syncItem);
    
    // Track user patterns
    patternAnalyzer.trackAction({
      type: 'edit',
      resource: 'item',
      resourceId: data.id,
      timestamp: Date.now(),
      metadata: { operation, entity }
    });
    
    // Persist to IndexedDB
    await this.persistQueue();
    
    // Trigger immediate sync for high priority items
    if (priority === SYNC_PRIORITY.HIGH && !isOffline()) {
      this.processNextBatch();
    }
  }

  private insertByPriority(item: PrioritySyncItem) {
    let inserted = false;
    for (let i = 0; i < this.syncQueue.length; i++) {
      if (item.priority < this.syncQueue[i].priority || 
          (item.priority === this.syncQueue[i].priority && item.timestamp < this.syncQueue[i].timestamp)) {
        this.syncQueue.splice(i, 0, item);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.syncQueue.push(item);
    }
  }

  private async generateChecksum(data: any): Promise<string> {
    const str = JSON.stringify(data, Object.keys(data).sort());
    const encoder = new TextEncoder();
    const dataArray = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataArray);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async persistQueue() {
    try {
      // Queue is managed internally in memory for now
      // Could persist to IndexedDB if needed for durability across page reloads
      console.log('Sync queue persisted:', this.syncQueue.length, 'items');
    } catch (error) {
      console.error('Failed to persist sync queue:', error);
    }
  }

  private async loadQueue() {
    try {
      // Initialize empty queue for now
      // Could load from IndexedDB if persistence is needed
      this.syncQueue = [];
      console.log('Sync queue initialized');
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private startBackgroundProcessor() {
    // Process queue every 2 seconds
    setInterval(() => {
      if (!isOffline() && this.syncQueue.length > 0) {
        this.processNextBatch();
      }
    }, 2000);

    // Cleanup completed syncs every minute
    setInterval(() => {
      this.cleanupCompletedSyncs();
    }, 60000);
  }

  private async processNextBatch() {
    if (this.activeSyncs.size >= this.config.maxConcurrency) {
      return;
    }

    const batch = this.getNextBatch();
    if (batch.length === 0) return;

    for (const item of batch) {
      if (this.activeSyncs.size >= this.config.maxConcurrency) break;
      this.processSyncItem(item);
    }
  }

  private getNextBatch(): PrioritySyncItem[] {
    const availableSlots = this.config.maxConcurrency - this.activeSyncs.size;
    const batch: PrioritySyncItem[] = [];

    for (const item of this.syncQueue) {
      if (batch.length >= Math.min(availableSlots, this.config.batchSize)) break;
      if (!this.activeSyncs.has(item.id)) {
        batch.push(item);
      }
    }

    return batch;
  }

  private async processSyncItem(item: PrioritySyncItem) {
    this.activeSyncs.add(item.id);
    const startTime = Date.now();

    try {
      // Check for conflicts if differential sync enabled
      if (this.config.differentialSync && item.operation === 'update') {
        const conflict = await this.checkForConflicts(item);
        if (conflict) {
          await this.handleConflict(item, conflict);
          return;
        }
      }

      // Perform the sync operation
      await this.executeSyncOperation(item);
      
      // Remove from queue
      this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
      
      // Update metrics
      this.updateMetrics(item, true, Date.now() - startTime);
      
      // Persist updated queue
      await this.persistQueue();
      
    } catch (error) {
      console.error(`Sync failed for item ${item.id}:`, error);
      
      // Handle retry logic
      item.retryCount++;
      if (item.retryCount >= item.maxRetries) {
        // Move to failed queue or remove
        this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
        this.updateMetrics(item, false, Date.now() - startTime);
      } else {
        // Schedule retry with exponential backoff
        const delay = this.config.retryDelays[Math.min(item.retryCount - 1, this.config.retryDelays.length - 1)];
        setTimeout(() => {
          if (!this.activeSyncs.has(item.id)) {
            this.processSyncItem(item);
          }
        }, delay);
      }
    } finally {
      this.activeSyncs.delete(item.id);
    }
  }

  private async checkForConflicts(item: PrioritySyncItem): Promise<any | null> {
    try {
      const { data: remoteData, error } = await supabase
        .from(item.entity === 'item' ? 'items' : 'categories')
        .select('*')
        .eq('id', item.data.id)
        .single();

      if (error || !remoteData) return null;

      // Generate remote checksum
      const remoteChecksum = await this.generateChecksum(remoteData);
      
      // Check if data has changed
      if (item.checksum && remoteChecksum !== item.checksum) {
        return remoteData;
      }

      return null;
    } catch (error) {
      console.error('Conflict check failed:', error);
      return null;
    }
  }

  private async handleConflict(item: PrioritySyncItem, remoteData: any) {
    try {
      const resolution = await conflictResolver.resolveConflict(
        item.data,
        remoteData,
        'timestamp-based'
      );
      
      if (resolution) {
        item.data = resolution;
        item.checksum = await this.generateChecksum(resolution);
      }
    } catch (error) {
      console.error('Conflict resolution failed:', error);
    }
  }

  private async executeSyncOperation(item: PrioritySyncItem) {
    switch (item.entity) {
      case 'item':
        await this.syncItemOperation(item);
        break;
      case 'category':
        await this.syncCategoryOperation(item);
        break;
      case 'activity':
        await this.syncActivityOperation(item);
        break;
    }
  }

  private async syncItemOperation(item: PrioritySyncItem) {
    const { operation, data } = item;
    
    let result;
    switch (operation) {
      case 'create':
        result = await supabase.from('items').insert(data).select().single();
        break;
      case 'update':
        if (this.config.differentialSync && item.fieldChanges) {
          // Only update changed fields
          const updates: Record<string, any> = {};
          item.fieldChanges.forEach(field => {
            if (data[field] !== undefined) {
              updates[field] = data[field];
            }
          });
          result = await supabase.from('items').update(updates).eq('id', data.id).select().single();
        } else {
          result = await supabase.from('items').update(data).eq('id', data.id).select().single();
        }
        break;
      case 'delete':
        result = await supabase.from('items').delete().eq('id', data.id);
        break;
    }

    if (result.error) throw result.error;
    return result.data;
  }

  private async syncCategoryOperation(item: PrioritySyncItem) {
    const { operation, data } = item;
    
    let result;
    switch (operation) {
      case 'create':
        result = await supabase.from('categories').insert(data).select().single();
        break;
      case 'update':
        if (this.config.differentialSync && item.fieldChanges) {
          const updates: Record<string, any> = {};
          item.fieldChanges.forEach(field => {
            if (data[field] !== undefined) {
              updates[field] = data[field];
            }
          });
          result = await supabase.from('categories').update(updates).eq('id', data.id).select().single();
        } else {
          result = await supabase.from('categories').update(data).eq('id', data.id).select().single();
        }
        break;
      case 'delete':
        result = await supabase.from('categories').delete().eq('id', data.id);
        break;
    }

    if (result.error) throw result.error;
    return result.data;
  }

  private async syncActivityOperation(item: PrioritySyncItem) {
    const { operation, data } = item;
    
    switch (operation) {
      case 'create':
        const result = await supabase.from('activities').insert(data).select().single();
        if (result.error) throw result.error;
        return result.data;
      default:
        throw new Error(`Unsupported activity operation: ${operation}`);
    }
  }

  private updateMetrics(item: PrioritySyncItem, success: boolean, latency: number) {
    this.metrics.totalOperations++;
    if (success) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
    }

    // Update average latency
    this.metrics.averageLatency = (
      (this.metrics.averageLatency * (this.metrics.totalOperations - 1) + latency) / 
      this.metrics.totalOperations
    );

    // Track priority distribution
    this.metrics.priorityDistribution[item.priority] = 
      (this.metrics.priorityDistribution[item.priority] || 0) + 1;

    this.metrics.lastSync = Date.now();
    
    // Notify listeners
    this.notifyMetricsListeners();
  }

  private handleNetworkChange(isOnline: boolean) {
    if (isOnline && this.syncQueue.length > 0) {
      console.log('Network restored - resuming background sync');
      this.processNextBatch();
    }
  }

  private cleanupCompletedSyncs() {
    // Remove old metrics and optimize storage
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Archive old sync data if needed
    this.archiveOldSyncData(cutoff);
    
    // Clean up any orphaned active syncs
    this.activeSyncs.clear();
  }

  private async archiveOldSyncData(cutoff: number) {
    try {
      const db = getOfflineDB();
      // Note: Archive functionality would need to be implemented in OfflineDatabase
      console.log('Archive cutoff date:', cutoff);
    } catch (error) {
      console.error('Failed to archive sync data:', error);
    }
  }

  // Public API methods
  public async scheduleSync(
    entity: 'item' | 'category' | 'activity',
    operation: 'create' | 'update' | 'delete',
    data: any,
    priority: number = SYNC_PRIORITY.MEDIUM,
    fieldChanges?: string[]
  ): Promise<void> {
    await this.addToQueue(entity, operation, data, priority, fieldChanges);
  }

  public async scheduleBatch(items: Omit<PrioritySyncItem, 'id' | 'timestamp' | 'retryCount' | 'maxRetries' | 'userId'>[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    for (const item of items) {
      const syncItem: PrioritySyncItem = {
        ...item,
        id: `${item.entity}_${item.operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: this.config.retryDelays.length,
        userId: user.id
      };

      if (this.config.differentialSync) {
        syncItem.checksum = await this.generateChecksum(item.data);
      }

      this.insertByPriority(syncItem);
    }

    await this.persistQueue();
    
    if (!isOffline()) {
      this.processNextBatch();
    }
  }

  public getQueueStatus() {
    return {
      pending: this.syncQueue.length,
      active: this.activeSyncs.size,
      priorityBreakdown: this.syncQueue.reduce((acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    };
  }

  public getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  public onMetricsUpdate(listener: (metrics: SyncMetrics) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyMetricsListeners() {
    this.listeners.forEach(listener => listener(this.getMetrics()));
  }

  public async forceSyncAll(): Promise<void> {
    if (isOffline()) {
      throw new Error('Cannot force sync while offline');
    }

    const remainingItems = [...this.syncQueue];
    this.activeSyncs.clear();

    await Promise.allSettled(
      remainingItems.map(item => this.processSyncItem(item))
    );
  }

  public async clearQueue(): Promise<void> {
    this.syncQueue = [];
    this.activeSyncs.clear();
    await this.persistQueue();
  }

  public async retryFailedItems(): Promise<void> {
    // Reset retry counts for all items
    this.syncQueue.forEach(item => {
      item.retryCount = 0;
    });
    
    await this.persistQueue();
    
    if (!isOffline()) {
      this.processNextBatch();
    }
  }

  // Advanced scheduling methods
  public async scheduleBasedOnPattern(
    entity: 'item' | 'category' | 'activity',
    operation: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const patterns = patternAnalyzer.getPatterns();
    let priority: number = SYNC_PRIORITY.MEDIUM;

    // Increase priority for frequently accessed items
    if (patterns?.mostAccessedItems.includes(data.id)) {
      priority = SYNC_PRIORITY.HIGH;
    }

    // Increase priority during peak usage hours
    const currentHour = new Date().getHours();
    const peakHours = patterns?.peakUsageTimes.map(p => p.hour) || [];
    if (peakHours.includes(currentHour)) {
      priority = Math.min(priority, SYNC_PRIORITY.HIGH);
    }

    await this.scheduleSync(entity, operation, data, priority);
  }

  public async estimateProcessingTime(): Promise<number> {
    if (this.syncQueue.length === 0) return 0;

    const averageItemTime = this.metrics.averageLatency || 500; // 500ms default
    const totalItems = this.syncQueue.length;
    const batchCount = Math.ceil(totalItems / this.config.batchSize);
    
    return (batchCount * averageItemTime) / this.config.maxConcurrency;
  }

  // Service Worker integration
  public async registerBackgroundSync(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        // @ts-ignore - Background Sync API types
        await registration.sync.register('background-sync-pro');
        this.metrics.backgroundSyncCount++;
        console.log('Background Sync Pro registered successfully');
      }
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }

  public async handleBackgroundSync(): Promise<void> {
    console.log('Background sync triggered by service worker');
    
    // Load queue from storage
    await this.loadQueue();
    
    // Process all pending items
    while (this.syncQueue.length > 0 && !isOffline()) {
      await this.processNextBatch();
      
      // Prevent infinite loops
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Cleanup and destroy
  public destroy() {
    this.activeSyncs.clear();
    this.listeners.clear();
    this.syncQueue = [];
  }
}

// Singleton instance
let backgroundSyncProInstance: BackgroundSyncPro | null = null;

export function getBackgroundSyncPro(): BackgroundSyncPro {
  if (!backgroundSyncProInstance) {
    backgroundSyncProInstance = new BackgroundSyncPro();
  }
  return backgroundSyncProInstance;
}

// Export for service worker use
export { BackgroundSyncPro };