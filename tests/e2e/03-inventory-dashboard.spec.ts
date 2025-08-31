import { test, expect } from '@playwright/test';

test.describe('Inventory Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display dashboard elements', async ({ page }) => {
    // Look for dashboard-related elements
    const dashboardSelectors = [
      '[data-testid="dashboard"]',
      '[data-testid="inventory"]',
      '[data-testid="items"]',
      'main',
      '.dashboard',
      '.inventory'
    ];

    let dashboardElement = null;
    for (const selector of dashboardSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        dashboardElement = element;
        break;
      }
    }

    expect(dashboardElement).toBeTruthy();
    
    // Check for common dashboard components
    const commonElements = [
      'button', // Should have action buttons
      'table, ul, .grid, [data-testid*="list"]', // Some kind of data display
      'h1, h2, .title, [data-testid*="title"]' // Headers/titles
    ];

    for (const elementSelector of commonElements) {
      const elements = page.locator(elementSelector);
      const count = await elements.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should show inventory items or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for inventory items
    const itemSelectors = [
      '[data-testid*="item"]',
      '.item',
      'tr:not(:first-child)', // Table rows (not header)
      '.card',
      '.product',
      '.inventory-item'
    ];

    let hasItems = false;
    for (const selector of itemSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        hasItems = true;
        
        // If items exist, verify they have content
        const firstItem = elements.first();
        await expect(firstItem).toBeVisible();
        
        const itemText = await firstItem.textContent();
        expect(itemText?.trim().length).toBeGreaterThan(0);
        break;
      }
    }

    if (!hasItems) {
      // Look for empty state
      const emptyStateSelectors = [
        ':has-text("No items")',
        ':has-text("Empty")',
        ':has-text("Add your first")',
        '[data-testid*="empty"]',
        '.empty-state',
        '.no-items'
      ];

      let hasEmptyState = false;
      for (const selector of emptyStateSelectors) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          hasEmptyState = true;
          break;
        }
      }

      // Should have either items or empty state
      expect(hasEmptyState).toBeTruthy();
    }
  });

  test('should have search/filter functionality', async ({ page }) => {
    // Look for search inputs
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="search"]',
      'input[placeholder*="Search"]',
      'input[name*="search"]',
      '[data-testid*="search"]',
      '.search-input'
    ];

    let searchElement = null;
    for (const selector of searchSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        searchElement = element;
        break;
      }
    }

    if (searchElement) {
      // Test search functionality
      await searchElement.fill('test search');
      expect(await searchElement.inputValue()).toBe('test search');
      
      // Clear search
      await searchElement.fill('');
      expect(await searchElement.inputValue()).toBe('');
    }

    // Look for filter options
    const filterSelectors = [
      'select',
      '[data-testid*="filter"]',
      '.filter',
      'button:has-text("Filter")',
      'button:has-text("Sort")'
    ];

    let hasFilters = false;
    for (const selector of filterSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        hasFilters = true;
        
        // Test first filter element
        const firstFilter = elements.first();
        await expect(firstFilter).toBeVisible();
        await expect(firstFilter).toBeEnabled();
        
        if ((await firstFilter.tagName()) === 'SELECT') {
          const options = await firstFilter.locator('option').count();
          expect(options).toBeGreaterThan(0);
        }
        break;
      }
    }

    // Either search or filters should be present for good UX
    expect(searchElement !== null || hasFilters).toBeTruthy();
  });

  test('should have add item functionality', async ({ page }) => {
    // Look for add buttons
    const addButtonSelectors = [
      'button:has-text("Add")',
      'button:has-text("Create")',
      'button:has-text("New")',
      '[data-testid*="add"]',
      '[data-testid*="create"]',
      'a[href*="add"]',
      'a[href*="new"]',
      '.add-button',
      'button[aria-label*="add"]'
    ];

    let addButton = null;
    for (const selector of addButtonSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        addButton = element;
        break;
      }
    }

    if (addButton) {
      await expect(addButton).toBeVisible();
      await expect(addButton).toBeEnabled();
      
      // Click the button
      await addButton.click();
      
      // Should navigate to form or open modal
      await page.waitForTimeout(1000);
      
      // Look for form elements
      const formElements = [
        'form',
        'input[type="text"]',
        'input[name*="name"]',
        'input[placeholder*="name"]',
        'textarea',
        '[data-testid*="form"]',
        '.modal',
        '.dialog'
      ];

      let hasForm = false;
      for (const selector of formElements) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          hasForm = true;
          break;
        }
      }

      expect(hasForm).toBeTruthy();
    }
  });

  test('should be mobile responsive', async ({ page }) => {
    const mobileViewport = { width: 375, height: 667 };
    await page.setViewportSize(mobileViewport);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that content doesn't overflow horizontally
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(mobileViewport.width + 20);

    // Check for mobile-specific UI elements
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i);
      const buttonBox = await button.boundingBox();
      
      if (buttonBox) {
        // Buttons should be touch-friendly (minimum 36px height)
        expect(buttonBox.height).toBeGreaterThanOrEqual(36);
        
        // Buttons should not be too wide (causing horizontal scroll)
        expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(mobileViewport.width + 10);
      }
    }

    // Check that text is readable (not too small)
    const textElements = page.locator('p, span, div').filter({ hasText: /\w+/ });
    const textCount = await textElements.count();
    
    for (let i = 0; i < Math.min(textCount, 3); i++) {
      const textElement = textElements.nth(i);
      const fontSize = await textElement.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return parseInt(style.fontSize);
      });
      
      // Text should be at least 14px for mobile readability
      expect(fontSize).toBeGreaterThanOrEqual(14);
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test tab navigation through interactive elements
    const interactiveElements = page.locator('button:visible, input:visible, select:visible, a:visible');
    const count = await interactiveElements.count();
    
    if (count > 0) {
      const firstElement = interactiveElements.first();
      await firstElement.focus();
      await expect(firstElement).toBeFocused();

      // Tab through several elements
      for (let i = 0; i < Math.min(count, 5); i++) {
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
      }
    }
  });

  test('should load without layout shift', async ({ page }) => {
    // Monitor for layout shifts during load
    let layoutShifts = 0;
    
    await page.addInitScript(() => {
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
            (window as any).layoutShiftScore = 
              ((window as any).layoutShiftScore || 0) + entry.value;
          }
        });
      }).observe({ entryTypes: ['layout-shift'] });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit more for any delayed layout shifts
    await page.waitForTimeout(2000);
    
    const layoutShiftScore = await page.evaluate(() => (window as any).layoutShiftScore || 0);
    
    // CLS should be less than 0.1 for good user experience
    expect(layoutShiftScore).toBeLessThan(0.1);
  });
});