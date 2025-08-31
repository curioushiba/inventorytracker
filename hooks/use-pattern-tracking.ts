'use client';

import { useEffect, useCallback } from 'react';
import { patternAnalyzer } from '@/lib/offline/user-pattern-analyzer';
import { usePathname } from 'next/navigation';

export function usePatternTracking() {
  const pathname = usePathname();

  const trackAction = useCallback((
    type: 'view' | 'edit' | 'add' | 'delete',
    resource: 'item' | 'category' | 'report',
    resourceId?: string,
    metadata?: Record<string, any>
  ) => {
    patternAnalyzer.trackAction({
      type,
      resource,
      resourceId,
      timestamp: Date.now(),
      metadata
    });
  }, []);

  const trackView = useCallback((
    resource: 'item' | 'category' | 'report',
    resourceId?: string,
    metadata?: Record<string, any>
  ) => {
    trackAction('view', resource, resourceId, metadata);
  }, [trackAction]);

  const trackEdit = useCallback((
    resource: 'item' | 'category' | 'report',
    resourceId?: string,
    metadata?: Record<string, any>
  ) => {
    trackAction('edit', resource, resourceId, metadata);
  }, [trackAction]);

  const trackAdd = useCallback((
    resource: 'item' | 'category' | 'report',
    resourceId?: string,
    metadata?: Record<string, any>
  ) => {
    trackAction('add', resource, resourceId, metadata);
  }, [trackAction]);

  const trackDelete = useCallback((
    resource: 'item' | 'category' | 'report',
    resourceId?: string,
    metadata?: Record<string, any>
  ) => {
    trackAction('delete', resource, resourceId, metadata);
  }, [trackAction]);

  // Track page views automatically
  useEffect(() => {
    if (pathname.includes('/dashboard')) {
      trackView('report');
    } else if (pathname.includes('/items')) {
      const itemId = pathname.split('/').pop();
      if (itemId && itemId !== 'items') {
        trackView('item', itemId);
      }
    } else if (pathname.includes('/categories')) {
      const categoryId = pathname.split('/').pop();
      if (categoryId && categoryId !== 'categories') {
        trackView('category', categoryId);
      }
    }
  }, [pathname, trackView]);

  return {
    trackAction,
    trackView,
    trackEdit,
    trackAdd,
    trackDelete,
    getPatterns: () => patternAnalyzer.getPatterns(),
    getPredictions: () => patternAnalyzer.getPredictions(),
    clearHistory: () => patternAnalyzer.clearHistory()
  };
}