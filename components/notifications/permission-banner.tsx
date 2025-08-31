'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/contexts/push-notification-context';

interface PermissionBannerProps {
  className?: string;
}

export function PermissionBanner({ className }: PermissionBannerProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe
  } = usePushNotifications();

  const [dismissed, setDismissed] = useState(false);

  // Check if banner was previously dismissed
  useEffect(() => {
    const wasDismissed = localStorage.getItem('notification_banner_dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      await subscribe();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Store dismissal in localStorage to persist across sessions
    localStorage.setItem('notification_banner_dismissed', 'true');
  };

  // Don't show if not supported, already subscribed, or dismissed
  if (!isSupported || isSubscribed || dismissed || permission === 'denied') {
    return null;
  }

  // Don't show if permission is already granted but not subscribed
  // This case should be handled elsewhere
  if (permission === 'granted') {
    return null;
  }

  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">Enable Push Notifications</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-blue-700">
          Stay informed about low stock alerts, inventory updates, and important system notifications even when the app is closed.
        </CardDescription>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Privacy Protected</p>
              <p className="text-xs text-blue-700">
                Notifications are sent directly to your device. We don't track or store personal data.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Never Miss Critical Alerts</p>
              <p className="text-xs text-blue-700">
                Get notified immediately when inventory levels are low or require attention.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Enabling...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleDismiss}>
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Minimal version for smaller spaces
export function PermissionPrompt() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe
  } = usePushNotifications();

  const [dismissed, setDismissed] = useState(false);

  if (!isSupported || isSubscribed || dismissed || permission === 'denied' || permission === 'granted') {
    return null;
  }

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      await subscribe();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <Bell className="h-4 w-4 text-blue-600" />
      <p className="text-sm text-blue-800 flex-1">
        Enable notifications for low stock alerts
      </p>
      <Button
        size="sm"
        onClick={handleEnable}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? 'Enabling...' : 'Enable'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDismissed(true)}
        className="h-8 w-8 p-0"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}