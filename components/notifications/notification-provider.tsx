'use client';

import React, { useEffect } from 'react';
import { PushNotificationProvider } from '@/contexts/push-notification-context';
import { useGlobalLowStockMonitor } from '@/hooks/use-low-stock-monitor';
import { PermissionBanner } from './permission-banner';
import { NotificationIndicator } from './notification-indicator';

// Inner component that uses the push notification context
function NotificationManager({ children }: { children: React.ReactNode }) {
  // Start global low stock monitoring
  const monitor = useGlobalLowStockMonitor();

  // Log monitoring status for debugging
  useEffect(() => {
    console.log('Low stock monitoring started:', monitor.isMonitoring);
    
    return () => {
      console.log('Low stock monitoring stopped');
    };
  }, [monitor.isMonitoring]);

  return (
    <>
      {children}
      {/* Add permission banner to encourage users to enable notifications */}
      <PermissionBanner className="fixed bottom-4 right-4 max-w-md z-50" />
    </>
  );
}

// Main notification provider that wraps the entire app section that needs notifications
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  return (
    <PushNotificationProvider>
      <NotificationManager>
        {children}
      </NotificationManager>
    </PushNotificationProvider>
  );
}

// Component to add to the app header/toolbar
export function NotificationStatusBar() {
  return (
    <div className="flex items-center gap-2">
      <NotificationIndicator showLabel />
    </div>
  );
}