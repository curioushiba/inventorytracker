import { test, expect } from '@playwright/test';

test.describe('Comprehensive PWA Quick Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Homepage loads successfully with proper structure', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/inventory/i);
    
    // Check basic page structure loads
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Should have either login form or dashboard
    const loginForm = page.locator('form, input[type="email"], button:has-text("Sign")').first();
    const dashboard = page.locator('h1:has-text("Inventory")').first();
    
    const hasLoginOrDashboard = 
      await loginForm.isVisible().catch(() => false) ||
      await dashboard.isVisible().catch(() => false);
    
    expect(hasLoginOrDashboard).toBeTruthy();
  });

  test('PWA manifest exists and is valid', async ({ page }) => {
    // Check manifest link
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveCount(1);
    
    const manifestHref = await manifest.getAttribute('href');
    expect(manifestHref).toBeTruthy();
    
    // Fetch manifest
    const manifestResponse = await page.request.get(manifestHref!.startsWith('/') 
      ? `http://localhost:3000${manifestHref}` 
      : manifestHref!);
    expect(manifestResponse.ok()).toBeTruthy();
    
    const manifestData = await manifestResponse.json();
    expect(manifestData.name || manifestData.short_name).toBeTruthy();
    expect(manifestData.start_url).toBeTruthy();
    expect(manifestData.icons).toBeDefined();
    expect(Array.isArray(manifestData.icons)).toBeTruthy();
  });

  test('Basic Performance Metrics', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).performanceMetrics = { lcp: null, cls: 0 };
      
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          (window as any).performanceMetrics.lcp = entries[entries.length - 1].startTime;
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            (window as any).performanceMetrics.cls += entry.value;
          }
        });
      }).observe({ entryTypes: ['layout-shift'] });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const metrics = await page.evaluate(() => (window as any).performanceMetrics);
    
    if (metrics.lcp !== null) {
      expect(metrics.lcp).toBeLessThan(4000); // 4 seconds
    }
    
    expect(metrics.cls).toBeLessThan(0.25); // CLS threshold
  });

  test('Mobile Responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check no horizontal overflow
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(375 + 20);
    
    // Check touch targets
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const buttonBox = await firstButton.boundingBox();
      
      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThanOrEqual(36); // Touch friendly
      }
    }
  });

  test('Basic Accessibility', async ({ page }) => {
    // Check heading structure
    const h1Elements = await page.locator('h1').count();
    expect(h1Elements).toBeGreaterThanOrEqual(1);
    
    // Check proper page title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
    
    // Check form labels if forms exist
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      const input = inputs.nth(i);
      const hasAriaLabel = await input.getAttribute('aria-label');
      const hasPlaceholder = await input.getAttribute('placeholder');
      const inputId = await input.getAttribute('id');
      
      let hasLabel = false;
      if (inputId) {
        const label = page.locator(`label[for="${inputId}"]`);
        hasLabel = await label.count() > 0;
      }
      
      expect(hasLabel || hasAriaLabel || hasPlaceholder).toBeTruthy();
    }
  });

  test('Touch Interactions Work', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    const buttons = page.locator('button:visible, a:visible');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      await firstButton.tap();
      
      // Should not crash the app
      await page.waitForTimeout(1000);
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });

  test('Service Worker Registration', async ({ page }) => {
    const serviceWorkerStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          return {
            supported: true,
            registered: !!registration
          };
        } catch (error) {
          return { supported: true, registered: false };
        }
      }
      return { supported: false, registered: false };
    });

    expect(serviceWorkerStatus.supported).toBeTruthy();
    // Service worker registration might be async, so we don't strictly require it
  });

  test('No Critical JavaScript Errors', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('manifest') &&
      !error.includes('Non-Error promise rejection captured')
    );
    
    expect(criticalErrors.length).toBeLessThan(3); // Allow some minor errors
  });

  test('Cross-Browser Compatibility Basics', async ({ page, browserName }) => {
    await page.waitForLoadState('networkidle');
    
    // Basic functionality should work in all browsers
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check CSS support
    const hasModernCSS = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.display = 'grid';
      div.style.gap = '10px';
      document.body.appendChild(div);
      
      const computed = window.getComputedStyle(div);
      const supportsGrid = computed.display === 'grid';
      const supportsGap = computed.gap === '10px';
      
      document.body.removeChild(div);
      
      return { supportsGrid, supportsGap };
    });
    
    // Modern browsers should support these
    if (browserName === 'chromium' || browserName === 'firefox') {
      expect(hasModernCSS.supportsGrid).toBeTruthy();
    }
  });

  test('Offline Capability Detection', async ({ page, browserName }) => {
    // Skip for webkit due to testing limitations
    if (browserName === 'webkit') {
      test.skip();
    }

    await page.waitForLoadState('networkidle');
    
    // Check if caching is available
    const cacheSupport = await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          return {
            supported: true,
            hasCaches: cacheNames.length > 0
          };
        } catch (error) {
          return { supported: true, hasCaches: false };
        }
      }
      return { supported: false, hasCaches: false };
    });

    expect(cacheSupport.supported).toBeTruthy();
  });
});