'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';

interface SyncStatusProps {
  className?: string;
}

interface SyncState {
  isActive: boolean;
  progress: number;
  status: 'idle' | 'syncing' | 'error' | 'completed';
  lastSync: Date | null;
  queueSize: number;
  failedItems: number;
}

export function SyncStatus({ className = '' }: SyncStatusProps) {
  const [syncState, setSyncState] = useState<SyncState>({
    isActive: false,
    progress: 0,
    status: 'idle',
    lastSync: null,
    queueSize: 0,
    failedItems: 0
  });

  useEffect(() => {
    // Simulate sync state updates
    const updateSyncState = () => {
      // This would typically come from the sync manager
      setSyncState(prev => ({
        ...prev,
        queueSize: Math.floor(Math.random() * 10),
        failedItems: Math.floor(Math.random() * 3),
        lastSync: new Date(Date.now() - Math.random() * 3600000) // Random last sync within an hour
      }));
    };

    updateSyncState();
    const interval = setInterval(updateSyncState, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleForceSync = () => {
    setSyncState(prev => ({ ...prev, isActive: true, status: 'syncing', progress: 0 }));
    
    // Simulate sync progress
    const progressInterval = setInterval(() => {
      setSyncState(prev => {
        if (prev.progress >= 100) {
          clearInterval(progressInterval);
          return {
            ...prev,
            isActive: false,
            status: 'completed',
            progress: 100,
            lastSync: new Date()
          };
        }
        return {
          ...prev,
          progress: prev.progress + 10
        };
      });
    }, 200);
  };

  const getStatusIcon = () => {
    switch (syncState.status) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (syncState.status) {
      case 'syncing': return 'default';
      case 'completed': return 'default';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = () => {
    switch (syncState.status) {
      case 'syncing': return 'Syncing...';
      case 'completed': return 'Up to date';
      case 'error': return 'Sync failed';
      default: return 'Ready';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>Sync Status</span>
          </div>
          <Badge variant={getStatusColor() as any}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {syncState.isActive && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{syncState.progress}%</span>
            </div>
            <Progress value={syncState.progress} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Queue</span>
              <Badge variant="outline">{syncState.queueSize}</Badge>
            </div>
            
            {syncState.failedItems > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Failed</span>
                <Badge variant="destructive">{syncState.failedItems}</Badge>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {syncState.lastSync && (
              <div className="text-xs text-muted-foreground">
                Last sync: {syncState.lastSync.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          <Button 
            size="sm" 
            onClick={handleForceSync}
            disabled={syncState.isActive}
            className="flex-1"
          >
            <Zap className="h-3 w-3 mr-1" />
            Force Sync
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}