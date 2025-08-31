'use client';

// Notification types and interfaces
export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: any;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushNotificationPayload {
  type: 'low_stock' | 'stock_update' | 'system' | 'sync_status';
  data: NotificationData;
  timestamp: number;
  userId?: string;
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS = {
  lowStockAlerts: true,
  stockUpdates: true,
  systemNotifications: true,
  syncStatus: false,
  sound: true,
  vibrate: true,
  showImage: true,
  requireInteraction: false,
};

export type NotificationSettings = typeof DEFAULT_NOTIFICATION_SETTINGS;

// Notification templates
export const NOTIFICATION_TEMPLATES = {
  lowStock: (itemName: string, currentStock: number, minStock: number): NotificationData => ({
    title: '⚠️ Low Stock Alert',
    body: `${itemName} is running low (${currentStock}/${minStock})`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'low-stock',
    requireInteraction: true,
    actions: [
      {
        action: 'view-item',
        title: 'View Item',
        icon: '/icons/view.png',
      },
      {
        action: 'restock',
        title: 'Mark Restocked',
        icon: '/icons/add.png',
      },
    ],
    data: {
      type: 'low_stock',
      itemName,
      currentStock,
      minStock,
      url: '/dashboard?filter=low-stock',
    },
  }),

  stockUpdate: (itemName: string, previousStock: number, newStock: number): NotificationData => ({
    title: '📦 Stock Updated',
    body: `${itemName}: ${previousStock} → ${newStock} units`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'stock-update',
    data: {
      type: 'stock_update',
      itemName,
      previousStock,
      newStock,
      url: '/dashboard',
    },
  }),

  systemUpdate: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): NotificationData => ({
    title: '🔔 System Notification',
    body: message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'system-update',
    data: {
      type: 'system',
      level: type,
      url: '/dashboard',
    },
  }),

  syncStatus: (status: 'synced' | 'failed', itemsCount?: number): NotificationData => ({
    title: status === 'synced' ? '✅ Data Synced' : '❌ Sync Failed',
    body: status === 'synced' 
      ? `Successfully synced ${itemsCount || 0} items`
      : 'Failed to sync data. Will retry when online.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'sync-status',
    data: {
      type: 'sync_status',
      status,
      itemsCount,
      url: '/dashboard',
    },
  }),
};

// Local notification utilities (fallback when service worker is not available)
export class LocalNotificationManager {
  private settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS;

  constructor(settings?: Partial<NotificationSettings>) {
    this.settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings };
  }

  updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  async showNotification(notificationData: NotificationData): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      const notification = new Notification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon || '/icons/icon-192x192.png',
        badge: notificationData.badge || '/icons/icon-72x72.png',
        // image: this.settings.showImage ? notificationData.image : undefined, // Not supported in all browsers
        tag: notificationData.tag,
        requireInteraction: this.settings.requireInteraction || notificationData.requireInteraction,
        silent: !this.settings.sound,
        // vibrate: this.settings.vibrate ? [200, 100, 200] : undefined, // Not supported in all browsers
        data: notificationData.data,
      });

      // Handle notification clicks
      notification.onclick = (event) => {
        event.preventDefault();
        
        // Focus or open the app window
        if ('clients' in self) {
          // This would be handled by the service worker
        } else {
          // Handle in main thread
          window.focus();
          if (notificationData.data?.url) {
            window.location.href = notificationData.data.url;
          }
        }
        
        notification.close();
      };

      // Auto-close after 10 seconds if not requiring interaction
      if (!notificationData.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      return true;
    } catch (error) {
      console.error('Failed to show local notification:', error);
      return false;
    }
  }

  async showLowStockAlert(itemName: string, currentStock: number, minStock: number): Promise<boolean> {
    if (!this.settings.lowStockAlerts) return false;
    
    const notification = NOTIFICATION_TEMPLATES.lowStock(itemName, currentStock, minStock);
    return this.showNotification(notification);
  }

  async showStockUpdate(itemName: string, previousStock: number, newStock: number): Promise<boolean> {
    if (!this.settings.stockUpdates) return false;
    
    const notification = NOTIFICATION_TEMPLATES.stockUpdate(itemName, previousStock, newStock);
    return this.showNotification(notification);
  }

  async showSystemNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<boolean> {
    if (!this.settings.systemNotifications) return false;
    
    const notification = NOTIFICATION_TEMPLATES.systemUpdate(message, type);
    return this.showNotification(notification);
  }

  async showSyncStatus(status: 'synced' | 'failed', itemsCount?: number): Promise<boolean> {
    if (!this.settings.syncStatus) return false;
    
    const notification = NOTIFICATION_TEMPLATES.syncStatus(status, itemsCount);
    return this.showNotification(notification);
  }
}

// Utility functions for notification management
export function parseNotificationPayload(payload: string): PushNotificationPayload | null {
  try {
    const data = JSON.parse(payload);
    if (data && typeof data === 'object' && data.type && data.data) {
      return data as PushNotificationPayload;
    }
    return null;
  } catch (error) {
    console.error('Failed to parse notification payload:', error);
    return null;
  }
}

export function createPushPayload(
  type: PushNotificationPayload['type'],
  notificationData: NotificationData,
  userId?: string
): PushNotificationPayload {
  return {
    type,
    data: notificationData,
    timestamp: Date.now(),
    userId,
  };
}

// Queue notifications for offline scenarios
export class NotificationQueue {
  private static readonly STORAGE_KEY = 'notification_queue';
  private static readonly MAX_QUEUE_SIZE = 50;

  static add(payload: PushNotificationPayload): void {
    try {
      const queue = this.getQueue();
      queue.unshift(payload);
      
      // Limit queue size
      if (queue.length > this.MAX_QUEUE_SIZE) {
        queue.splice(this.MAX_QUEUE_SIZE);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to add notification to queue:', error);
    }
  }

  static getQueue(): PushNotificationPayload[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get notification queue:', error);
      return [];
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear notification queue:', error);
    }
  }

  static remove(timestamp: number): void {
    try {
      const queue = this.getQueue();
      const filtered = queue.filter(item => item.timestamp !== timestamp);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove notification from queue:', error);
    }
  }

  static async processQueue(notificationManager: LocalNotificationManager): Promise<void> {
    const queue = this.getQueue();
    const processed: number[] = [];

    for (const payload of queue) {
      try {
        const success = await notificationManager.showNotification(payload.data);
        if (success) {
          processed.push(payload.timestamp);
        }
      } catch (error) {
        console.error('Failed to process queued notification:', error);
      }
    }

    // Remove successfully processed notifications
    processed.forEach(timestamp => this.remove(timestamp));
  }
}