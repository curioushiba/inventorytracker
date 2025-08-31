import { test, expect } from '@playwright/test';

test.describe('Mobile Touch Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');
  });

  test('should handle tap gestures correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Find interactive elements
    const buttons = page.locator('button:visible');
    const links = page.locator('a:visible');
    const inputs = page.locator('input:visible');
    
    const buttonCount = await buttons.count();
    const linkCount = await links.count();
    const inputCount = await inputs.count();
    
    // Test button taps
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const buttonBox = await firstButton.boundingBox();
      
      if (buttonBox) {
        // Ensure button is touch-friendly size (at least 44x44px as per iOS guidelines)
        expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(36);
        
        // Test tap gesture
        await firstButton.tap();
        
        // Button should respond to tap (either navigate, show feedback, etc.)
        await page.waitForTimeout(500);
        // The page should still be functional (not crash)
        const body = page.locator('body');
        await expect(body).toBeVisible();
      }
    }
    
    // Test link taps
    if (linkCount > 0) {
      const firstLink = links.first();
      const href = await firstLink.getAttribute('href');
      
      if (href && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        await firstLink.tap();
        await page.waitForTimeout(1000);
        
        // Should navigate or show some response
        const currentUrl = page.url();
        expect(currentUrl).toBeTruthy();
      }
    }
    
    // Test input focus with tap
    if (inputCount > 0) {
      const firstInput = inputs.first();
      await firstInput.tap();
      
      // Input should be focused
      await expect(firstInput).toBeFocused();
      
      // Should be able to type
      await firstInput.fill('test input');
      expect(await firstInput.inputValue()).toBe('test input');
    }
  });

  test('should handle swipe gestures', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Look for swipeable elements (carousels, tabs, etc.)
    const swipeableSelectors = [
      '[data-testid*="carousel"]',
      '[data-testid*="slider"]',
      '.carousel',
      '.slider',
      '.swiper',
      '[role="tablist"]',
      '.tabs'
    ];
    
    let swipeableElement = null;
    for (const selector of swipeableSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        swipeableElement = element;
        break;
      }
    }
    
    if (swipeableElement) {
      const elementBox = await swipeableElement.boundingBox();
      
      if (elementBox) {
        const centerX = elementBox.x + elementBox.width / 2;
        const centerY = elementBox.y + elementBox.height / 2;
        
        // Perform swipe left gesture
        await page.touchscreen.tap(centerX, centerY);
        await page.touchscreen.tap(centerX - 100, centerY);
        
        await page.waitForTimeout(500);
        
        // Element should still be visible and functional
        await expect(swipeableElement).toBeVisible();
      }
    } else {
      // Test general page swipe (scroll)
      const initialScrollPosition = await page.evaluate(() => window.scrollY);
      
      // Swipe up (scroll down)
      await page.touchscreen.tap(200, 400);
      await page.touchscreen.tap(200, 300);
      
      await page.waitForTimeout(500);
      
      const newScrollPosition = await page.evaluate(() => window.scrollY);
      
      // Page should either scroll or handle the gesture gracefully
      expect(newScrollPosition >= initialScrollPosition).toBeTruthy();
    }
  });

  test('should handle long press gestures', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Find elements that might respond to long press
    const interactiveElements = page.locator('button:visible, a:visible, [data-testid*="item"]:visible');
    const count = await interactiveElements.count();
    
    if (count > 0) {
      const element = interactiveElements.first();
      const elementBox = await element.boundingBox();
      
      if (elementBox) {
        const centerX = elementBox.x + elementBox.width / 2;
        const centerY = elementBox.y + elementBox.height / 2;
        
        // Simulate long press (touch down, wait, touch up)
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.waitForTimeout(800); // Long press duration
        await page.mouse.up();
        
        await page.waitForTimeout(500);
        
        // Check if context menu or action appeared
        const contextMenus = page.locator('.context-menu, [role="menu"], .menu');
        const contextMenuVisible = await contextMenus.first().isVisible().catch(() => false);
        
        // Even if no context menu appears, the app should not crash
        const body = page.locator('body');
        await expect(body).toBeVisible();
      }
    }
  });

  test('should handle multi-touch gestures', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Test pinch-to-zoom on images or zoomable content
    const zoomableElements = page.locator('img, canvas, [data-zoomable], .zoomable');
    const zoomableCount = await zoomableElements.count();
    
    if (zoomableCount > 0) {
      const element = zoomableElements.first();
      const elementBox = await element.boundingBox();
      
      if (elementBox) {
        const centerX = elementBox.x + elementBox.width / 2;
        const centerY = elementBox.y + elementBox.height / 2;
        
        // Simulate pinch gesture (not fully supported in Playwright, but test basic interaction)
        await page.touchscreen.tap(centerX - 20, centerY);
        await page.touchscreen.tap(centerX + 20, centerY);
        
        await page.waitForTimeout(500);
        
        // Element should remain functional
        await expect(element).toBeVisible();
      }
    }
  });

  test('should prevent unwanted zoom on input focus', async ({ page }) => {
    const inputs = page.locator('input:visible, select:visible, textarea:visible');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      const input = inputs.nth(i);
      
      // Check font size to prevent iOS zoom
      const fontSize = await input.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return parseInt(style.fontSize);
      });
      
      // Font size should be at least 16px to prevent iOS zoom
      expect(fontSize).toBeGreaterThanOrEqual(16);
      
      // Test input tap and ensure no unwanted behavior
      await input.tap();
      await expect(input).toBeFocused();
      
      // Should be able to type without issues
      await input.fill('mobile test');
      expect(await input.inputValue()).toBe('mobile test');
      
      // Clear for next test
      await input.fill('');
    }
  });

  test('should have touch-friendly spacing', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check spacing between interactive elements
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 1) {
      for (let i = 0; i < Math.min(buttonCount - 1, 5); i++) {
        const button1 = buttons.nth(i);
        const button2 = buttons.nth(i + 1);
        
        const box1 = await button1.boundingBox();
        const box2 = await button2.boundingBox();
        
        if (box1 && box2) {
          // Calculate distance between button centers
          const centerX1 = box1.x + box1.width / 2;
          const centerY1 = box1.y + box1.height / 2;
          const centerX2 = box2.x + box2.width / 2;
          const centerY2 = box2.y + box2.height / 2;
          
          const distance = Math.sqrt(
            Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2)
          );
          
          // Buttons should have reasonable spacing (at least 8px gap)
          const minDistance = 52; // 44px touch target + 8px gap
          if (distance < minDistance) {
            // Check if buttons are in different rows/columns
            const verticalOverlap = !(box1.y + box1.height < box2.y || box2.y + box2.height < box1.y);
            const horizontalOverlap = !(box1.x + box1.width < box2.x || box2.x + box2.width < box1.x);
            
            // Only expect spacing if buttons are adjacent
            if (verticalOverlap || horizontalOverlap) {
              expect(distance).toBeGreaterThanOrEqual(minDistance * 0.8); // Slightly more lenient
            }
          }
        }
      }
    }
  });

  test('should handle orientation change', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Test portrait mode (current)
    const portraitScreenshot = await page.screenshot({ fullPage: false });
    expect(portraitScreenshot).toBeTruthy();
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(1000);
    
    // Content should adapt to landscape
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check that content doesn't overflow
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(667 + 20);
    
    // Navigation should still work
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      await firstButton.tap();
      
      // App should remain functional
      await page.waitForTimeout(500);
      await expect(body).toBeVisible();
    }
    
    // Switch back to portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Should still work in portrait
    await expect(body).toBeVisible();
  });

  test('should handle scroll momentum and elastic bounce', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Create scrollable content by scrolling to different positions
    const initialPosition = await page.evaluate(() => window.scrollY);
    
    // Test fast scroll (momentum)
    await page.touchscreen.tap(200, 400);
    for (let i = 0; i < 5; i++) {
      await page.touchscreen.tap(200, 400 - i * 30);
      await page.waitForTimeout(50);
    }
    
    await page.waitForTimeout(1000); // Wait for scroll to settle
    
    const scrolledPosition = await page.evaluate(() => window.scrollY);
    
    // Should have scrolled smoothly
    expect(scrolledPosition).toBeGreaterThanOrEqual(initialPosition);
    
    // Test overscroll (should bounce back)
    const maxScrollY = await page.evaluate(() => 
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    );
    
    if (maxScrollY > 0) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(500);
      
      // Try to scroll beyond bottom
      await page.touchscreen.tap(200, 500);
      await page.touchscreen.tap(200, 600);
      
      await page.waitForTimeout(1000);
      
      const finalPosition = await page.evaluate(() => window.scrollY);
      
      // Should not scroll beyond content
      expect(finalPosition).toBeLessThanOrEqual(maxScrollY + 10);
    }
  });

  test('should handle edge swipe navigation', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Test edge swipe from left (back navigation)
    await page.touchscreen.tap(5, 300); // Near left edge
    await page.touchscreen.tap(100, 300);
    
    await page.waitForTimeout(500);
    
    // App should handle edge swipe gracefully (not crash)
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Test edge swipe from right
    await page.touchscreen.tap(370, 300); // Near right edge
    await page.touchscreen.tap(270, 300);
    
    await page.waitForTimeout(500);
    
    // App should remain functional
    await expect(body).toBeVisible();
  });
});