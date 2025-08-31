import { supabase } from '@/lib/supabase';
import { Item } from '@/types/inventory';
import { patternAnalyzer } from '@/lib/offline/user-pattern-analyzer';

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
  url?: string;
}

export interface RichNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  vibrate?: number[];
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'stock' | 'sync' | 'system' | 'user';
  silent: boolean;
  requireInteraction: boolean;
  persistent: boolean;
  scheduled?: number;
}

export interface NotificationTemplate {
  name: string;
  title: (data: any) => string;
  body: (data: any) => string;
  icon: string;
  actions: NotificationAction[];
  vibrate: number[];
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface StockAlert {
  itemId: string;
  itemName: string;
  currentQuantity: number;
  lowStockThreshold: number;
  criticalThreshold: number;
  lastRestocked?: Date;
  alertLevel: 'warning' | 'critical' | 'urgent';
  suppressed: boolean;
  nextAlertTime?: number;
}

class RichNotificationManager {
  private templates: Map<string, NotificationTemplate> = new Map();
  private scheduledNotifications: Map<string, number> = new Map();
  private stockAlerts: Map<string, StockAlert> = new Map();
  private notificationHistory: RichNotification[] = [];
  private permissionStatus: NotificationPermission = 'default';
  
  private config = {
    maxHistorySize: 100,
    stockCheckInterval: 300000, // 5 minutes
    urgentVibrationPattern: [200, 100, 200, 100, 200],
    normalVibrationPattern: [200],
    suppressDuration: 3600000, // 1 hour
    batchNotificationDelay: 5000 // 5 seconds
  };

  constructor() {
    this.initializeTemplates();
    this.loadStoredData();
    
    if (typeof window !== 'undefined') {
      this.checkPermissionStatus();
      this.startStockMonitoring();
    }
  }

  private initializeTemplates() {
    // Low Stock Alert Template
    this.templates.set('low-stock', {
      name: 'Low Stock Alert',
      title: (data: StockAlert) => `Low Stock: ${data.itemName}`,
      body: (data: StockAlert) => 
        `Only ${data.currentQuantity} units remaining (threshold: ${data.lowStockThreshold})`,
      icon: '/icons/warning-192x192.png',
      actions: [
        { action: 'restock', title: 'Restock Now', icon: '/icons/add.png', url: '/dashboard?action=restock&item=' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/close.png' },
        { action: 'snooze', title: 'Snooze 1hr', icon: '/icons/clock.png' }
      ],
      vibrate: [200, 100, 200],
      category: 'stock',
      priority: 'high'
    });

    // Critical Stock Alert Template
    this.templates.set('critical-stock', {
      name: 'Critical Stock Alert',
      title: (data: StockAlert) => `🚨 CRITICAL: ${data.itemName}`,
      body: (data: StockAlert) => 
        `URGENT: Only ${data.currentQuantity} units left! Immediate restocking required.`,
      icon: '/icons/alert-192x192.png',
      actions: [
        { action: 'emergency-restock', title: 'Emergency Restock', icon: '/icons/emergency.png', url: '/dashboard?action=emergency-restock&item=' },
        { action: 'view-suppliers', title: 'View Suppliers', icon: '/icons/suppliers.png' },
        { action: 'dismiss', title: 'Acknowledge', icon: '/icons/check.png' }
      ],
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      category: 'stock',
      priority: 'urgent'
    });

    // Sync Completion Template
    this.templates.set('sync-complete', {
      name: 'Sync Complete',
      title: (data: any) => 'Data Synchronized',
      body: (data: any) => `${data.itemCount} items and ${data.categoryCount} categories synced successfully`,
      icon: '/icons/sync-192x192.png',
      actions: [
        { action: 'view-changes', title: 'View Changes', icon: '/icons/list.png', url: '/dashboard?view=recent' },
        { action: 'dismiss', title: 'OK', icon: '/icons/check.png' }
      ],
      vibrate: [100, 50, 100],
      category: 'sync',
      priority: 'normal'
    });

    // New Item Added Template
    this.templates.set('item-added', {
      name: 'Item Added',
      title: (data: Item) => 'New Item Added',
      body: (data: Item) => `${data.name} has been added to your inventory`,
      icon: '/icons/add-192x192.png',
      actions: [
        { action: 'view-item', title: 'View Item', icon: '/icons/view.png', url: '/dashboard?item=' },
        { action: 'dismiss', title: 'OK', icon: '/icons/check.png' }
      ],
      vibrate: [100],
      category: 'user',
      priority: 'normal'
    });

    // System Update Template
    this.templates.set('system-update', {
      name: 'App Update Available',
      title: (data: any) => 'Update Available',
      body: (data: any) => `A new version of Inventory Tracker is available with ${data.features} new features`,
      icon: '/icons/update-192x192.png',
      actions: [
        { action: 'update-now', title: 'Update Now', icon: '/icons/download.png' },
        { action: 'later', title: 'Later', icon: '/icons/clock.png' },
        { action: 'dismiss', title: 'Skip', icon: '/icons/close.png' }
      ],
      vibrate: [200],
      category: 'system',
      priority: 'normal'
    });
  }

  private async checkPermissionStatus() {
    if ('Notification' in window) {
      this.permissionStatus = Notification.permission;
    }
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    if (this.permissionStatus === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    this.permissionStatus = permission;
    
    if (permission === 'granted') {
      await this.setupPushSubscription();
    }
    
    return permission;
  }

  private async setupPushSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY
      });

