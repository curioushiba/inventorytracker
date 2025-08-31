'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Zap,
  Database,
  RefreshCw,
  Settings,
  Gauge,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { usePushNotifications } from '@/contexts/push-notification-context';
import { useLowStockMonitor } from '@/hooks/use-low-stock-monitor';
import { useInventory } from '@/contexts/inventory-context';
import { useOffline } from '@/contexts/offline-context';
import { usePWAAnalytics } from '@/lib/analytics/pwa-analytics';
import { PermissionPrompt } from '@/components/notifications/permission-banner';
import { NotificationIndicator, NetworkIndicator } from '@/components/notifications/notification-indicator';

interface PWAMetrics {
  installRate: number;
  offlineUsage: number;
  syncSuccess: number;
  performanceScore: number;
  cacheHitRatio: number;
  activeUsers: number;
}

export function NotificationDashboard() {
  const { isSupported, isSubscribed, permission, queuedNotificationsCount } = usePushNotifications();
  const monitor = useLowStockMonitor();
  const { items } = useInventory();
  const { isOffline, isSupported: offlineSupported, syncStatus } = useOffline();
  const analytics = usePWAAnalytics();
  
  const [metrics, setMetrics] = useState<PWAMetrics>({
    installRate: 0,
    offlineUsage: 0,
    syncSuccess: 95,
    performanceScore: 88,
    cacheHitRatio: 73,
    activeUsers: 0
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const stats = monitor.getAlertStats();
  const lowStockItems = monitor.getLowStockItemsWithAlerts();

  useEffect(() => {
    // Track dashboard view
    analytics.trackUserBehavior('dashboard_view', { 
      type: 'notification_dashboard',
      offline_mode: isOffline 
    });

    // Simulate metrics update (in real app, fetch from analytics API)
    const updateMetrics = () => {
      setMetrics(prev => ({
        ...prev,
        offlineUsage: isOffline ? prev.offlineUsage + 1 : prev.offlineUsage,
        activeUsers: Math.floor(Math.random() * 50) + 20,
        syncSuccess: syncStatus?.status === 'synced' ? 95 : 85
      }));
    };

    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [analytics, isOffline, syncStatus]);

  // Demo function to send test notification
  const sendTestNotification = async () => {
    if (items.length > 0) {
      const testItem = items[0];
      await monitor.checkNow(); // This will trigger notifications for actual low stock items
      analytics.trackUserBehavior('test_notification_sent');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': 
      case 'synced': return 'bg-green-100 text-green-700 border-green-200';
      case 'offline': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'syncing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'error': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPerformanceGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', color: 'text-green-600' };
    if (score >= 80) return { grade: 'A', color: 'text-green-500' };
    if (score >= 70) return { grade: 'B', color: 'text-yellow-500' };
    if (score >= 60) return { grade: 'C', color: 'text-orange-500' };
    return { grade: 'D', color: 'text-red-500' };
  };

  const performanceGrade = getPerformanceGrade(metrics.performanceScore);

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

      {/* Enhanced Status Overview with PWA Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Connection Status */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            {isOffline ? <WifiOff className="h-4 w-4 text-orange-500" /> : <Wifi className="h-4 w-4 text-green-500" />}
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {isOffline ? (
                <>
                  <WifiOff className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-600">Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Online</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Working {isOffline ? 'offline' : 'online'}
            </p>
          </CardContent>
        </Card>

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

        {/* Performance Score Card */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Gauge className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center space-x-2">
              <span className={performanceGrade.color}>{metrics.performanceScore}%</span>
              <Badge variant="outline" className={performanceGrade.color}>
                {performanceGrade.grade}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              PWA Performance Score
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

      {/* PWA Metrics Dashboard */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>PWA Analytics</span>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Basic' : 'Advanced'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Performance Score</span>
                <span className="font-medium">{metrics.performanceScore}%</span>
              </div>
              <Progress value={metrics.performanceScore} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cache Hit Ratio</span>
                <span className="font-medium">{metrics.cacheHitRatio}%</span>
              </div>
              <Progress value={metrics.cacheHitRatio} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sync Success Rate</span>
                <span className="font-medium">{metrics.syncSuccess}%</span>
              </div>
              <Progress value={metrics.syncSuccess} className="h-2" />
            </div>
          </div>

          {/* Real-time Sync Status */}
          {syncStatus && (
            <div className="p-4 rounded-lg bg-accent/30 border border-accent/50">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Last Sync Status</span>
                </h5>
                <Badge variant="outline" className={getStatusColor(syncStatus.status)}>
                  {syncStatus.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{syncStatus.message}</p>
              {syncStatus.itemsCount !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">
                  Items: {syncStatus.itemsCount} | Categories: {syncStatus.categoriesCount}
                </p>
              )}
            </div>
          )}

          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t border-border/50">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Advanced Metrics
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Usage Patterns */}
                <div className="space-y-3">
                  <h5 className="font-medium flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Usage Patterns</span>
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Users (24h)</span>
                      <span className="font-medium">{metrics.activeUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Offline Sessions</span>
                      <span className="font-medium">{metrics.offlineUsage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PWA Install Rate</span>
                      <span className="font-medium">{metrics.installRate}%</span>
                    </div>
                  </div>
                </div>

                {/* System Health */}
                <div className="space-y-3">
                  <h5 className="font-medium flex items-center space-x-2">
                    <Database className="h-4 w-4" />
                    <span>System Health</span>
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IndexedDB Support</span>
                      <Badge variant={offlineSupported ? 'default' : 'destructive'}>
                        {offlineSupported ? 'Supported' : 'Not Supported'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Push Support</span>
                      <Badge variant={isSupported ? 'default' : 'destructive'}>
                        {isSupported ? 'Supported' : 'Not Supported'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Worker</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            <Button
              variant="outline"
              onClick={() => {
                // Manually trigger analytics sync
                analytics.trackUserBehavior('manual_analytics_sync');
              }}
            >
              Sync Analytics
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