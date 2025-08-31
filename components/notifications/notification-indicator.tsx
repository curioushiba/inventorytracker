'use client';

import { Bell, BellOff, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { usePushNotifications } from '@/contexts/push-notification-context';
import { useOffline } from '@/contexts/offline-context';

interface NotificationIndicatorProps {
  showLabel?: boolean;
  className?: string;
}

export function NotificationIndicator({ showLabel = false, className }: NotificationIndicatorProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    queuedNotificationsCount,
    processNotificationQueue
  } = usePushNotifications();

  const { isOffline } = useOffline();

  if (!isSupported) {
    return null;
  }

  const getStatus = () => {
    if (permission === 'denied') {
      return {
        icon: BellOff,
        label: 'Blocked',
        color: 'text-red-500',
        variant: 'destructive' as const,
        tooltip: 'Notifications are blocked. Enable them in browser settings.'
      };
    }

    if (!isSubscribed) {
      return {
        icon: BellOff,
        label: 'Disabled',
        color: 'text-gray-500',
        variant: 'secondary' as const,
        tooltip: 'Push notifications are disabled. Click to enable.'
      };
    }

    if (isOffline && queuedNotificationsCount > 0) {
      return {
        icon: Bell,
        label: `${queuedNotificationsCount} Queued`,
        color: 'text-amber-500',
        variant: 'default' as const,
        tooltip: `${queuedNotificationsCount} notifications queued for when you're online.`
      };
    }

    return {
      icon: Bell,
      label: 'Active',
      color: 'text-green-500',
      variant: 'default' as const,
      tooltip: 'Push notifications are active.'
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  const handleClick = () => {
    if (queuedNotificationsCount > 0 && !isOffline) {
      processNotificationQueue();
    }
  };

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Icon className={`h-4 w-4 ${status.color}`} />
        {/* Offline indicator */}
        {isOffline && (
          <WifiOff className="absolute -top-1 -right-1 h-2 w-2 text-gray-400" />
        )}
        {/* Queue count indicator */}
        {queuedNotificationsCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
          >
            {queuedNotificationsCount > 9 ? '9+' : queuedNotificationsCount}
          </Badge>
        )}
      </div>
      
      {showLabel && (
        <span className={`text-sm ${status.color}`}>
          {status.label}
        </span>
      )}
    </div>
  );

  if (queuedNotificationsCount > 0 && !isOffline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-1" 
              onClick={handleClick}
            >
              {content}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to show {queuedNotificationsCount} queued notification{queuedNotificationsCount !== 1 ? 's' : ''}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            {content}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{status.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Network status component for showing online/offline status
export function NetworkIndicator({ className }: { className?: string }) {
  const { isOffline } = useOffline();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${className}`}>
            {isOffline ? (
              <WifiOff className="h-4 w-4 text-red-500" />
            ) : (
              <Wifi className="h-4 w-4 text-green-500" />
            )}
            <span className={`text-xs ${isOffline ? 'text-red-500' : 'text-green-500'}`}>
              {isOffline ? 'Offline' : 'Online'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isOffline 
              ? 'You are currently offline. Changes will sync when connection is restored.'
              : 'You are online and connected.'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Combined status indicator showing both network and notification status
export function StatusIndicator({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <NetworkIndicator />
      <NotificationIndicator />
    </div>
  );
}