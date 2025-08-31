import { patternAnalyzer, type PredictedAction } from './user-pattern-analyzer';
import { supabase } from '@/lib/supabase';

interface CacheStrategy {
  maxSize: number;
  ttl: number;
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

  constructor() {
    this.listenForPatterns();
    this.startQueueProcessor();
    this.calculateCacheSize();
  }

  private listenForPatterns(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('patterns-updated', (e: Event) => {
        const patterns = (e as CustomEvent).detail;
        this.schedulePrefetch(patterns);
      });
    }
  }

  private async schedulePrefetch(patterns: any): Promise<void> {
    this.prefetchQueue = this.prefetchQueue.filter(
      t => t.status !== 'pending' || Date.now() - t.createdAt < 300000
    );

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

    if (patterns.mostAccessedItems) {
      for (const itemId of patterns.mostAccessedItems.slice(0, 10)) {
        await this.addPrefetchTask({
          resource: `/api/items/${itemId}`,
          priority: 0.7,
          strategy: {
            maxSize: 1024 * 1024,
            ttl: 3600000,
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
    }, 5000);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;

    this.isProcessing = true;

    try {
      const pendingTasks = this.prefetchQueue
        .filter(t => t.status === 'pending')
        .slice(0, this.BATCH_SIZE);

      const promises = pendingTasks.map(task => this.processPrefetchTask(task));
      await Promise.allSettled(promises);

    } finally {
      this.isProcessing = false;
    }
  }

  private async processPrefetchTask(task: PrefetchTask): Promise<void> {
    task.status = 'processing';

    try {
      if (this.cacheSize + (task.strategy.maxSize || 0) > this.MAX_CACHE_SIZE) {
        await this.evictLRUCache(task.strategy.maxSize || 0);
      }

      const response = await fetch(task.resource);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      await this.cacheResource(task.resource, data, task.strategy);

      task.status = 'completed';
      task.completedAt = Date.now();

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

    cacheEntries.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] - 
               priorityOrder[a.priority as keyof typeof priorityOrder];
      }
      return a.cachedAt - b.cachedAt;
    });

    let freedSpace = 0;
    for (const entry of cacheEntries) {
      if (freedSpace >= requiredSpace) break;
      
      await cache.delete(entry.request);
      freedSpace += 1024 * 100;
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
    return Math.min(1, Math.max(0.5, probability));
  }

  private determineStrategy(prediction: any): CacheStrategy {
    const baseStrategy: CacheStrategy = {
      maxSize: 1024 * 1024,
      ttl: 3600000,
      priority: 'medium'
    };

    if (prediction.probability > 0.8) {
      baseStrategy.priority = 'high';
      baseStrategy.ttl = 7200000;
    } else if (prediction.probability < 0.6) {
      baseStrategy.priority = 'low';
      baseStrategy.ttl = 1800000;
    }

    return baseStrategy;
  }

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

export const predictiveCache = new PredictiveCacheManager();