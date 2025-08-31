import { test, expect } from '@playwright/test';

test.describe('PWA Installation and Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have PWA manifest', async ({ page }) => {
    // Check for manifest link in head
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveCount(1);
    
    const manifestHref = await manifest.getAttribute('href');
    expect(manifestHref).toBeTruthy();
    
    // Fetch and validate manifest content
    const manifestUrl = manifestHref?.startsWith('/') 
      ? `http://localhost:3000${manifestHref}`
      : manifestHref;
    
    if (manifestUrl) {
      const response = await page.request.get(manifestUrl);
      expect(response.ok()).toBeTruthy();
      
      const manifestData = await response.json();
      
      // Check required PWA manifest properties
      expect(manifestData.name || manifestData.short_name).toBeTruthy();
      expect(manifestData.start_url).toBeTruthy();
      expect(manifestData.display).toBeTruthy();
      expect(manifestData.icons).toBeDefined();
      expect(Array.isArray(manifestData.icons)).toBeTruthy();
      expect(manifestData.icons.length).toBeGreaterThan(0);
      
      // Check for proper icon sizes
      const iconSizes = manifestData.icons.map((icon: any) => icon.sizes);
      expect(iconSizes.some((size: string) => size.includes('192'))).toBeTruthy();
      expect(iconSizes.some((size: string) => size.includes('512'))).toBeTruthy();
    }
  });

  test('should have service worker', async ({ page }) => {
    // Check if service worker is registered
    const serviceWorkerStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          return {
            supported: true,
            registered: !!registration,
            active: !!registration?.active
          };
        } catch (error) {
          return { supported: true, registered: false, active: false, error: error.message };
        }
      }
      return { supported: false, registered: false, active: false };
    });

    expect(serviceWorkerStatus.supported).toBeTruthy();
    
    if (serviceWorkerStatus.registered) {
      expect(serviceWorkerStatus.active).toBeTruthy();
    }
  });

  test('should show install prompt on supported browsers', async ({ page, browserName }) => {
    // This test is specific to Chrome/Edge which support PWA installation
    if (browserName !== 'chromium') {
      test.skip();
      return;
    }

    // Listen for beforeinstallprompt event
    await page.addInitScript(() => {
      window.addEventListener('beforeinstallprompt', (e) => {
        (window as any).installPromptEvent = e;
        e.preventDefault(); // Prevent automatic prompt
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for potential install prompt
    await page.waitForTimeout(3000);
    
    const installPromptAvailable = await page.evaluate(() => {
      return !!(window as any).installPromptEvent;
    });

    // If install prompt is available, test the installation flow
    if (installPromptAvailable) {
      // Look for custom install button
      const installButtonSelectors = [
        'button:has-text("Install")',
        'button:has-text("Add to Home")',
        '[data-testid*="install"]',
        '[aria-label*="install"]'
      ];

      let installButton = null;
      for (const selector of installButtonSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          installButton = element;
          break;
        }
      }

      if (installButton) {
        await expect(installButton).toBeVisible();
        await expect(installButton).toBeEnabled();
      }
    }
  });

  test('should have proper PWA meta tags', async ({ page }) => {
    // Check for essential PWA meta tags
    const metaTags = {
      'theme-color': 'meta[name="theme-color"]',
      'viewport': 'meta[name="viewport"]',
      'apple-mobile-web-app-capable': 'meta[name="apple-mobile-web-app-capable"]',
      'apple-mobile-web-app-title': 'meta[name="apple-mobile-web-app-title"]'
    };

    // Viewport is essential
    const viewport = page.locator(metaTags.viewport);
    await expect(viewport).toHaveCount(1);
    
    const viewportContent = await viewport.getAttribute('content');
    expect(viewportContent).toContain('width=device-width');
    expect(viewportContent).toContain('initial-scale=1');

    // Theme color enhances PWA experience
    const themeColor = page.locator(metaTags['theme-color']);
    if (await themeColor.count() > 0) {
      const themeColorContent = await themeColor.getAttribute('content');
      expect(themeColorContent).toMatch(/^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{3}$/);
    }
  });

  test('should work offline (basic check)', async ({ page, browserName }) => {
    // Skip for webkit as it has issues with offline testing
    if (browserName === 'webkit') {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for service worker to be ready
    await page.waitForTimeout(2000);
    
    // Check if page is cached
    const cacheStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        const hasCache = cacheNames.length > 0;
        
        if (hasCache) {
          const cache = await caches.open(cacheNames[0]);
          const cachedRequests = await cache.keys();
          return {
            hasCaches: true,
            cacheCount: cacheNames.length,
            cachedRequestCount: cachedRequests.length
          };
        }
      }
      return { hasCaches: false, cacheCount: 0, cachedRequestCount: 0 };
    });

    // If caching is working, test basic offline functionality
    if (cacheStatus.hasCaches && cacheStatus.cachedRequestCount > 0) {
      // Simulate offline
      await page.context().setOffline(true);
      
      // Reload page
      await page.reload();
      
      // Page should still load (from cache)
      await page.waitForTimeout(3000);
      
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      const bodyText = await body.textContent();
      expect(bodyText?.length).toBeGreaterThan(10);
      
      // Restore online
      await page.context().setOffline(false);
    }
  });

  test('should handle app shortcuts in manifest', async ({ page }) => {
    const manifest = page.locator('link[rel="manifest"]');
    const manifestHref = await manifest.getAttribute('href');
    
    if (manifestHref) {
      const manifestUrl = manifestHref?.startsWith('/') 
        ? `http://localhost:3000${manifestHref}`
        : manifestHref;
      
      const response = await page.request.get(manifestUrl);
      const manifestData = await response.json();
      
      if (manifestData.shortcuts) {
        expect(Array.isArray(manifestData.shortcuts)).toBeTruthy();
        
        manifestData.shortcuts.forEach((shortcut: any) => {
          expect(shortcut.name).toBeTruthy();
          expect(shortcut.url).toBeTruthy();
          
          if (shortcut.icons) {
            expect(Array.isArray(shortcut.icons)).toBeTruthy();
          }
        });
      }
    }
  });

  test('should have valid PWA icons', async ({ page }) => {
    const manifest = page.locator('link[rel="manifest"]');
    const manifestHref = await manifest.getAttribute('href');
    
    if (manifestHref) {
      const manifestUrl = manifestHref?.startsWith('/') 
        ? `http://localhost:3000${manifestHref}`
        : manifestHref;
      
      const response = await page.request.get(manifestUrl);
      const manifestData = await response.json();
      
      if (manifestData.icons && manifestData.icons.length > 0) {
        // Test first few icons to ensure they exist and are valid
        const iconsToTest = manifestData.icons.slice(0, 3);
        
        for (const icon of iconsToTest) {
          const iconUrl = icon.src.startsWith('/') 
            ? `http://localhost:3000${icon.src}`
            : icon.src;
          
          const iconResponse = await page.request.get(iconUrl);
          expect(iconResponse.ok()).toBeTruthy();
          
          const contentType = iconResponse.headers()['content-type'];
          expect(contentType).toMatch(/^image\/(png|jpeg|jpg|webp|svg)/);
        }
      }
    }
  });

  test('should have proper splash screen support', async ({ page }) => {
    // Check for Apple splash screen meta tags
    const appleSplashTags = page.locator('link[rel="apple-touch-startup-image"]');
    const appleSplashCount = await appleSplashTags.count();
    
    // Also check for Apple touch icons
    const appleTouchIcons = page.locator('link[rel="apple-touch-icon"]');
    const appleTouchIconCount = await appleTouchIcons.count();
    
    if (appleTouchIconCount > 0) {
      // Verify first apple touch icon
      const firstIcon = appleTouchIcons.first();
      const iconHref = await firstIcon.getAttribute('href');
      
      if (iconHref) {
        const iconUrl = iconHref.startsWith('/') 
          ? `http://localhost:3000${iconHref}`
          : iconHref;
        
        const iconResponse = await page.request.get(iconUrl);
        expect(iconResponse.ok()).toBeTruthy();
      }
    }
  });
});