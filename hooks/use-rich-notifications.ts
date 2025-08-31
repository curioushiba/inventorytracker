import { useState, useEffect, useCallback } from 'react';
import { getRichNotificationManager, RichNotification, StockAlert } from '@/lib/notifications/rich-notifications';

export interface NotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
  unreadCount: number;
  history: RichNotification[];
  stockAlerts: StockAlert[];
  isMonitoring: boolean;
}

export function useRichNotifications() {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    isSupported: false,
    unreadCount: 0,
    history: [],
    stockAlerts: [],
    isMonitoring: false
  });

  const notificationManager = getRichNotificationManager();

  const updateState = useCallback(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    const permission = isSupported ? Notification.permission : 'denied';
    const history = notificationManager.getNotificationHistory();
    const unreadCount = notificationManager.getUnreadCount();

    setState(prev => ({
      ...prev,
      permission,
      isSupported,
      unreadCount,
      history,
      isMonitoring: true // Assume monitoring is active if manager is initialized
    }));
  }, [notificationManager]);

  useEffect(() => {
    updateState();
    
    // Update state periodically
    const interval = setInterval(updateState, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [updateState]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      const permission = await notificationManager.requestPermission();
      updateState();
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    }
  }, [notificationManager, updateState]);

  const sendNotification = useCallback(async (
    templateName: string,
    data: any
  ): Promise<string | null> => {
    try {
      const notificationId = await notificationManager.sendRichNotification(templateName, data);
      updateState();
      return notificationId;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }, [notificationManager, updateState]);

  const scheduleNotification = useCallback(async (
    templateName: string,
    data: any,
    scheduledTime: number
  ): Promise<string> => {
    try {
      const notificationId = await notificationManager.scheduleNotification(templateName, data, scheduledTime);
      updateState();
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }, [notificationManager, updateState]);

  const sendBatchNotification = useCallback(async (
    notifications: { template: string; data: any }[]
  ): Promise<void> => {
    try {
      await notificationManager.sendBatchNotification(notifications);
      updateState();
    } catch (error) {
      console.error('Failed to send batch notifications:', error);
      throw error;
    }
  }, [notificationManager, updateState]);

  const cancelScheduledNotification = useCallback((notificationId: string): boolean => {
    const result = notificationManager.cancelScheduledNotification(notificationId);
    updateState();
    return result;
  }, [notificationManager, updateState]);

  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    await notificationManager.markNotificationAsRead(notificationId);
    updateState();
  }, [notificationManager, updateState]);

  const clearHistory = useCallback(async (): Promise<void> => {
    await notificationManager.clearNotificationHistory();
    updateState();
  }, [notificationManager, updateState]);

  const updateStockAlert = useCallback(async (item: any): Promise<void> => {
    await notificationManager.updateStockAlert(item);
    updateState();
  }, [notificationManager, updateState]);

  const enableSmartMonitoring = useCallback(async (): Promise<void> => {
    await notificationManager.enableSmartStockMonitoring();
    updateState();
  }, [notificationManager, updateState]);

  const handleNotificationAction = useCallback(async (
    action: string,
    notificationData: any
  ): Promise<void> => {
    await notificationManager.handleNotificationAction(action, notificationData);
    updateState();
  }, [notificationManager, updateState]);

  const registerCustomTemplate = useCallback((name: string, template: any): void => {
    notificationManager.registerTemplate(name, template);
    updateState();
  }, [notificationManager, updateState]);

  const updateConfig = useCallback((config: any): void => {
    notificationManager.updateConfig(config);
    updateState();
  }, [notificationManager, updateState]);

  // Stock alert utilities
  const getStockAlertSummary = useCallback(() => {
    const history = state.history.filter(n => n.category === 'stock');
    const lastWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentAlerts = history.filter(n => n.timestamp > lastWeek);

    return {
      total: history.length,
      recent: recentAlerts.length,
      categories: {
        warning: recentAlerts.filter(n => n.data?.alertLevel === 'warning').length,
        critical: recentAlerts.filter(n => n.data?.alertLevel === 'critical').length,
        urgent: recentAlerts.filter(n => n.data?.alertLevel === 'urgent').length
      }
    };
  }, [state.history]);

  // Common notification templates
  const sendLowStockAlert = useCallback(async (item: any) => {
    return await sendNotification('low-stock', {
      itemId: item.id,
      itemName: item.name,
      currentQuantity: item.quantity,
      lowStockThreshold: item.lowStockThreshold,
      alertLevel: 'warning'
    });
  }, [sendNotification]);

  const sendCriticalStockAlert = useCallback(async (item: any) => {
    return await sendNotification('critical-stock', {
      itemId: item.id,
      itemName: item.name,
      currentQuantity: item.quantity,
      lowStockThreshold: item.lowStockThreshold,
      alertLevel: 'critical'
    });
  }, [sendNotification]);

  const sendSyncCompleteNotification = useCallback(async (itemCount: number, categoryCount: number) => {
    return await sendNotification('sync-complete', {
      itemCount,
      categoryCount
    });
  }, [sendNotification]);

  const sendItemAddedNotification = useCallback(async (item: any) => {
    return await sendNotification('item-added', item);
  }, [sendNotification]);

  const sendSystemUpdateNotification = useCallback(async (features: string) => {
    return await sendNotification('system-update', { features });
  }, [sendNotification]);

  return {
    state,
    actions: {
      requestPermission,
      sendNotification,
      scheduleNotification,
      sendBatchNotification,
      cancelScheduledNotification,
      markAsRead,
      clearHistory,
      updateStockAlert,
      enableSmartMonitoring,
      handleNotificationAction,
      registerCustomTemplate,
      updateConfig
    },
    templates: {
      sendLowStockAlert,
      sendCriticalStockAlert,
      sendSyncCompleteNotification,
      sendItemAddedNotification,
      sendSystemUpdateNotification
    },
    utils: {
      getStockAlertSummary,
      isPermissionGranted: () => state.permission === 'granted',
      canShowNotifications: () => state.isSupported && state.permission === 'granted',
      formatTimestamp: (timestamp: number) => new Date(timestamp).toLocaleString(),
      getPriorityColor: (priority: string) => {
        switch (priority) {
          case 'urgent': return 'text-red-600';
          case 'high': return 'text-orange-600';
          case 'normal': return 'text-blue-600';
          case 'low': return 'text-gray-600';
          default: return 'text-gray-500';
        }
      }
    }
  };
}