      // Send subscription to server
      await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      console.log('Push subscription created successfully');
    } catch (error) {
      console.error('Failed to setup push subscription:', error);
    }
  }

  public async sendRichNotification(templateName: string, data: any): Promise<string | null> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const notification: RichNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: template.title(data),
      body: template.body(data),
      icon: template.icon,
      badge: '/icons/badge-72x72.png',
      vibrate: template.vibrate,
      tag: `${template.category}_${data.id || Date.now()}`,
      data: { ...data, template: templateName },
      actions: template.actions,
      timestamp: Date.now(),
      priority: template.priority,
      category: template.category as any,
      silent: template.priority === 'low',
      requireInteraction: template.priority === 'urgent',
      persistent: template.priority === 'urgent'
    };

    // Check if notification is suppressed
    if (await this.isNotificationSuppressed(notification)) {
      console.log(`Notification suppressed: ${notification.title}`);
      return null;
    }

    // Send notification
    const notificationId = await this.displayNotification(notification);
    
    // Store in history
    this.addToHistory(notification);
    
    return notificationId;
  }

  private async isNotificationSuppressed(notification: RichNotification): Promise<boolean> {
    const suppressKey = `suppress_${notification.category}_${notification.tag}`;
    const suppressedUntil = localStorage.getItem(suppressKey);
    
    if (suppressedUntil) {
      const until = parseInt(suppressedUntil);
      if (Date.now() < until) {
        return true;
      } else {
        localStorage.removeItem(suppressKey);
      }
    }
    
    return false;
  }

  private async displayNotification(notification: RichNotification): Promise<string | null> {
    if (this.permissionStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(notification.title, {
          body: notification.body,
          icon: notification.icon,
          badge: notification.badge,
          tag: notification.tag,
          data: notification.data,
          silent: notification.silent,
          requireInteraction: notification.requireInteraction,
        });
        
        return notification.id;
      } else {
        // Fallback for browsers without service worker
        const browserNotification = new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon,
          tag: notification.tag,
          data: notification.data,
          silent: notification.silent,
          requireInteraction: notification.requireInteraction
        });
        
        return notification.id;
      }
    } catch (error) {
      console.error('Failed to display notification:', error);
      return null;
    }
  }

  private addToHistory(notification: RichNotification) {
    this.notificationHistory.unshift(notification);
    
    // Limit history size
    if (this.notificationHistory.length > this.config.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(0, this.config.maxHistorySize);
    }
    
    // Persist to localStorage
    localStorage.setItem('notificationHistory', JSON.stringify(this.notificationHistory));
  }

  private loadStoredData() {
    try {
      const history = localStorage.getItem('notificationHistory');
      if (history) {
        this.notificationHistory = JSON.parse(history);
      }

      const alerts = localStorage.getItem('stockAlerts');
      if (alerts) {
        const alertsData = JSON.parse(alerts);
        this.stockAlerts = new Map(Object.entries(alertsData));
      }
    } catch (error) {
      console.error('Failed to load stored notification data:', error);
    }
  }

  // Stock Alert Management
  public async updateStockAlert(item: Item): Promise<void> {
    const alert: StockAlert = {
      itemId: item.id,
      itemName: item.name,
      currentQuantity: item.quantity,
      lowStockThreshold: item.min_quantity || 10,
      criticalThreshold: Math.max(1, Math.floor((item.min_quantity || 10) * 0.3)),
      alertLevel: this.calculateAlertLevel(item.quantity, item.min_quantity || 10),
      suppressed: false
    };

    this.stockAlerts.set(item.id, alert);
    this.persistStockAlerts();

    // Send notification if needed
    await this.checkAndSendStockAlert(alert);
  }

  private calculateAlertLevel(quantity: number, threshold: number): 'warning' | 'critical' | 'urgent' {
    const criticalThreshold = Math.max(1, Math.floor(threshold * 0.3));
    
    if (quantity === 0) return 'urgent';
    if (quantity <= criticalThreshold) return 'critical';
    if (quantity <= threshold) return 'warning';
    
    return 'warning'; // Shouldn't reach here for low stock items
  }

  private async checkAndSendStockAlert(alert: StockAlert) {
    if (alert.suppressed) return;

    // Check if we should send an alert
    const shouldAlert = alert.currentQuantity <= alert.lowStockThreshold;
    if (!shouldAlert) return;

    // Determine template based on alert level
    let templateName = 'low-stock';
    if (alert.alertLevel === 'critical' || alert.alertLevel === 'urgent') {
      templateName = 'critical-stock';
    }

    await this.sendRichNotification(templateName, alert);
    
    // Set next alert time to prevent spam
    alert.nextAlertTime = Date.now() + this.config.suppressDuration;
    this.stockAlerts.set(alert.itemId, alert);
    this.persistStockAlerts();
  }

  private persistStockAlerts() {
    const alertsObject = Object.fromEntries(this.stockAlerts);
    localStorage.setItem('stockAlerts', JSON.stringify(alertsObject));
  }

  private startStockMonitoring() {
    // Check stock levels periodically
    setInterval(() => {
      this.checkAllStockLevels();
    }, this.config.stockCheckInterval);
  }

  private async checkAllStockLevels() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .lte('quantity', 20); // Only check items with low quantity

      if (error) throw error;

      for (const item of items || []) {
        await this.updateStockAlert(item);
      }
    } catch (error) {
      console.error('Stock monitoring failed:', error);
    }
  }

  // Scheduled Notifications
  public async scheduleNotification(
    templateName: string,
    data: any,
    scheduledTime: number
  ): Promise<string> {
    const notificationId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.scheduledNotifications.set(notificationId, scheduledTime);
    
    const delay = scheduledTime - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        this.sendRichNotification(templateName, data);
        this.scheduledNotifications.delete(notificationId);
      }, delay);
    }

    return notificationId;
  }

  public cancelScheduledNotification(notificationId: string): boolean {
    return this.scheduledNotifications.delete(notificationId);
  }

  // Batch Notifications
  public async sendBatchNotification(notifications: { template: string; data: any }[]): Promise<void> {
    // Group similar notifications
    const grouped = notifications.reduce((acc, notif) => {
      const key = notif.template;
      if (!acc[key]) acc[key] = [];
      acc[key].push(notif.data);
      return acc;
    }, {} as Record<string, any[]>);

    // Send grouped notifications with delay
    let delay = 0;
    for (const [template, dataArray] of Object.entries(grouped)) {
      setTimeout(() => {
        if (dataArray.length === 1) {
          this.sendRichNotification(template, dataArray[0]);
        } else {
          this.sendGroupedNotification(template, dataArray);
        }
      }, delay);
      delay += this.config.batchNotificationDelay;
    }
  }

  private async sendGroupedNotification(templateName: string, dataArray: any[]) {
    const template = this.templates.get(templateName);
    if (!template || dataArray.length === 0) return;

    const count = dataArray.length;
    const groupedData = {
      count,
      items: dataArray,
      summary: this.createGroupSummary(templateName, dataArray)
    };

    let title = `${count} ${template.name}s`;
    let body = groupedData.summary;

    if (templateName === 'low-stock') {
      title = `${count} Items Low on Stock`;
      body = `${dataArray.map(item => item.itemName).slice(0, 3).join(', ')}${count > 3 ? ` and ${count - 3} more` : ''} need restocking`;
    }

    const notification: RichNotification = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      body,
      icon: template.icon,
      badge: '/icons/badge-72x72.png',
      vibrate: template.vibrate,
      tag: `group_${template.category}`,
      data: groupedData,
      actions: [
        { action: 'view-all', title: 'View All', icon: '/icons/list.png', url: '/dashboard' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/close.png' }
      ],
      timestamp: Date.now(),
      priority: template.priority,
      category: template.category as any,
      silent: false,
      requireInteraction: template.priority === 'urgent',
      persistent: false
    };

    await this.displayNotification(notification);
    this.addToHistory(notification);
  }

  private createGroupSummary(templateName: string, dataArray: any[]): string {
    switch (templateName) {
      case 'low-stock':
        return `Multiple items are running low on stock`;
      case 'critical-stock':
        return `Multiple items require urgent restocking`;
      case 'sync-complete':
        return `Multiple sync operations completed`;
      default:
        return `${dataArray.length} notifications`;
    }
  }

  // Interactive Actions Handling
  public async handleNotificationAction(action: string, notificationData: any): Promise<void> {
    console.log('Handling notification action:', action, notificationData);

    switch (action) {
      case 'restock':
        await this.handleRestockAction(notificationData);
        break;
      case 'emergency-restock':
        await this.handleEmergencyRestockAction(notificationData);
        break;
      case 'dismiss':
        await this.handleDismissAction(notificationData);
        break;
      case 'snooze':
        await this.handleSnoozeAction(notificationData);
        break;
      case 'view-item':
      case 'view-changes':
      case 'view-all':
        await this.handleViewAction(action, notificationData);
        break;
      case 'update-now':
        await this.handleUpdateAction();
        break;
      default:
        console.warn('Unknown notification action:', action);
    }
  }

  private async handleRestockAction(data: any) {
    // Open app to restock page
    if ('clients' in self) {
      const clients = await (self as any).clients.matchAll();
      if (clients.length > 0) {
        clients[0].postMessage({
          type: 'NAVIGATE_TO_RESTOCK',
          itemId: data.itemId
        });
        clients[0].focus();
      } else {
        // Open new window/tab
        (self as any).clients.openWindow(`/dashboard?action=restock&item=${data.itemId}`);
      }
    }
  }

  private async handleEmergencyRestockAction(data: any) {
    // Mark as urgent and open app
    await this.markItemAsUrgent(data.itemId);
    
    if ('clients' in self) {
      const clients = await (self as any).clients.matchAll();
      if (clients.length > 0) {
        clients[0].postMessage({
          type: 'NAVIGATE_TO_EMERGENCY_RESTOCK',
          itemId: data.itemId
        });
        clients[0].focus();
      } else {
        (self as any).clients.openWindow(`/dashboard?action=emergency-restock&item=${data.itemId}`);
      }
    }
  }

  private async handleDismissAction(data: any) {
    // Suppress similar notifications for a period
    if (data.itemId) {
      const alert = this.stockAlerts.get(data.itemId);
      if (alert) {
        alert.suppressed = true;
        alert.nextAlertTime = Date.now() + this.config.suppressDuration;
        this.stockAlerts.set(data.itemId, alert);
        this.persistStockAlerts();
      }
    }
  }

  private async handleSnoozeAction(data: any) {
    // Snooze for 1 hour
    if (data.itemId) {
      const alert = this.stockAlerts.get(data.itemId);
      if (alert) {
        alert.nextAlertTime = Date.now() + 3600000; // 1 hour
        this.stockAlerts.set(data.itemId, alert);
        this.persistStockAlerts();
      }
    }
  }

  private async handleViewAction(action: string, data: any) {
    let url = '/dashboard';
    
    switch (action) {
      case 'view-item':
        url = `/dashboard?item=${data.itemId}`;
        break;
      case 'view-changes':
        url = '/dashboard?view=recent';
        break;
      case 'view-all':
        url = '/dashboard';
        break;
    }

    if ('clients' in self) {
      const clients = await (self as any).clients.matchAll();
      if (clients.length > 0) {
        clients[0].postMessage({
          type: 'NAVIGATE_TO',
          url
        });
        clients[0].focus();
      } else {
        (self as any).clients.openWindow(url);
      }
    }
  }

  private async handleUpdateAction() {
    // Trigger app update
    if ('clients' in self) {
      const clients = await (self as any).clients.matchAll();
      clients.forEach((client: any) => {
        client.postMessage({
          type: 'UPDATE_APP'
        });
      });
    }
  }

  private async markItemAsUrgent(itemId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('items')
        .update({ 
          priority: 'urgent',
          urgentFlag: true,
          lastUrgentAlert: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Failed to mark item as urgent:', error);
    }
  }

  // Smart Stock Monitoring
  public async enableSmartStockMonitoring(): Promise<void> {
    // Analyze user patterns to optimize alert timing
    const patterns = patternAnalyzer.getPatterns();
    
    if (!patterns) return;
    
    // Adjust monitoring frequency based on user activity
    const peakHours = patterns.peakUsageTimes.map(t => t.hour);
    const currentHour = new Date().getHours();
    
    let checkInterval = this.config.stockCheckInterval;
    if (peakHours.includes(currentHour)) {
      checkInterval = checkInterval / 2; // More frequent during peak hours
    }

    // Update monitoring interval
    clearInterval(this.stockMonitoringInterval);
    this.stockMonitoringInterval = setInterval(() => {
      this.checkAllStockLevels();
    }, checkInterval);
  }

  private stockMonitoringInterval?: NodeJS.Timeout;

  // Notification Center Management
  public getNotificationHistory(): RichNotification[] {
    return [...this.notificationHistory];
  }

  public async clearNotificationHistory(): Promise<void> {
    this.notificationHistory = [];
    localStorage.removeItem('notificationHistory');
  }

  public async markNotificationAsRead(notificationId: string): Promise<void> {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (notification) {
      notification.data = { ...notification.data, read: true };
      localStorage.setItem('notificationHistory', JSON.stringify(this.notificationHistory));
    }
  }

  public getUnreadCount(): number {
    return this.notificationHistory.filter(n => !n.data?.read).length;
  }

  // Custom template registration
  public registerTemplate(name: string, template: NotificationTemplate): void {
    this.templates.set(name, template);
  }

  // Configuration
  public getConfiguration(): typeof this.config {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...updates };
    localStorage.setItem('richNotificationConfig', JSON.stringify(this.config));
  }

  // Cleanup
  public destroy() {
    if (this.stockMonitoringInterval) {
      clearInterval(this.stockMonitoringInterval);
    }
    this.stockAlerts.clear();
    this.notificationHistory = [];
    this.scheduledNotifications.clear();
  }
}

// Singleton instance
let richNotificationManagerInstance: RichNotificationManager | null = null;

export function getRichNotificationManager(): RichNotificationManager {
  if (!richNotificationManagerInstance) {
    richNotificationManagerInstance = new RichNotificationManager();
  }
  return richNotificationManagerInstance;
}

// Export for service worker
export { RichNotificationManager };