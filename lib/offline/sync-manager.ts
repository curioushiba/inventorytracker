import { getOfflineDB, isOffline } from './db';
import { supabase } from '@/lib/supabase';
import { Item, Category } from '@/types/inventory';
import { conflictResolver } from './conflict-resolver';
import { patternAnalyzer } from './user-pattern-analyzer';
import { predictiveCache } from './predictive-cache';
import { storageOptimizer } from './storage-optimizer';

export interface SyncStatus {
  status: 'online' | 'offline' | 'syncing' | 'synced' | 'error';
  message: string;
  itemsCount?: number;
  categoriesCount?: number;
  conflicts?: number;
}

class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private syncHistory: any[] = [];

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      
      // Start periodic sync if online
      if (!isOffline()) {
        this.startPeriodicSync();
      }
    }
  }

  private async handleOnline() {
    console.log('Application is online - starting sync');
    this.notifyListeners({ status: 'online', message: 'Connection restored' });
    await this.syncNow();
    this.startPeriodicSync();
    this.scheduleBackgroundSync();
  }

  private handleOffline() {
    console.log('Application is offline');
    this.notifyListeners({ status: 'offline', message: 'Working offline' });
    this.stopPeriodicSync();
  }

  private startPeriodicSync() {
    this.stopPeriodicSync();
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (!isOffline() && !this.isSyncing) {
        this.syncNow();
      }
    }, 30000);
  }

  private stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncNow(): Promise<void> {
    if (this.isSyncing || isOffline()) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'syncing', message: 'Synchronizing data...' });

    try {
      const db = getOfflineDB();
      
      // Process sync queue first
      await this.processSyncQueue();
      
      // Fetch latest data from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id);

      if (itemsError) throw itemsError;

      // Fetch categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);

      if (categoriesError) throw categoriesError;

      // Update local database
      await db.syncWithSupabase(items || [], categories || []);
      
      this.notifyListeners({ 
        status: 'synced', 
        message: 'Data synchronized successfully',
        itemsCount: items?.length || 0,
        categoriesCount: categories?.length || 0
      });
    } catch (error) {
      console.error('Sync failed:', error);
      this.notifyListeners({ 
        status: 'error', 
        message: 'Sync failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.isSyncing = false;
    }
  }

  private async processSyncQueue() {
    const db = getOfflineDB();
    const queue = await db.getSyncQueue();

    for (const item of queue) {
      try {
        switch (item.entity) {
          case 'item':
            await this.syncItem(item);
            break;
          case 'category':
            await this.syncCategory(item);
            break;
        }
        
        // Remove from queue after successful sync
        await db.removeSyncQueueItem(item.id);
      } catch (error) {
        console.error(`Failed to sync ${item.entity} ${item.operation}:`, error);
        // Keep in queue for retry
      }
    }
  }

  private async syncItem(queueItem: any) {
    const { operation, data } = queueItem;
    
    switch (operation) {
      case 'create':
        await supabase.from('items').insert(data);
        break;
      case 'update':
        await supabase.from('items').update(data).eq('id', data.id);
        break;
      case 'delete':
        await supabase.from('items').delete().eq('id', data.id);
        break;
    }
  }

  private async syncCategory(queueItem: any) {
    const { operation, data } = queueItem;
    
    switch (operation) {
      case 'create':
        await supabase.from('categories').insert(data);
        break;
      case 'update':
        await supabase.from('categories').update(data).eq('id', data.id);
        break;
      case 'delete':
        await supabase.from('categories').delete().eq('id', data.id);
        break;
    }
  }

  // Subscribe to sync status updates
  onSyncStatusChange(listener: (status: SyncStatus) => void) {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private notifyListeners(status: SyncStatus) {
    this.syncListeners.forEach(listener => listener(status));
  }

  // Initialize offline data on first load
  async initializeOfflineData() {
    const db = getOfflineDB();
    
    try {
      if (!isOffline()) {
        await this.syncNow();
      }
    } catch (error) {
      console.error('Failed to initialize offline data:', error);
    }
  }

  // Schedule background sync
  async scheduleBackgroundSync() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // TypeScript doesn't have type definitions for Background Sync API yet
        // @ts-ignore
        await registration.sync.register('data-sync');
        console.log('Background sync scheduled');
      } catch (error) {
        console.error('Failed to schedule background sync:', error);
      }
    }
  }

  // Trigger background sync from service worker
  async triggerBackgroundSync() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_SYNC'
      });
    }
  }

  // Clean up
  destroy() {
    this.stopPeriodicSync();
    this.syncListeners.clear();
  }
}

export interface SyncStatus {
  status: 'online' | 'offline' | 'syncing' | 'synced' | 'error';
  message: string;
  error?: string;
  itemsCount?: number;
  categoriesCount?: number;
}

// Singleton instance
let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}