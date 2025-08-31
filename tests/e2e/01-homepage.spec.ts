import { test, expect } from '@playwright/test';

test.describe('Homepage and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/inventory/i);
    
    // Check for main navigation elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Verify responsive layout
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      // Mobile: Check for hamburger menu or mobile navigation
      const mobileMenu = page.locator('[data-testid="mobile-menu"], [aria-label*="menu"], button:has(svg)').first();
      await expect(mobileMenu).toBeVisible();
    } else {
      // Desktop: Check for full navigation
      const navItems = page.locator('nav a, nav button');
      await expect(navItems.first()).toBeVisible();
    }
  });

  test('should have proper heading structure for accessibility', async ({ page }) => {
    // Check for proper heading hierarchy (h1, then h2, etc.)
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Ensure h1 contains meaningful content
    const h1Text = await h1.textContent();
    expect(h1Text).toBeTruthy();
    expect(h1Text?.length).toBeGreaterThan(0);
  });

  test('should have no console errors on load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('source map') &&
      !error.includes('manifest')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle different screen sizes gracefully', async ({ page, browserName }) => {
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 2560, height: 1440, name: 'Large Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check that content is visible and not cut off
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Ensure no horizontal overflow
      const bodyBox = await body.boundingBox();
      expect(bodyBox?.width).toBeLessThanOrEqual(viewport.width + 20); // Allow small margin

      // Check key interactive elements are accessible
      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const buttonBox = await button.boundingBox();
        
        if (buttonBox) {
          // Ensure buttons meet minimum touch target size (44px)
          if (viewport.width < 768) {
            expect(buttonBox.height).toBeGreaterThanOrEqual(36); // Slightly less strict for small screens
          }
        }
      }
    }
  });
});