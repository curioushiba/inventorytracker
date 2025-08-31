'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Image, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/contexts/push-notification-context';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    settings,
    updateSettings,
    subscribe,
    unsubscribe,
    queuedNotificationsCount,
    processNotificationQueue,
    clearNotificationQueue
  } = usePushNotifications();

  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local settings with context
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = async (key: keyof typeof settings, value: boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    setIsSaving(true);
    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      // Revert on error
      setLocalSettings(localSettings);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubscriptionToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const getPermissionStatus = () => {
    if (!isSupported) {
      return { status: 'not-supported', label: 'Not Supported', variant: 'secondary' as const };
    }
    
    switch (permission) {
      case 'granted':
        return { status: 'granted', label: 'Allowed', variant: 'default' as const };
      case 'denied':
        return { status: 'denied', label: 'Blocked', variant: 'destructive' as const };
      default:
        return { status: 'default', label: 'Not Set', variant: 'outline' as const };
    }
  };

  const permissionStatus = getPermissionStatus();

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage your push notification preferences and alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Permission Status</Label>
            <Badge variant={permissionStatus.variant}>
              {permissionStatus.label}
            </Badge>
          </div>
          
          {permission === 'denied' && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Notifications are blocked. Please enable them in your browser settings to receive alerts.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Subscription Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications even when the app is closed
              </p>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleSubscriptionToggle}
              disabled={isLoading || permission === 'denied'}
            />
          </div>

          {isSubscribed && (
            <div className="pl-4 space-y-1">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Active subscription
              </div>
            </div>
          )}
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Notification Type Settings */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Notification Types</Label>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when items are running low
                </p>
              </div>
              <Switch
                checked={localSettings.lowStockAlerts}
                onCheckedChange={(value) => handleToggle('lowStockAlerts', value)}
                disabled={!isSubscribed || isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Stock Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications for quantity changes
                </p>
              </div>
              <Switch
                checked={localSettings.stockUpdates}
                onCheckedChange={(value) => handleToggle('stockUpdates', value)}
                disabled={!isSubscribed || isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>System Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  App updates and important messages
                </p>
              </div>
              <Switch
                checked={localSettings.systemNotifications}
                onCheckedChange={(value) => handleToggle('systemNotifications', value)}
                disabled={!isSubscribed || isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Sync Status</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications about data synchronization
                </p>
              </div>
              <Switch
                checked={localSettings.syncStatus}
                onCheckedChange={(value) => handleToggle('syncStatus', value)}
                disabled={!isSubscribed || isSaving}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Display & Behavior Settings */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Display & Behavior</Label>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <Label>Sound</Label>
              </div>
              <Switch
                checked={localSettings.sound}
                onCheckedChange={(value) => handleToggle('sound', value)}
                disabled={!isSubscribed || isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <Label>Vibration</Label>
              </div>
              <Switch
                checked={localSettings.vibrate}
                onCheckedChange={(value) => handleToggle('vibrate', value)}
                disabled={!isSubscribed || isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1 flex items-center gap-2">
                <Image className="h-4 w-4" aria-label="Show images icon" />
                <Label>Show Images</Label>
              </div>
              <Switch
                checked={localSettings.showImage}
                onCheckedChange={(value) => handleToggle('showImage', value)}
                disabled={!isSubscribed || isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Require Interaction</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications stay visible until clicked
                </p>
              </div>
              <Switch
                checked={localSettings.requireInteraction}
                onCheckedChange={(value) => handleToggle('requireInteraction', value)}
                disabled={!isSubscribed || isSaving}
              />
            </div>
          </div>
        </div>

        {/* Queued Notifications */}
        {queuedNotificationsCount > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-base font-medium">Queued Notifications</Label>
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    {queuedNotificationsCount} notification{queuedNotificationsCount !== 1 ? 's' : ''} pending
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={processNotificationQueue}
                    variant="outline"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    Show Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearNotificationQueue}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-foreground" />
            Saving settings...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function NotificationToggle() {
  const { isSupported, isSubscribed, subscribe, unsubscribe, isLoading } = usePushNotifications();

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Bell className="h-4 w-4" />
      <Label className="text-sm">Notifications</Label>
      <Switch
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
    </div>
  );
}