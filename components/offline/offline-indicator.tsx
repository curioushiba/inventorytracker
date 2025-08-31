'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock, AlertTriangle } from 'lucide-react';

interface OfflineIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export function OfflineIndicator({ showDetails = false, className = '' }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [downtime, setDowntime] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        setDowntime(0);
        setLastSync(new Date());
      }
    };

    const downtimeInterval = setInterval(() => {
      if (!navigator.onLine) {
        setDowntime(prev => prev + 1);
      }
    }, 1000);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(downtimeInterval);
    };
  }, []);

  const formatDowntime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (!showDetails) {
    return (
      <Badge 
        variant={isOnline ? "default" : "destructive"} 
        className={`flex items-center space-x-1 ${className}`}
      >
        {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </Badge>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            <div>
              <h3 className="font-semibold">
                {isOnline ? 'Connected' : 'Offline Mode'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? 'Real-time sync enabled' 
                  : `Offline for ${formatDowntime(downtime)}`
                }
              </p>
            </div>
          </div>
          
          {!isOnline && downtime > 300 && (
            <div className="flex items-center space-x-1 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Extended offline</span>
            </div>
          )}
        </div>

        {lastSync && (
          <div className="flex items-center space-x-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last sync: {lastSync.toLocaleTimeString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}