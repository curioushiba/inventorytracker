'use client';

import { supabase } from '@/lib/supabase';

// PWA Analytics Interface
export interface PWAAnalytics {
  trackPWAInstall: () => void;
  trackPWALaunch: (launchMode: 'standalone' | 'browser') => void;
  trackOfflineUsage: (duration: number, actions: number) => void;
  trackSyncEvent: (type: 'success' | 'failure', items: number, duration: number) => void;
  trackPerformanceMetric: (metric: string, value: number, context?: string) => void;
  trackUserBehavior: (action: string, metadata?: Record<string, any>) => void;
}

// Analytics Event Types
interface AnalyticsEvent {
  event_type: string;
  event_data: Record<string, any>;
  user_id?: string;
  timestamp: string;
  session_id: string;
  user_agent: string;
  url: string;
  pwa_mode: boolean;
}

class PWAAnalyticsManager implements PWAAnalytics {
  private sessionId: string;
  private sessionStart: number;
  private offlineStart: number | null = null;
  private offlineActions: number = 0;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    
    if (typeof window !== 'undefined') {
      this.initializeSession();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeSession() {
    // Track initial page load
    this.trackEvent('session_start', {
      launch_mode: this.getLaunchMode(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      connection_type: this.getConnectionType(),
      is_mobile: this.isMobile()
    });

    // Track PWA-specific metrics
    this.trackPWAMetrics();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('session_pause', {
          duration: Date.now() - this.sessionStart
        });
      } else {
        this.trackEvent('session_resume', {});
      }
    });

