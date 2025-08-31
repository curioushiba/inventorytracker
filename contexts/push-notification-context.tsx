'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useOffline } from '@/contexts/offline-context';
import { supabase } from '@/lib/supabase';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentPushSubscription,
} from '@/lib/push/vapid-config';
import {
  LocalNotificationManager,
  NotificationQueue,
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_TEMPLATES,
} from '@/lib/push/notification-utils';

interface PushSubscriptionData {
  id?: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  created_at?: string;
  updated_at?: string;
  is_active: boolean;
}

interface PushNotificationContextType {
  // Support and permission status
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Subscription management
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  
  // Settings management
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  
  // Manual notification triggers
  showLowStockAlert: (itemName: string, currentStock: number, minStock: number) => Promise<boolean>;
  showStockUpdate: (itemName: string, previousStock: number, newStock: number) => Promise<boolean>;
  showSystemNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => Promise<boolean>;
  showSyncStatus: (status: 'synced' | 'failed', itemsCount?: number) => Promise<boolean>;
  
  // Queue management
  processNotificationQueue: () => Promise<void>;
  clearNotificationQueue: () => void;
  queuedNotificationsCount: number;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [localNotificationManager, setLocalNotificationManager] = useState<LocalNotificationManager | null>(null);
  const [queuedNotificationsCount, setQueuedNotificationsCount] = useState(0);

  // Initialize notification support detection
  useEffect(() => {
    const supported = isPushNotificationSupported();
    setIsSupported(supported);
    
    if (supported) {
      setPermission(getNotificationPermission());
      setLocalNotificationManager(new LocalNotificationManager(settings));
    }
    
    // Update queued notifications count
    const queue = NotificationQueue.getQueue();
    setQueuedNotificationsCount(queue.length);
  }, []);

