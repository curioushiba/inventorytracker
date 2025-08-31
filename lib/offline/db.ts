import { Item, Category } from '@/types/inventory';

const DB_NAME = 'InventoryTrackerOfflineDB';
const DB_VERSION = 1;

interface OfflineItem extends Item {
  syncStatus?: 'pending' | 'synced' | 'conflict';
  localId?: string;
}

interface OfflineCategory extends Category {
  syncStatus?: 'pending' | 'synced' | 'conflict';
  localId?: string;
}

interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entity: 'item' | 'category';
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineDatabase {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Items store
        if (!db.objectStoreNames.contains('items')) {
          const itemStore = db.createObjectStore('items', { keyPath: 'id' });
          itemStore.createIndex('userId', 'userId', { unique: false });
          itemStore.createIndex('category', 'category', { unique: false });
          itemStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          itemStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
          categoryStore.createIndex('userId', 'userId', { unique: false });
          categoryStore.createIndex('name', 'name', { unique: false });
          categoryStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('operation', 'operation', { unique: false });
          syncStore.createIndex('entity', 'entity', { unique: false });
        }

        // Activity log store
        if (!db.objectStoreNames.contains('activities')) {
          const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
          activityStore.createIndex('timestamp', 'timestamp', { unique: false });
          activityStore.createIndex('userId', 'userId', { unique: false });
          activityStore.createIndex('itemId', 'itemId', { unique: false });
        }

        // Notifications store (for offline notification handling)
        if (!db.objectStoreNames.contains('notifications')) {
          const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' });
          notificationStore.createIndex('timestamp', 'timestamp', { unique: false });
          notificationStore.createIndex('type', 'type', { unique: false });
          notificationStore.createIndex('userId', 'userId', { unique: false });
          notificationStore.createIndex('processed', 'processed', { unique: false });
        }
      };
    });
  }

  async getItems(userId: string): Promise<OfflineItem[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['items'], 'readonly');
      const store = transaction.objectStore('items');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveItem(item: OfflineItem): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['items'], 'readwrite');
      const store = transaction.objectStore('items');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteItem(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['items'], 'readwrite');
      const store = transaction.objectStore('items');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCategories(userId: string): Promise<OfflineCategory[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readonly');
      const store = transaction.objectStore('categories');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveCategory(category: OfflineCategory): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readwrite');
      const store = transaction.objectStore('categories');
      const request = store.put(category);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    if (!this.db) await this.init();

    const queueItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retries: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add(queueItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    const stores = ['items', 'categories', 'syncQueue', 'activities', 'notifications'];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite');
      
      stores.forEach(storeName => {
        transaction.objectStore(storeName).clear();
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async syncWithSupabase(items: Item[], categories: Category[]): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['items', 'categories'], 'readwrite');
    
    // Clear and repopulate items
    const itemStore = transaction.objectStore('items');
    await new Promise((resolve, reject) => {
      const clearRequest = itemStore.clear();
      clearRequest.onsuccess = () => resolve(undefined);
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    for (const item of items) {
      await new Promise((resolve, reject) => {
        const request = itemStore.add({ ...item, syncStatus: 'synced' });
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }

    // Clear and repopulate categories
    const categoryStore = transaction.objectStore('categories');
    await new Promise((resolve, reject) => {
      const clearRequest = categoryStore.clear();
      clearRequest.onsuccess = () => resolve(undefined);
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    for (const category of categories) {
      await new Promise((resolve, reject) => {
        const request = categoryStore.add({ ...category, syncStatus: 'synced' });
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Singleton instance
let dbInstance: OfflineDatabase | null = null;

export function getOfflineDB(): OfflineDatabase {
  if (!dbInstance) {
    dbInstance = new OfflineDatabase();
  }
  return dbInstance;
}

// Helper function to check if we're offline
export function isOffline(): boolean {
  return !navigator.onLine;
}

// Helper function to check if IndexedDB is supported
export function isIndexedDBSupported(): boolean {
  try {
    return 'indexedDB' in window && indexedDB !== null;
  } catch (e) {
    return false;
  }
}