    // Track performance metrics
    this.trackWebVitals();
  }

  private getLaunchMode(): 'standalone' | 'browser' {
    if (typeof window === 'undefined') return 'browser';
    return window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
  }

  private getConnectionType(): string {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return 'unknown';
    }
    // @ts-ignore - NetworkInformation API
    const connection = (navigator as any).connection;
    return connection?.effectiveType || connection?.type || 'unknown';
  }

  private isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  }

  private trackPWAMetrics() {
    if (typeof window === 'undefined') return;

    // Check if running as PWA
    const isPWA = this.getLaunchMode() === 'standalone';
    
    if (isPWA) {
      this.trackEvent('pwa_launch', {
        launch_type: 'standalone',
        install_source: sessionStorage.getItem('pwa_install_source') || 'unknown'
      });
    }

    // Track service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        this.trackEvent('service_worker_ready', {
          scope: registration.scope,
          update_via_cache: registration.updateViaCache
        });
      });
    }
  }

  private trackWebVitals() {
    if (typeof window === 'undefined') return;

    // Import web-vitals dynamically to avoid SSR issues
    import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      onCLS((metric) => this.trackPerformanceMetric('CLS', metric.value, metric.name));
      onFCP((metric) => this.trackPerformanceMetric('FCP', metric.value, metric.name));
      onINP((metric) => this.trackPerformanceMetric('INP', metric.value, metric.name));
      onLCP((metric) => this.trackPerformanceMetric('LCP', metric.value, metric.name));
      onTTFB((metric) => this.trackPerformanceMetric('TTFB', metric.value, metric.name));
    }).catch(console.error);
  }

  trackPWAInstall(): void {
    this.trackEvent('pwa_install', {
      install_timestamp: Date.now(),
      user_agent: navigator.userAgent,
      platform: navigator.platform,
      install_source: 'user_prompt'
    });
    
    // Store install source for future sessions
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pwa_install_source', 'user_prompt');
    }
  }

  trackPWALaunch(launchMode: 'standalone' | 'browser'): void {
    this.trackEvent('pwa_launch', {
      launch_mode: launchMode,
      session_start: this.sessionStart,
      previous_session: localStorage.getItem('last_session_end')
    });
    
    // Update last session info
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_session_start', this.sessionStart.toString());
    }
  }

  trackOfflineUsage(duration: number, actions: number): void {
    this.trackEvent('offline_usage', {
      duration_ms: duration,
      actions_performed: actions,
      sync_pending: this.offlineActions > 0
    });
  }

  trackSyncEvent(type: 'success' | 'failure', items: number, duration: number): void {
    this.trackEvent('data_sync', {
      sync_type: type,
      items_synced: items,
      duration_ms: duration,
      offline_actions: this.offlineActions
    });

    // Reset offline action counter on successful sync
    if (type === 'success') {
      this.offlineActions = 0;
    }
  }

  trackPerformanceMetric(metric: string, value: number, context?: string): void {
    this.trackEvent('performance_metric', {
      metric_name: metric,
      metric_value: value,
      context: context,
      connection_type: this.getConnectionType(),
      is_mobile: this.isMobile()
    });
  }

  trackUserBehavior(action: string, metadata?: Record<string, any>): void {
    this.trackEvent('user_behavior', {
      action: action,
      metadata: metadata || {},
      pwa_mode: this.getLaunchMode() === 'standalone',
      page_url: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
    });
  }

  // Core event tracking method
  private async trackEvent(eventType: string, eventData: Record<string, any>) {
    if (typeof window === 'undefined') return;

    const event: AnalyticsEvent = {
      event_type: eventType,
      event_data: eventData,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      user_agent: navigator.userAgent,
      url: window.location.href,
      pwa_mode: this.getLaunchMode() === 'standalone'
    };

    // Get user ID if available
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        event.user_id = user.id;
      }
    } catch (error) {
      console.warn('Could not get user for analytics:', error);
    }

    // Send to analytics backend (you can customize this)
    this.sendAnalyticsEvent(event);
  }

  private async sendAnalyticsEvent(event: AnalyticsEvent) {
    try {
      // Option 1: Send to Supabase (if you have an analytics table)
      // await supabase.from('analytics_events').insert(event);

      // Option 2: Send to Google Analytics 4
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', event.event_type, {
          event_category: 'PWA',
          event_label: event.event_type,
          value: 1,
          custom_parameters: event.event_data
        });
      }

      // Option 3: Send to custom analytics endpoint
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(() => {
        // Fallback: Store locally for later sync
        this.storeEventLocally(event);
      });

    } catch (error) {
      console.warn('Analytics event failed:', error);
      this.storeEventLocally(event);
    }
  }

  private storeEventLocally(event: AnalyticsEvent) {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('pwa_analytics_queue') || '[]';
      const events = JSON.parse(stored);
      events.push(event);
      
      // Keep only last 100 events to prevent storage bloat
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('pwa_analytics_queue', JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to store analytics event locally:', error);
    }
  }

  // Method to sync queued events when online
  async syncQueuedEvents(): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('pwa_analytics_queue');
      if (!stored) return;

      const events = JSON.parse(stored);
      if (events.length === 0) return;

      // Send all queued events
      for (const event of events) {
        await this.sendAnalyticsEvent(event);
      }

      // Clear the queue
      localStorage.removeItem('pwa_analytics_queue');
      console.log(`Synced ${events.length} queued analytics events`);
    } catch (error) {
      console.error('Failed to sync queued analytics events:', error);
    }
  }

  // Method to start offline tracking
  startOfflineSession(): void {
    this.offlineStart = Date.now();
    this.offlineActions = 0;
    this.trackEvent('offline_session_start', {
      timestamp: this.offlineStart
    });
  }

  // Method to end offline tracking
  endOfflineSession(): void {
    if (this.offlineStart) {
      const duration = Date.now() - this.offlineStart;
      this.trackOfflineUsage(duration, this.offlineActions);
      this.offlineStart = null;
    }
  }

  // Method to increment offline actions
  incrementOfflineActions(): void {
    this.offlineActions++;
  }

  // Session cleanup
  endSession(): void {
    const sessionDuration = Date.now() - this.sessionStart;
    
    this.trackEvent('session_end', {
      duration_ms: sessionDuration,
      total_actions: this.offlineActions,
      offline_time: this.offlineStart ? Date.now() - this.offlineStart : 0
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_session_end', Date.now().toString());
    }
  }
}

// Singleton instance
let analyticsInstance: PWAAnalyticsManager | null = null;

export function getPWAAnalytics(): PWAAnalyticsManager {
  if (!analyticsInstance) {
    analyticsInstance = new PWAAnalyticsManager();
  }
  return analyticsInstance;
}

// Convenience hook for React components
export function usePWAAnalytics(): PWAAnalytics {
  return getPWAAnalytics();
}