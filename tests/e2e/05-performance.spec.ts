import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Navigate and wait for load
    await page.goto('/');
    
    // Set up performance monitoring
    await page.addInitScript(() => {
      // Initialize performance metrics collection
      (window as any).performanceMetrics = {
        lcp: null,
        fid: null,
        cls: null,
        ttfb: null,
        fcp: null
      };

      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        (window as any).performanceMetrics.lcp = lastEntry.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          (window as any).performanceMetrics.fid = entry.processingStart - entry.startTime;
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsScore = 0;
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
            (window as any).performanceMetrics.cls = clsScore;
          }
        });
      }).observe({ entryTypes: ['layout-shift'] });

      // Time to First Byte (TTFB)
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          (window as any).performanceMetrics.ttfb = entry.responseStart - entry.requestStart;
        });
      }).observe({ entryTypes: ['navigation'] });

      // First Contentful Paint (FCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            (window as any).performanceMetrics.fcp = entry.startTime;
          }
        });
      }).observe({ entryTypes: ['paint'] });
    });

    await page.waitForLoadState('networkidle');
    
    // Simulate user interaction to trigger FID measurement
    const firstInteractiveElement = page.locator('button:visible, a:visible, input:visible').first();
    if (await firstInteractiveElement.isVisible()) {
      await firstInteractiveElement.click();
    }

    // Wait for metrics to be collected
    await page.waitForTimeout(3000);

    const metrics = await page.evaluate(() => (window as any).performanceMetrics);

    // Core Web Vitals thresholds:
    // LCP: Good < 2.5s, Needs Improvement < 4s
    if (metrics.lcp !== null) {
      expect(metrics.lcp).toBeLessThan(4000); // 4 seconds
      console.log(`LCP: ${metrics.lcp}ms`);
    }

    // FID: Good < 100ms, Needs Improvement < 300ms
    if (metrics.fid !== null) {
      expect(metrics.fid).toBeLessThan(300); // 300ms
      console.log(`FID: ${metrics.fid}ms`);
    }

    // CLS: Good < 0.1, Needs Improvement < 0.25
    if (metrics.cls !== null) {
      expect(metrics.cls).toBeLessThan(0.25);
      console.log(`CLS: ${metrics.cls}`);
    }

    // TTFB: Good < 800ms
    if (metrics.ttfb !== null) {
      expect(metrics.ttfb).toBeLessThan(1200); // More lenient for local testing
      console.log(`TTFB: ${metrics.ttfb}ms`);
    }

    // FCP: Good < 1.8s
    if (metrics.fcp !== null) {
      expect(metrics.fcp).toBeLessThan(3000); // More lenient for local testing
      console.log(`FCP: ${metrics.fcp}ms`);
    }
  });

  test('should load critical resources quickly', async ({ page }) => {
    const resourceTimings: any[] = [];
    
    page.on('response', (response) => {
      const url = response.url();
      const timing = response.timing();
      
      // Track critical resources
      if (url.includes('.js') || url.includes('.css') || url === page.url()) {
        resourceTimings.push({
          url: url.split('/').pop(),
          status: response.status(),
          size: response.headers()['content-length'],
          timing: timing
        });
      }
    });

    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Total page load should be reasonable
    expect(loadTime).toBeLessThan(5000); // 5 seconds

    // Check individual resource load times
    resourceTimings.forEach((resource) => {
      if (resource.timing) {
        const totalTime = resource.timing.responseEnd - resource.timing.requestStart;
        expect(totalTime).toBeLessThan(3000); // 3 seconds per resource
      }
      expect(resource.status).toBeLessThan(400); // No 4xx/5xx errors
    });

    console.log(`Total page load time: ${loadTime}ms`);
    console.log(`Resources loaded: ${resourceTimings.length}`);
  });

  test('should have optimized images', async ({ page }) => {
    const imageMetrics: any[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'];
      
      if (contentType && contentType.startsWith('image/')) {
        const size = parseInt(response.headers()['content-length'] || '0');
        imageMetrics.push({
          url: url.split('/').pop(),
          contentType,
          size,
          status: response.status()
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check image optimization
    imageMetrics.forEach((image) => {
      // Images should load successfully
      expect(image.status).toBeLessThan(400);
      
      // Large images should be reasonably sized (< 500KB for web)
      if (image.size > 0) {
        expect(image.size).toBeLessThan(500000); // 500KB
      }
      
      // Prefer modern formats for better performance
      const modernFormats = ['webp', 'avif'];
      const hasModernFormat = modernFormats.some(format => 
        image.contentType.includes(format)
      );
      
      // Log recommendations for optimization
      if (image.size > 100000 && !hasModernFormat) {
        console.log(`Consider optimizing ${image.url} (${image.size} bytes, ${image.contentType})`);
      }
    });

    console.log(`Total images loaded: ${imageMetrics.length}`);
  });

  test('should handle large datasets efficiently', async ({ page, browserName }) => {
    // Skip for webkit due to performance testing limitations
    if (browserName === 'webkit') {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure memory usage
    const initialMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    // Interact with the application to potentially load more data
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible() && await button.isEnabled()) {
        await button.click();
        await page.waitForTimeout(500);
      }
    }

    // Wait for any data loading
    await page.waitForTimeout(2000);

    // Measure memory after interaction
    const afterMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        };
      }
      return null;
    });

    if (initialMetrics && afterMetrics) {
      const memoryIncrease = afterMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      
      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50000000);
      
      // Total memory usage should be reasonable (< 100MB)
      expect(afterMetrics.usedJSHeapSize).toBeLessThan(100000000);
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Total memory: ${(afterMetrics.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }
  });

  test('should have fast JavaScript execution', async ({ page }) => {
    // Measure JavaScript execution performance
    const jsPerformance = await page.evaluate(() => {
      const start = performance.now();
      
      // Simulate typical JavaScript operations
      const operations = [];
      
      // Array operations
      const arr = Array.from({ length: 1000 }, (_, i) => i);
      operations.push(arr.filter(x => x % 2 === 0).map(x => x * 2));
      
      // Object operations
      const obj = {};
      for (let i = 0; i < 1000; i++) {
        obj[`key${i}`] = `value${i}`;
      }
      operations.push(Object.keys(obj).length);
      
      // String operations
      let str = '';
      for (let i = 0; i < 100; i++) {
        str += `test string ${i} `;
      }
      operations.push(str.length);
      
      const end = performance.now();
      return {
        executionTime: end - start,
        operationsCompleted: operations.length
      };
    });

    // JavaScript execution should be fast (< 100ms for basic operations)
    expect(jsPerformance.executionTime).toBeLessThan(100);
    expect(jsPerformance.operationsCompleted).toBeGreaterThan(0);
    
    console.log(`JS execution time: ${jsPerformance.executionTime.toFixed(2)}ms`);
  });

  test('should handle scrolling performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure scroll performance
    const scrollPerformance = await page.evaluate(async () => {
      let frameCount = 0;
      let startTime = performance.now();
      
      const measureFrames = () => {
        frameCount++;
        if (frameCount < 60) { // Measure for ~1 second at 60fps
          requestAnimationFrame(measureFrames);
        }
      };
      
      // Start measuring
      requestAnimationFrame(measureFrames);
      
      // Perform scrolling
      window.scrollTo({ top: 1000, behavior: 'smooth' });
      
      // Wait for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const fps = (frameCount / duration) * 1000;
      
      return {
        frameCount,
        duration,
        fps: Math.round(fps)
      };
    });

    // Should maintain decent frame rate during scrolling (> 30fps)
    expect(scrollPerformance.fps).toBeGreaterThan(30);
    
    console.log(`Scroll performance: ${scrollPerformance.fps} FPS`);
  });

  test('should have efficient DOM size', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const domMetrics = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const depthCounter: { [key: number]: number } = {};
      let maxDepth = 0;
      
      // Calculate DOM depth distribution
      allElements.forEach(element => {
        let depth = 0;
        let parent = element.parentElement;
        while (parent) {
          depth++;
          parent = parent.parentElement;
        }
        
        depthCounter[depth] = (depthCounter[depth] || 0) + 1;
        maxDepth = Math.max(maxDepth, depth);
      });

      return {
        totalElements: allElements.length,
        maxDepth,
        averageDepth: Object.entries(depthCounter)
          .reduce((sum, [depth, count]) => sum + (parseInt(depth) * count), 0) / allElements.length
      };
    });

    // DOM should be reasonably sized
    expect(domMetrics.totalElements).toBeLessThan(5000); // Reasonable DOM size
    expect(domMetrics.maxDepth).toBeLessThan(20); // Not too deeply nested
    expect(domMetrics.averageDepth).toBeLessThan(10); // Reasonable average depth

    console.log(`DOM elements: ${domMetrics.totalElements}`);
    console.log(`Max depth: ${domMetrics.maxDepth}`);
    console.log(`Average depth: ${domMetrics.averageDepth.toFixed(2)}`);
  });
});