  // Load user settings when user changes
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_NOTIFICATION_SETTINGS);
      setIsSubscribed(false);
      return;
    }

    loadUserSettings();
    checkSubscriptionStatus();
  }, [user]);

  // Update local notification manager when settings change
  useEffect(() => {
    if (localNotificationManager) {
      localNotificationManager.updateSettings(settings);
    } else if (isSupported) {
      setLocalNotificationManager(new LocalNotificationManager(settings));
    }
  }, [settings, isSupported]);

  // Process notification queue when coming online
  useEffect(() => {
    if (!isOffline && localNotificationManager && queuedNotificationsCount > 0) {
      processNotificationQueue();
    }
  }, [isOffline, localNotificationManager, queuedNotificationsCount]);

  const loadUserSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        const userSettings: NotificationSettings = {
          lowStockAlerts: data.low_stock_alerts ?? DEFAULT_NOTIFICATION_SETTINGS.lowStockAlerts,
          stockUpdates: data.stock_updates ?? DEFAULT_NOTIFICATION_SETTINGS.stockUpdates,
          systemNotifications: data.system_notifications ?? DEFAULT_NOTIFICATION_SETTINGS.systemNotifications,
          syncStatus: data.sync_status ?? DEFAULT_NOTIFICATION_SETTINGS.syncStatus,
          sound: data.sound ?? DEFAULT_NOTIFICATION_SETTINGS.sound,
          vibrate: data.vibrate ?? DEFAULT_NOTIFICATION_SETTINGS.vibrate,
          showImage: data.show_image ?? DEFAULT_NOTIFICATION_SETTINGS.showImage,
          requireInteraction: data.require_interaction ?? DEFAULT_NOTIFICATION_SETTINGS.requireInteraction,
        };
        setSettings(userSettings);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      setError('Failed to load notification settings');
    }
  };

  const checkSubscriptionStatus = async () => {
    if (!user || !isSupported) return;

    try {
      const subscription = await getCurrentPushSubscription();
      setIsSubscribed(!!subscription);

      if (subscription) {
        // Verify subscription exists in database
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to verify subscription:', error);
        }

        // If subscription exists locally but not in database, re-register it
        if (!data) {
          await saveSubscriptionToDatabase(subscription);
        }
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const saveSubscriptionToDatabase = async (subscription: PushSubscription): Promise<boolean> => {
    if (!user) return false;

    try {
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }

      const subscriptionData: Omit<PushSubscriptionData, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
        auth_key: btoa(String.fromCharCode(...new Uint8Array(authKey))),
        is_active: true,
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id,endpoint' });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to save subscription to database:', error);
      setError('Failed to save push subscription');
      return false;
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        return true;
      } else {
        setError('Notification permission denied');
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to request permission';
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    if (!isSupported) {
      setError('Push notifications are not supported');
      return false;
    }

    if (permission !== 'granted') {
      const permissionGranted = await requestPermission();
      if (!permissionGranted) return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const subscription = await subscribeToPushNotifications();
      if (!subscription) {
        throw new Error('Failed to create push subscription');
      }

      const saved = await saveSubscriptionToDatabase(subscription);
      if (!saved) {
        throw new Error('Failed to save subscription to database');
      }

      setIsSubscribed(true);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to subscribe to push notifications';
      setError(errorMsg);
      console.error('Push subscription failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, permission, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    setError(null);

    try {
      const unsubscribed = await unsubscribeFromPushNotifications();
      
      if (unsubscribed) {
        // Remove from database
        const { error } = await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to update subscription in database:', error);
        }

        setIsSubscribed(false);
      }

      return unsubscribed;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to unsubscribe';
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>): Promise<void> => {
    if (!user) return;

    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          low_stock_alerts: updatedSettings.lowStockAlerts,
          stock_updates: updatedSettings.stockUpdates,
          system_notifications: updatedSettings.systemNotifications,
          sync_status: updatedSettings.syncStatus,
          sound: updatedSettings.sound,
          vibrate: updatedSettings.vibrate,
          show_image: updatedSettings.showImage,
          require_interaction: updatedSettings.requireInteraction,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      setError('Failed to update notification settings');
    }
  }, [user, settings]);

  const showLowStockAlert = useCallback(async (itemName: string, currentStock: number, minStock: number): Promise<boolean> => {
    if (!localNotificationManager) return false;

    if (isOffline) {
      // Queue the notification for later
      const payload = {
        type: 'low_stock' as const,
        data: NOTIFICATION_TEMPLATES.lowStock(itemName, currentStock, minStock),
        timestamp: Date.now(),
        userId: user?.id,
      };
      NotificationQueue.add(payload);
      setQueuedNotificationsCount(prev => prev + 1);
      return true;
    }

    return localNotificationManager.showLowStockAlert(itemName, currentStock, minStock);
  }, [localNotificationManager, isOffline, user]);

  const showStockUpdate = useCallback(async (itemName: string, previousStock: number, newStock: number): Promise<boolean> => {
    if (!localNotificationManager) return false;

    if (isOffline) {
      const payload = {
        type: 'stock_update' as const,
        data: NOTIFICATION_TEMPLATES.stockUpdate(itemName, previousStock, newStock),
        timestamp: Date.now(),
        userId: user?.id,
      };
      NotificationQueue.add(payload);
      setQueuedNotificationsCount(prev => prev + 1);
      return true;
    }

    return localNotificationManager.showStockUpdate(itemName, previousStock, newStock);
  }, [localNotificationManager, isOffline, user]);

  const showSystemNotification = useCallback(async (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<boolean> => {
    if (!localNotificationManager) return false;

    if (isOffline) {
      const payload = {
        type: 'system' as const,
        data: NOTIFICATION_TEMPLATES.systemUpdate(message, type),
        timestamp: Date.now(),
        userId: user?.id,
      };
      NotificationQueue.add(payload);
      setQueuedNotificationsCount(prev => prev + 1);
      return true;
    }

    return localNotificationManager.showSystemNotification(message, type);
  }, [localNotificationManager, isOffline, user]);

  const showSyncStatus = useCallback(async (status: 'synced' | 'failed', itemsCount?: number): Promise<boolean> => {
    if (!localNotificationManager) return false;
    return localNotificationManager.showSyncStatus(status, itemsCount);
  }, [localNotificationManager]);

  const processNotificationQueue = useCallback(async (): Promise<void> => {
    if (!localNotificationManager) return;

    try {
      await NotificationQueue.processQueue(localNotificationManager);
      const remainingQueue = NotificationQueue.getQueue();
      setQueuedNotificationsCount(remainingQueue.length);
    } catch (error) {
      console.error('Failed to process notification queue:', error);
    }
  }, [localNotificationManager]);

  const clearNotificationQueue = useCallback((): void => {
    NotificationQueue.clear();
    setQueuedNotificationsCount(0);
  }, []);

  const value: PushNotificationContextType = {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    settings,
    updateSettings,
    showLowStockAlert,
    showStockUpdate,
    showSystemNotification,
    showSyncStatus,
    processNotificationQueue,
    clearNotificationQueue,
    queuedNotificationsCount,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
}