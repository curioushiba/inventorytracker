import LZString from 'lz-string';

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
  data?: string;
}

export class StorageOptimizer {
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  private metrics: StorageMetrics | null = null;

  constructor() {
    this.updateMetrics();
    this.requestPersistentStorage();
  }

  private async requestPersistentStorage(): Promise<void> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
    }
  }

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

  compressData(data: any): CompressionResult {
    const jsonString = JSON.stringify(data);
    const originalSize = new Blob([jsonString]).size;

    if (originalSize < this.COMPRESSION_THRESHOLD) {
      return {
        original: originalSize,
        compressed: originalSize,
        ratio: 1,
        data: jsonString
      };
    }

    const compressed = LZString.compressToUTF16(jsonString);
    const compressedSize = new Blob([compressed]).size;

    return {
      original: originalSize,
      compressed: compressedSize,
      ratio: compressedSize / originalSize,
      data: compressed
    };
  }

  decompressData(compressed: string): any {
    try {
      const decompressed = LZString.decompressFromUTF16(compressed);
      if (decompressed) {
        return JSON.parse(decompressed);
      }
      // If decompression fails, assume it's not compressed
      return JSON.parse(compressed);
    } catch (e) {
      console.error('Decompression failed:', e);
      try {
        return JSON.parse(compressed);
      } catch {
        return null;
      }
    }
  }

  async getAvailableSpace(): Promise<number> {
    const metrics = await this.updateMetrics();
    return metrics.quota - metrics.used;
  }

  async hasEnoughSpace(requiredBytes: number): Promise<boolean> {
    const available = await this.getAvailableSpace();
    return available >= requiredBytes;
  }

  async cleanupOldData(daysOld: number = 7): Promise<number> {
    let freedSpace = 0;
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    // Clean up IndexedDB
    if (typeof indexedDB !== 'undefined') {
      const databases = await indexedDB.databases?.() || [];
      for (const dbInfo of databases) {
        if (dbInfo.name?.startsWith('offline-')) {
          try {
            const db = await this.openDatabase(dbInfo.name);
            freedSpace += await this.cleanupDatabase(db, cutoffTime);
            db.close();
          } catch (e) {
            console.error(`Failed to cleanup database ${dbInfo.name}:`, e);
          }
        }
      }
    }

    // Clean up caches
    if ('caches' in self) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        try {
          const cache = await caches.open(cacheName);
          freedSpace += await this.cleanupCache(cache, cutoffTime);
        } catch (e) {
          console.error(`Failed to cleanup cache ${cacheName}:`, e);
        }
      }
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
    
    const storeNames = Array.from(db.objectStoreNames);
    
    for (const storeName of storeNames) {
      try {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        await new Promise<void>((resolve, reject) => {
          const request = store.openCursor();
          
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              const value = cursor.value;
              if (value.timestamp && value.timestamp < cutoffTime) {
                cursor.delete();
                freedSpace += 1024;
              }
              cursor.continue();
            } else {
              resolve();
            }
          };
          
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        console.error(`Failed to cleanup store ${storeName}:`, e);
      }
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
        freedSpace += 1024 * 10;
      }
    }

    return freedSpace;
  }

  async exportData(): Promise<Blob> {
    const data: any = {
      timestamp: Date.now(),
      version: '1.0',
      indexedDB: {},
      localStorage: {},
      caches: {}
    };

    // Export IndexedDB data
    if (typeof indexedDB !== 'undefined') {
      const databases = await indexedDB.databases?.() || [];
      for (const dbInfo of databases) {
        if (dbInfo.name) {
          try {
            data.indexedDB[dbInfo.name] = await this.exportDatabase(dbInfo.name);
          } catch (e) {
            console.error(`Failed to export database ${dbInfo.name}:`, e);
          }
        }
      }
    }

    // Export localStorage
    if (typeof localStorage !== 'undefined') {
      data.localStorage = { ...localStorage };
    }

    // Compress and return as blob
    const compressed = this.compressData(data);
    return new Blob([compressed.data || ''], { type: 'application/json' });
  }

  private async exportDatabase(name: string): Promise<any> {
    const db = await this.openDatabase(name);
    const data: any = {};

    const storeNames = Array.from(db.objectStoreNames);
    
    for (const storeName of storeNames) {
      try {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        data[storeName] = await new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        console.error(`Failed to export store ${storeName}:`, e);
        data[storeName] = [];
      }
    }

    db.close();
    return data;
  }

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

  getMetrics(): StorageMetrics | null {
    return this.metrics;
  }
}

export const storageOptimizer = new StorageOptimizer();