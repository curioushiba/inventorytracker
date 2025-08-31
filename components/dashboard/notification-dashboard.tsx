'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell, CheckCircle, Clock, TrendingUp, Zap } from 'lucide-react';
import { usePushNotifications } from '@/contexts/push-notification-context';
import { useLowStockMonitor } from '@/hooks/use-low-stock-monitor';
import { useInventory } from '@/contexts/inventory-context';
import { PermissionPrompt } from '@/components/notifications/permission-banner';
import { NotificationIndicator, NetworkIndicator } from '@/components/notifications/notification-indicator';

export function NotificationDashboard() {
  const { isSupported, isSubscribed, permission, queuedNotificationsCount } = usePushNotifications();
  const monitor = useLowStockMonitor();
  const { items } = useInventory();
  
  const stats = monitor.getAlertStats();
  const lowStockItems = monitor.getLowStockItemsWithAlerts();

  // Demo function to send test notification
  const sendTestNotification = async () => {
    if (items.length > 0) {
      const testItem = items[0];
      await monitor.checkNow(); // This will trigger notifications for actual low stock items
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notification Center</h2>
          <p className="text-muted-foreground">
            Monitor and manage your inventory alerts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NetworkIndicator />
          <NotificationIndicator showLabel />
        </div>
      </div>

      {/* Permission prompt if not enabled */}
      {isSupported && !isSubscribed && (
        <PermissionPrompt />
      )}

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notification Status</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {isSubscribed ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Active</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-600">Inactive</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Permission: {permission}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="destructive" className="text-xs">
                {stats.critical} Critical
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.warning} Warning
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitoring</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {monitor.isMonitoring ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Active</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Stopped</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Check interval: {monitor.config.checkIntervalMs / 1000}s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queuedNotificationsCount}</div>
            <p className="text-xs text-muted-foreground">
              Pending notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Items List */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Items Requiring Attention
            </CardTitle>
            <CardDescription>
              Items that are currently below their minimum stock levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      item.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Current: {item.quantity} / Min: {item.minQuantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={item.severity === 'critical' ? 'destructive' : 'secondary'}
                    >
                      {item.severity}
                    </Badge>
                    {item.isRecentlyAlerted && (
                      <Badge variant="outline" className="text-xs">
                        Recently Alerted
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Test and manage your notification system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => monitor.checkNow()}
              disabled={!isSubscribed}
            >
              Check Low Stock Now
            </Button>
            <Button
              variant="outline"
              onClick={sendTestNotification}
              disabled={!isSubscribed || items.length === 0}
            >
              Send Test Alert
            </Button>
            <Button
              variant="outline"
              onClick={() => monitor.clearAlertHistory()}
            >
              Clear Alert History
            </Button>
            {!monitor.isMonitoring ? (
              <Button
                variant="outline"
                onClick={() => monitor.startMonitoring()}
              >
                Start Monitoring
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => monitor.stopMonitoring()}
              >
                Stop Monitoring
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Push Support:</span>
              <Badge variant={isSupported ? "default" : "secondary"}>
                {isSupported ? "Supported" : "Not Supported"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Worker:</span>
              <Badge variant="default">
                {typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? "Available" : "Not Available"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IndexedDB:</span>
              <Badge variant="default">
                {typeof window !== 'undefined' && 'indexedDB' in window ? "Available" : "Not Available"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recent Alerts:</span>
              <span>{stats.recentAlerts}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}