'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Gauge, 
  Zap, 
  Clock, 
  Database, 
  Wifi, 
  Smartphone, 
  Monitor,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { usePWAAnalytics } from '@/lib/analytics/pwa-analytics';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: { good: number; poor: number };
}

interface PerformanceMetrics {
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    pwa: number;
  };
  webVitals: WebVitalMetric[];
  bundle: {
    size: number;
    gzipSize: number;
    chunkCount: number;
  };
  caching: {
    hitRatio: number;
    missRatio: number;
    totalRequests: number;
  };
  offline: {
    supportLevel: number;
    syncSpeed: number;
    queueSize: number;
  };
}

export function PerformanceDashboard() {
  const analytics = usePWAAnalytics();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lighthouse: {
      performance: 88,
      accessibility: 95,
      bestPractices: 92,
      seo: 90,
      pwa: 85
    },
    webVitals: [
      { name: 'LCP', value: 1.2, rating: 'good', threshold: { good: 2.5, poor: 4.0 } },
      { name: 'FID', value: 45, rating: 'good', threshold: { good: 100, poor: 300 } },
      { name: 'CLS', value: 0.08, rating: 'good', threshold: { good: 0.1, poor: 0.25 } },
      { name: 'FCP', value: 1.1, rating: 'good', threshold: { good: 1.8, poor: 3.0 } },
      { name: 'TTFB', value: 0.3, rating: 'good', threshold: { good: 0.8, poor: 1.8 } }
    ],
    bundle: {
      size: 161,
      gzipSize: 45,
      chunkCount: 8
    },
    caching: {
      hitRatio: 73,
      missRatio: 27,
      totalRequests: 1250
    },
    offline: {
      supportLevel: 95,
      syncSpeed: 1.2,
      queueSize: 0
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    analytics.trackUserBehavior('performance_dashboard_view');
    
    // Simulate real-time metrics updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        caching: {
          ...prev.caching,
          hitRatio: Math.min(95, prev.caching.hitRatio + Math.random() * 2),
          totalRequests: prev.caching.totalRequests + Math.floor(Math.random() * 10)
        }
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [analytics]);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    analytics.trackUserBehavior('performance_metrics_refresh');
    
    // Simulate API call to refresh metrics
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Monitor</h2>
          <p className="text-muted-foreground">
            Real-time performance metrics and optimization insights
          </p>
        </div>
        <Button 
          onClick={refreshMetrics} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Performance Score Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(metrics.lighthouse).map(([key, value]) => (
          <Card key={key} className="glass">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Gauge className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(value)}`}>
                {value}
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <Badge variant={getScoreBadgeVariant(value)} className="mt-2 text-xs">
                {value >= 90 ? 'Excellent' : value >= 70 ? 'Good' : 'Needs Work'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="vitals" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="bundle">Bundle Analysis</TabsTrigger>
          <TabsTrigger value="caching">Caching</TabsTrigger>
          <TabsTrigger value="offline">Offline Performance</TabsTrigger>
        </TabsList>

        {/* Web Vitals Tab */}
        <TabsContent value="vitals" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Core Web Vitals</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {metrics.webVitals.map((vital) => (
                  <div key={vital.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium">{vital.name}</h4>
                        <Badge variant="outline" className={getRatingColor(vital.rating)}>
                          {vital.rating.replace('-', ' ')}
                        </Badge>
                      </div>
                      <span className={`font-bold ${getRatingColor(vital.rating)}`}>
                        {vital.value}{vital.name === 'CLS' ? '' : vital.name.includes('FCP') || vital.name.includes('LCP') || vital.name.includes('TTFB') ? 's' : 'ms'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Progress 
                        value={(vital.value / vital.threshold.poor) * 100} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Good: &lt;{vital.threshold.good}{vital.name === 'CLS' ? '' : vital.name.includes('FCP') || vital.name.includes('LCP') || vital.name.includes('TTFB') ? 's' : 'ms'}</span>
                        <span>Poor: &gt;{vital.threshold.poor}{vital.name === 'CLS' ? '' : vital.name.includes('FCP') || vital.name.includes('LCP') || vital.name.includes('TTFB') ? 's' : 'ms'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bundle Analysis Tab */}
        <TabsContent value="bundle" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm">Bundle Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.bundle.size}KB</div>
                <p className="text-xs text-muted-foreground">First Load JS</p>
                <Progress value={(metrics.bundle.size / 200) * 100} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Target: &lt;200KB
                </p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm">Gzipped Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.bundle.gzipSize}KB</div>
                <p className="text-xs text-muted-foreground">Compressed</p>
                <div className="text-xs text-green-600 mt-2">
                  {Math.round(((metrics.bundle.size - metrics.bundle.gzipSize) / metrics.bundle.size) * 100)}% compression
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm">Code Splitting</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.bundle.chunkCount}</div>
                <p className="text-xs text-muted-foreground">Chunks</p>
                <Badge variant="default" className="mt-2 text-xs">
                  Optimized
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Caching Tab */}
        <TabsContent value="caching" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Cache Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Hit Ratio</span>
                    <span className="font-medium">{metrics.caching.hitRatio.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.caching.hitRatio} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Miss Ratio</span>
                    <span className="font-medium">{metrics.caching.missRatio.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics.caching.missRatio} className="h-2" />
                </div>

                <div className="pt-2 border-t border-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Requests</span>
                    <span className="font-medium">{metrics.caching.totalRequests.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Cache Strategy Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Static Assets</span>
                    <Badge variant="default">Cache First</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Responses</span>
                    <Badge variant="default">Stale While Revalidate</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Images</span>
                    <Badge variant="default">Cache First</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fonts</span>
                    <Badge variant="default">Cache First</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Offline Performance Tab */}
        <TabsContent value="offline" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm">Offline Support</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.offline.supportLevel}%
                </div>
                <p className="text-xs text-muted-foreground">Features Available</p>
                <div className="space-y-1 mt-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>View Items</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Add Items</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Edit Items</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Background Sync</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm">Sync Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.offline.syncSpeed.toFixed(1)}s
                </div>
                <p className="text-xs text-muted-foreground">Average Sync Time</p>
                <Progress 
                  value={Math.max(0, 100 - (metrics.offline.syncSpeed * 20))} 
                  className="h-2 mt-2" 
                />
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm">Sync Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.offline.queueSize}
                </div>
                <p className="text-xs text-muted-foreground">Pending Items</p>
                <Badge 
                  variant={metrics.offline.queueSize === 0 ? 'default' : 'secondary'} 
                  className="mt-2 text-xs"
                >
                  {metrics.offline.queueSize === 0 ? 'All Synced' : 'Sync Pending'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Offline Capabilities Matrix */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Offline Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Core Features</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>View Inventory</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Add Items</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Edit Items</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Delete Items</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Advanced Features</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Background Sync</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Conflict Resolution</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Push Notifications</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Image Caching</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Optimization Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.lighthouse.performance < 90 && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Performance Optimization</p>
                  <p className="text-xs text-yellow-700">
                    Consider implementing additional code splitting for non-critical components
                  </p>
                </div>
              </div>
            )}
            
            {metrics.caching.hitRatio < 80 && (
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Database className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Cache Optimization</p>
                  <p className="text-xs text-blue-700">
                    Cache hit ratio could be improved by optimizing cache strategies
                  </p>
                </div>
              </div>
            )}

            {metrics.bundle.size > 180 && (
              <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Zap className="h-4 w-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Bundle Size</p>
                  <p className="text-xs text-orange-700">
                    Bundle size is approaching the 200KB threshold. Consider additional optimizations.
                  </p>
                </div>
              </div>
            )}

            {metrics.lighthouse.performance >= 90 && metrics.caching.hitRatio >= 80 && metrics.bundle.size <= 180 && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">Excellent Performance</p>
                  <p className="text-xs text-green-700">
                    Your PWA is performing exceptionally well across all metrics!
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}