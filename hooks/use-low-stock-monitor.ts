'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useInventory, type InventoryItem } from '@/contexts/inventory-context';
import { usePushNotifications } from '@/contexts/push-notification-context';

interface LowStockAlert {
  id: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  severity: 'warning' | 'critical';
  alertedAt: string;
}

interface LowStockMonitorConfig {
  enabled: boolean;
  checkIntervalMs: number;
  criticalThresholdPercent: number; // Percentage below min stock to consider critical
  suppressDuplicateAlertMinutes: number;
}

const DEFAULT_CONFIG: LowStockMonitorConfig = {
  enabled: true,
  checkIntervalMs: 30000, // Check every 30 seconds
  criticalThresholdPercent: 50, // Alert is critical if stock is 50% below min threshold
  suppressDuplicateAlertMinutes: 60, // Don't alert again for same item within 1 hour
};

export function useLowStockMonitor(config: Partial<LowStockMonitorConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { items, getLowStockItems } = useInventory();
  const { showLowStockAlert, settings } = usePushNotifications();
  
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(finalConfig.enabled);
  const previousLowStockItems = useRef<InventoryItem[]>([]);
  const alertHistory = useRef<Map<string, string>>(new Map()); // itemId -> lastAlertedAt
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load alert history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('low_stock_alert_history');
      if (stored) {
        const history = JSON.parse(stored);
        alertHistory.current = new Map(Object.entries(history));
      }
    } catch (error) {
      console.error('Failed to load alert history:', error);
    }
  }, []);

  // Save alert history to localStorage
  const saveAlertHistory = useCallback(() => {
    try {
      const history = Object.fromEntries(alertHistory.current);
      localStorage.setItem('low_stock_alert_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save alert history:', error);
    }
  }, []);

  // Determine alert severity based on how far below minimum the stock is
  const getAlertSeverity = useCallback((item: InventoryItem): 'warning' | 'critical' => {
    const shortfall = item.minQuantity - item.quantity;
    const criticalThreshold = item.minQuantity * (finalConfig.criticalThresholdPercent / 100);
    
    return shortfall >= criticalThreshold ? 'critical' : 'warning';
  }, [finalConfig.criticalThresholdPercent]);

  // Check if we should suppress duplicate alerts
  const shouldSuppressAlert = useCallback((itemId: string): boolean => {
    const lastAlerted = alertHistory.current.get(itemId);
    if (!lastAlerted) return false;

    const lastAlertTime = new Date(lastAlerted).getTime();
    const now = Date.now();
    const suppressionPeriod = finalConfig.suppressDuplicateAlertMinutes * 60 * 1000;

    return (now - lastAlertTime) < suppressionPeriod;
  }, [finalConfig.suppressDuplicateAlertMinutes]);

  // Process new low stock items and trigger alerts
  const processLowStockItems = useCallback(async (lowStockItems: InventoryItem[]) => {
    if (!settings.lowStockAlerts) return;

    const newAlerts: LowStockAlert[] = [];

    for (const item of lowStockItems) {
      // Skip if we recently alerted for this item
      if (shouldSuppressAlert(item.id)) continue;

      // Check if this is a new low stock item (wasn't low stock before)
      const wasLowStockBefore = previousLowStockItems.current.some(
        prev => prev.id === item.id
      );

      // Only trigger notification for newly low items or items that got worse
      const previousItem = previousLowStockItems.current.find(prev => prev.id === item.id);
      const isWorseThanBefore = previousItem && item.quantity < previousItem.quantity;

      if (!wasLowStockBefore || isWorseThanBefore) {
        const severity = getAlertSeverity(item);
        
        // Create alert record
        const alert: LowStockAlert = {
          id: `${item.id}-${Date.now()}`,
          itemName: item.name,
          currentStock: item.quantity,
          minStock: item.minQuantity,
          severity,
          alertedAt: new Date().toISOString(),
        };

        newAlerts.push(alert);

        // Send push notification
        try {
          await showLowStockAlert(item.name, item.quantity, item.minQuantity);
          
          // Record that we alerted for this item
          alertHistory.current.set(item.id, alert.alertedAt);
          
          console.log(`Low stock alert sent for: ${item.name} (${item.quantity}/${item.minQuantity})`);
        } catch (error) {
          console.error(`Failed to send low stock alert for ${item.name}:`, error);
        }
      }
    }

    // Update alerts state
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Keep last 50 alerts
      saveAlertHistory();
    }
  }, [settings.lowStockAlerts, shouldSuppressAlert, getAlertSeverity, showLowStockAlert, saveAlertHistory]);

  // Monitor inventory changes
  const checkLowStock = useCallback(async () => {
    if (!isMonitoring) return;

    try {
      const lowStockItems = getLowStockItems();
      
      // Process new low stock items
      await processLowStockItems(lowStockItems);
      
      // Update reference for next comparison
      previousLowStockItems.current = [...lowStockItems];
      
    } catch (error) {
      console.error('Error checking low stock:', error);
    }
  }, [isMonitoring, getLowStockItems, processLowStockItems]);

  // Set up monitoring interval
  useEffect(() => {
    if (isMonitoring && finalConfig.checkIntervalMs > 0) {
      intervalRef.current = setInterval(checkLowStock, finalConfig.checkIntervalMs);
      
      // Run initial check
      checkLowStock();
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isMonitoring, finalConfig.checkIntervalMs, checkLowStock]);

  // Manual check function
  const checkNow = useCallback(async () => {
    await checkLowStock();
  }, [checkLowStock]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Clear alert history
  const clearAlertHistory = useCallback(() => {
    alertHistory.current.clear();
    setAlerts([]);
    localStorage.removeItem('low_stock_alert_history');
  }, []);

  // Get current low stock items with alert context
  const getLowStockItemsWithAlerts = useCallback(() => {
    const lowStockItems = getLowStockItems();
    return lowStockItems.map(item => {
      const lastAlerted = alertHistory.current.get(item.id);
      const severity = getAlertSeverity(item);
      const isRecentlyAlerted = lastAlerted && !shouldSuppressAlert(item.id);
      
      return {
        ...item,
        severity,
        lastAlerted: lastAlerted || null,
        isRecentlyAlerted: !!isRecentlyAlerted,
      };
    });
  }, [getLowStockItems, getAlertSeverity, shouldSuppressAlert]);

  // Get alert statistics
  const getAlertStats = useCallback(() => {
    const lowStockItems = getLowStockItems();
    const critical = lowStockItems.filter(item => getAlertSeverity(item) === 'critical').length;
    const warning = lowStockItems.length - critical;
    
    return {
      total: lowStockItems.length,
      critical,
      warning,
      recentAlerts: alerts.length,
    };
  }, [getLowStockItems, getAlertSeverity, alerts.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // State
    alerts,
    isMonitoring,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    checkNow,
    clearAlertHistory,
    
    // Data
    getLowStockItemsWithAlerts,
    getAlertStats,
    
    // Config
    config: finalConfig,
  };
}

// Hook for managing global low stock monitoring
export function useGlobalLowStockMonitor() {
  const monitor = useLowStockMonitor();
  
  // Auto-start monitoring when component mounts
  useEffect(() => {
    monitor.startMonitoring();
    
    return () => {
      monitor.stopMonitoring();
    };
  }, []);
  
  return monitor;
}