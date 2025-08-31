import { test, expect } from '@playwright/test';

test.describe('Accessibility (WCAG Compliance)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper heading structure', async ({ page }) => {
    // Get all headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    
    // Should have at least one h1
    const h1Elements = await page.locator('h1').count();
    expect(h1Elements).toBeGreaterThanOrEqual(1);
    expect(h1Elements).toBeLessThanOrEqual(1); // Only one h1 per page
    
    // Check heading hierarchy (no skipping levels)
    const headingLevels = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) => 
      elements.map(el => parseInt(el.tagName.slice(1)))
    );
    
    if (headingLevels.length > 1) {
      for (let i = 1; i < headingLevels.length; i++) {
        const current = headingLevels[i];
        const previous = headingLevels[i - 1];
        
        // Heading level should not increase by more than 1
        if (current > previous) {
          expect(current - previous).toBeLessThanOrEqual(1);
        }
      }
    }
    
    console.log(`Found ${headings.length} headings with levels: ${headingLevels.join(', ')}`);
  });

  test('should have proper form labels', async ({ page }) => {
    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const inputId = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        
        // Check if input has proper labeling
        let hasLabel = false;
        
        if (inputId) {
          const label = page.locator(`label[for="${inputId}"]`);
          hasLabel = await label.count() > 0;
        }
        
        hasLabel = hasLabel || !!ariaLabel || !!ariaLabelledby || !!placeholder;
        
        if (!hasLabel) {
          const inputType = await input.getAttribute('type') || 'unknown';
          const inputName = await input.getAttribute('name') || 'unnamed';
          console.warn(`Input without proper label: type=${inputType}, name=${inputName}`);
        }
        
        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test('should have keyboard navigation support', async ({ page }) => {
    // Get all interactive elements
    const interactiveElements = page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await interactiveElements.count();
    
    if (count > 0) {
      // Test tab navigation
      const firstElement = interactiveElements.first();
      await firstElement.focus();
      await expect(firstElement).toBeFocused();
      
      // Tab through elements
      for (let i = 0; i < Math.min(count, 5); i++) {
        await page.keyboard.press('Tab');
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();
        
        // Check focus indicator is visible
        const focusedElement = await focused.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            outline: style.outline,
            outlineWidth: style.outlineWidth,
            outlineColor: style.outlineColor,
            boxShadow: style.boxShadow
          };
        });
        
        // Should have some kind of focus indicator
        const hasFocusIndicator = 
          focusedElement.outline !== 'none' ||
          focusedElement.outlineWidth !== '0px' ||
          focusedElement.boxShadow !== 'none';
        
        expect(hasFocusIndicator).toBeTruthy();
      }
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    // This is a basic check - for full color contrast testing, you'd need axe-playwright
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6, a, button').filter({
      hasText: /\w+/
    });
    
    const count = await textElements.count();
    const sampleSize = Math.min(count, 10); // Test first 10 text elements
    
    for (let i = 0; i < sampleSize; i++) {
      const element = textElements.nth(i);
      
      const colors = await element.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontSize: style.fontSize
        };
      });
      
      // Basic check that text has a color (not transparent)
      expect(colors.color).not.toBe('rgba(0, 0, 0, 0)');
      expect(colors.color).not.toBe('transparent');
      
      // Font size should be reasonable for readability
      const fontSize = parseInt(colors.fontSize);
      expect(fontSize).toBeGreaterThanOrEqual(12); // Minimum readable size
    }
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    // Check for common ARIA patterns
    const ariaElements = page.locator('[aria-label], [aria-labelledby], [aria-describedby], [role]');
    const ariaCount = await ariaElements.count();
    
    if (ariaCount > 0) {
      for (let i = 0; i < Math.min(ariaCount, 10); i++) {
        const element = ariaElements.nth(i);
        
        const ariaLabel = await element.getAttribute('aria-label');
        const ariaLabelledby = await element.getAttribute('aria-labelledby');
        const ariaDescribedby = await element.getAttribute('aria-describedby');
        const role = await element.getAttribute('role');
        
        // If element has aria-labelledby, the referenced element should exist
        if (ariaLabelledby) {
          const referencedElement = page.locator(`#${ariaLabelledby}`);
          const exists = await referencedElement.count() > 0;
          expect(exists).toBeTruthy();
        }
        
        // If element has aria-describedby, the referenced element should exist
        if (ariaDescribedby) {
          const referencedElement = page.locator(`#${ariaDescribedby}`);
          const exists = await referencedElement.count() > 0;
          expect(exists).toBeTruthy();
        }
        
        // ARIA labels should not be empty
        if (ariaLabel) {
          expect(ariaLabel.trim().length).toBeGreaterThan(0);
        }
        
        // Role should be a valid ARIA role
        if (role) {
          const validRoles = [
            'alert', 'button', 'checkbox', 'dialog', 'grid', 'gridcell',
            'link', 'log', 'marquee', 'menuitem', 'menuitemcheckbox',
            'menuitemradio', 'option', 'progressbar', 'radio', 'scrollbar',
            'slider', 'spinbutton', 'status', 'tab', 'tabpanel', 'textbox',
            'timer', 'tooltip', 'treeitem', 'combobox', 'group', 'listbox',
            'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid',
            'application', 'article', 'banner', 'complementary', 'contentinfo',
            'form', 'main', 'navigation', 'region', 'search'
          ];
          
          expect(validRoles).toContain(role);
        }
      }
    }
  });

  test('should have proper image alt text', async ({ page }) => {
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaLabel = await img.getAttribute('aria-label');
      
      // Decorative images should have empty alt or role="presentation"
      // Content images should have meaningful alt text
      const isDecorative = alt === '' || role === 'presentation';
      const hasAlternativeText = alt !== null || ariaLabel !== null;
      
      expect(hasAlternativeText).toBeTruthy();
      
      // If not decorative, alt text should be meaningful
      if (!isDecorative && alt) {
        expect(alt.trim().length).toBeGreaterThan(0);
        // Alt text should not be redundant
        expect(alt.toLowerCase()).not.toContain('image of');
        expect(alt.toLowerCase()).not.toContain('picture of');
      }
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for landmark regions
    const landmarks = page.locator('main, nav, header, footer, aside, section[aria-label], [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]');
    const landmarkCount = await landmarks.count();
    
    // Should have at least a main content area
    expect(landmarkCount).toBeGreaterThan(0);
    
    // Check for skip links (common accessibility feature)
    const skipLinks = page.locator('a[href*="#"], .skip-link, .sr-only:visible');
    const skipLinkCount = await skipLinks.count();
    
    // While not required, skip links are recommended for accessibility
    if (skipLinkCount > 0) {
      const firstSkipLink = skipLinks.first();
      const href = await firstSkipLink.getAttribute('href');
      
      if (href && href.startsWith('#')) {
        const targetId = href.substring(1);
        const target = page.locator(`#${targetId}`);
        const targetExists = await target.count() > 0;
        expect(targetExists).toBeTruthy();
      }
    }
    
    console.log(`Found ${landmarkCount} landmark regions`);
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    
    // Title should exist and be meaningful
    expect(title).toBeTruthy();
    expect(title.trim().length).toBeGreaterThan(0);
    expect(title.length).toBeGreaterThan(3); // More than just "App"
    
    // Title should not be generic
    const genericTitles = ['document', 'page', 'untitled', 'new tab'];
    const isGeneric = genericTitles.some(generic => 
      title.toLowerCase().includes(generic)
    );
    expect(isGeneric).toBeFalsy();
    
    console.log(`Page title: "${title}"`);
  });

  test('should handle motion preferences', async ({ page }) => {
    // Test with reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check that animations respect prefers-reduced-motion
    const animatedElements = page.locator('[style*="transition"], [style*="animation"], .animate, [class*="animate"]');
    const animatedCount = await animatedElements.count();
    
    if (animatedCount > 0) {
      // Check first few animated elements
      for (let i = 0; i < Math.min(animatedCount, 3); i++) {
        const element = animatedElements.nth(i);
        
        const computedStyle = await element.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            transition: style.transition,
            animation: style.animation,
            animationDuration: style.animationDuration,
            transitionDuration: style.transitionDuration
          };
        });
        
        // With reduced motion, animations should be disabled or very short
        const hasReducedMotion = 
          computedStyle.animationDuration === '0s' ||
          computedStyle.transitionDuration === '0s' ||
          computedStyle.animation.includes('none') ||
          computedStyle.transition.includes('none');
        
        // This is a recommendation, not a strict requirement
        if (!hasReducedMotion) {
          console.log('Animation found that may not respect prefers-reduced-motion');
        }
      }
    }
  });

  test('should have proper focus management', async ({ page }) => {
    // Test focus trapping in modals/dialogs
    const modalTriggers = page.locator('button:has-text("Open"), button:has-text("Show"), [data-testid*="modal"], [data-testid*="dialog"]');
    const modalCount = await modalTriggers.count();
    
    if (modalCount > 0) {
      const firstTrigger = modalTriggers.first();
      await firstTrigger.click();
      await page.waitForTimeout(500);
      
      // Check if modal opened
      const modal = page.locator('[role="dialog"], .modal, .dialog, [data-testid*="modal"]');
      const modalVisible = await modal.isVisible();
      
      if (modalVisible) {
        // Focus should be inside modal
        const focusedElement = page.locator(':focus');
        const focusedBox = await focusedElement.boundingBox();
        const modalBox = await modal.boundingBox();
        
        if (focusedBox && modalBox) {
          // Focus should be within modal bounds
          expect(focusedBox.x).toBeGreaterThanOrEqual(modalBox.x);
          expect(focusedBox.y).toBeGreaterThanOrEqual(modalBox.y);
          expect(focusedBox.x + focusedBox.width).toBeLessThanOrEqual(modalBox.x + modalBox.width);
          expect(focusedBox.y + focusedBox.height).toBeLessThanOrEqual(modalBox.y + modalBox.height);
        }
        
        // Close modal with Escape key
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        const modalStillVisible = await modal.isVisible();
        expect(modalStillVisible).toBeFalsy();
      }
    }
  });
});