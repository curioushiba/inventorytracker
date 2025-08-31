'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Download,
  Trash2,
  GitMerge
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { type ConflictResolution } from '@/lib/offline/conflict-resolver';

interface SyncEvent {
  id: string;
  type: 'sync' | 'conflict' | 'error';
  timestamp: number;
  status: 'success' | 'failed' | 'partial';
  itemsCount?: number;
  conflicts?: number;
  resolutions?: ConflictResolution[];
  error?: string;
  duration?: number;
}

interface SyncHistoryProps {
  events?: SyncEvent[];
  onClear?: () => void;
  onExport?: () => void;
  onRetry?: (eventId: string) => void;
}

export function SyncHistory({
  events = [],
  onClear,
  onExport,
  onRetry
}: SyncHistoryProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'syncs' | 'conflicts' | 'errors'>('all');

  const filteredEvents = events.filter(event => {
    switch (selectedTab) {
      case 'syncs':
        return event.type === 'sync';
      case 'conflicts':
        return event.type === 'conflict' || event.conflicts;
      case 'errors':
        return event.type === 'error' || event.status === 'failed';
      default:
        return true;
    }
  });

  const getEventIcon = (event: SyncEvent) => {
    switch (event.status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventBadge = (event: SyncEvent) => {
    switch (event.type) {
      case 'sync':
        return <Badge variant="default">Sync</Badge>;
      case 'conflict':
        return <Badge variant="secondary">Conflict</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  const stats = {
    total: events.length,
    successful: events.filter(e => e.status === 'success').length,
    failed: events.filter(e => e.status === 'failed').length,
    conflicts: events.reduce((acc, e) => acc + (e.conflicts || 0), 0)
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sync History</CardTitle>
            <CardDescription>
              Track synchronization events and conflict resolutions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {onClear && (
              <Button variant="outline" size="sm" onClick={onClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{stats.successful}</p>
            <p className="text-sm text-muted-foreground">Successful</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.conflicts}</p>
            <p className="text-sm text-muted-foreground">Conflicts</p>
          </div>
        </div>

        {/* Event Tabs */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="syncs">Syncs</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No events to display
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-0.5">{getEventIcon(event)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {getEventBadge(event)}
                          <span className="text-sm font-medium">
                            {format(event.timestamp, 'MMM d, HH:mm:ss')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({formatDistanceToNow(event.timestamp, { addSuffix: true })})
                          </span>
                        </div>

                        {event.itemsCount !== undefined && (
                          <p className="text-sm text-muted-foreground">
                            Synced {event.itemsCount} item{event.itemsCount !== 1 ? 's' : ''}
                            {event.duration && ` in ${event.duration}ms`}
                          </p>
                        )}

                        {event.conflicts !== undefined && event.conflicts > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <GitMerge className="h-3 w-3 text-yellow-500" />
                            <span className="text-yellow-600 dark:text-yellow-400">
                              {event.conflicts} conflict{event.conflicts !== 1 ? 's' : ''} resolved
                            </span>
                          </div>
                        )}

                        {event.error && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Error: {event.error}
                          </p>
                        )}

                        {event.resolutions && event.resolutions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              Resolutions:
                            </p>
                            {event.resolutions.map((resolution, index) => (
                              <div key={index} className="text-xs pl-4">
                                • {resolution.resolution} by {resolution.resolvedBy}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {event.status === 'failed' && onRetry && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetry(event.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}