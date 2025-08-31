'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Zap,
  Activity,
  BarChart3,
  Settings,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { useBackgroundSyncPro } from '@/hooks/use-background-sync-pro';

interface BackgroundSyncDashboardProps {
  className?: string;
}

export function BackgroundSyncDashboard({ className }: BackgroundSyncDashboardProps) {
  const {
    state,
    actions: { 
      forceSyncAll, 
      clearQueue, 
      retryFailedItems, 
      registerBackgroundSync,
      updateConfiguration 
    },
    utils: { getPriorityName, formatEstimatedTime, getSuccessRate }
  } = useBackgroundSyncPro();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleForceSyncAll = async () => {
    if (confirm('Force sync all pending items? This may take some time.')) {
      try {
        await forceSyncAll();
      } catch (error) {
        console.error('Force sync failed:', error);
        alert('Sync failed. Please check your connection and try again.');
      }
    }
  };

  const handleClearQueue = async () => {
    if (confirm('Clear all pending sync items? This action cannot be undone.')) {
      await clearQueue();
    }
  };

  const handleRetryFailed = async () => {
    await retryFailedItems();
  };

  const handleRegisterBackgroundSync = async () => {
    try {
      await registerBackgroundSync();
      alert('Background sync registered successfully!');
    } catch (error) {
      console.error('Background sync registration failed:', error);
      alert('Failed to register background sync. Please try again.');
    }
  };

  const successRate = getSuccessRate();

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Background Sync Pro</h2>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Simple View' : 'Advanced'}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Queue Size</p>
                <p className="text-2xl font-bold">{state.queueSize}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Syncs</p>
                <p className="text-2xl font-bold">{state.activeSync}</p>
              </div>
              <div className="p-2 rounded-full bg-green-100">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{Math.round(successRate)}%</p>
              </div>
              <div className="p-2 rounded-full bg-purple-100">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Est. Time</p>
                <p className="text-lg font-bold">{formatEstimatedTime(state.estimatedTime)}</p>
              </div>
              <div className="p-2 rounded-full bg-orange-100">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Progress */}
      {state.isActive && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Sync Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span>{state.activeSync} / {state.queueSize + state.activeSync} operations</span>
                </div>
                <Progress 
                  value={state.queueSize > 0 ? (state.activeSync / (state.queueSize + state.activeSync)) * 100 : 100} 
                  className="h-2"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                {Object.entries(state.priorityBreakdown).map(([priority, count]) => (
                  <div key={priority} className="text-center">
                    <Badge variant="outline" className="w-full">
                      {getPriorityName(parseInt(priority))}
                    </Badge>
                    <div className="mt-1 font-semibold">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        state.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                      }`} />
                      <span className="text-sm font-medium">
                        {state.isActive ? 'Active' : 'Idle'}
                      </span>
                    </div>
                    
                    {state.queueSize > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {state.queueSize} items pending sync
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium">Last Sync</p>
                    <p className="text-xs text-muted-foreground">
                      {state.metrics.lastSync > 0 ? 
                        new Date(state.metrics.lastSync).toLocaleString() : 
                        'Never'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Priority Breakdown */}
            {Object.keys(state.priorityBreakdown).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Priority Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(state.priorityBreakdown).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={priority === '1' ? 'destructive' : priority === '2' ? 'default' : 'secondary'}
                            className="w-16 justify-center"
                          >
                            {getPriorityName(parseInt(priority))}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{count}</span>
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${(count / Math.max(...Object.values(state.priorityBreakdown))) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid gap-4">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Sync Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Operations:</span>
                        <span className="font-medium">{state.metrics.totalOperations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Successful:</span>
                        <span className="font-medium text-green-600">{state.metrics.successfulSyncs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed:</span>
                        <span className="font-medium text-red-600">{state.metrics.failedSyncs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Success Rate:</span>
                        <span className={`font-medium ${successRate > 90 ? 'text-green-600' : successRate > 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {Math.round(successRate)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-3">Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Average Latency:</span>
                        <span className="font-medium">{Math.round(state.metrics.averageLatency)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Compression Ratio:</span>
                        <span className="font-medium">{Math.round(state.metrics.compressionRatio * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Background Syncs:</span>
                        <span className="font-medium">{state.metrics.backgroundSyncCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Metrics (if enabled) */}
            {showAdvanced && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Advanced Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(state.metrics.priorityDistribution).map(([priority, count]) => (
                      <div key={priority} className="text-center">
                        <div className="text-lg font-bold">{count}</div>
                        <div className="text-xs text-muted-foreground">
                          {getPriorityName(parseInt(priority))} Priority
                        </div>
                        <div className="w-full bg-muted rounded-full h-1 mt-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all"
                            style={{ 
                              width: `${(count / Math.max(...Object.values(state.metrics.priorityDistribution))) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="controls">
          <div className="grid gap-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={handleForceSyncAll}
                    disabled={state.queueSize === 0}
                    className="h-auto p-4 flex-col space-y-2"
                  >
                    <Play className="h-5 w-5" />
                    <div className="text-center">
                      <div className="font-semibold">Force Sync All</div>
                      <div className="text-xs opacity-75">Sync {state.queueSize} items</div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline"
                    onClick={handleRetryFailed}
                    disabled={state.metrics.failedSyncs === 0}
                    className="h-auto p-4 flex-col space-y-2"
                  >
                    <RefreshCw className="h-5 w-5" />
                    <div className="text-center">
                      <div className="font-semibold">Retry Failed</div>
                      <div className="text-xs opacity-75">{state.metrics.failedSyncs} failed items</div>
                    </div>
                  </Button>

                  <Button 
                    variant="outline"
                    onClick={handleRegisterBackgroundSync}
                    className="h-auto p-4 flex-col space-y-2"
                  >
                    <Zap className="h-5 w-5" />
                    <div className="text-center">
                      <div className="font-semibold">Register BG Sync</div>
                      <div className="text-xs opacity-75">Enable background</div>
                    </div>
                  </Button>

                  <Button 
                    variant="destructive"
                    onClick={handleClearQueue}
                    disabled={state.queueSize === 0}
                    className="h-auto p-4 flex-col space-y-2"
                  >
                    <Trash2 className="h-5 w-5" />
                    <div className="text-center">
                      <div className="font-semibold">Clear Queue</div>
                      <div className="text-xs opacity-75">Remove all pending</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Configuration (Advanced View) */}
            {showAdvanced && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Sync Settings</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span>Batch Size:</span>
                          <Badge variant="outline">20 items</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Concurrency:</span>
                          <Badge variant="outline">3 concurrent</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Compression:</span>
                          <Badge variant="outline">Enabled</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Differential Sync:</span>
                          <Badge variant="outline">Enabled</Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-2">Retry Configuration</h4>
                      <div className="text-xs text-muted-foreground">
                        Retry delays: 1s → 5s → 15s → 1m
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Queue Details (Advanced View) */}
      {showAdvanced && state.queueSize > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Queue Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm font-medium">Priority Breakdown:</div>
              {Object.entries(state.priorityBreakdown).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between text-sm">
                  <span>{getPriorityName(parseInt(priority))} Priority</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{count} items</span>
                    <div className="w-16 bg-muted rounded-full h-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all"
                        style={{ 
                          width: `${(count / state.queueSize) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!state.isActive && state.metrics.totalOperations === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Background Sync Ready</h3>
            <p className="text-muted-foreground mb-4">
              Background sync is configured and ready. Operations will appear here when you make changes offline.
            </p>
            <Button onClick={handleRegisterBackgroundSync}>
              <Zap className="h-4 w-4 mr-2" />
              Register Background Sync
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}