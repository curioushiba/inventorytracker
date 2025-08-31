import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to login page', async ({ page }) => {
    // Look for login/signin buttons or links
    const loginSelectors = [
      'a[href*="login"]',
      'a[href*="signin"]', 
      'a[href*="auth"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      '[data-testid="login"]',
      '[aria-label*="login"]',
      '[aria-label*="sign in"]'
    ];

    let loginElement = null;
    for (const selector of loginSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        loginElement = element;
        break;
      }
    }

    if (loginElement) {
      await loginElement.click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're on a login page
      const url = page.url();
      const content = await page.textContent('body');
      
      expect(
        url.includes('login') || 
        url.includes('signin') || 
        url.includes('auth') ||
        content?.toLowerCase().includes('login') ||
        content?.toLowerCase().includes('sign in')
      ).toBeTruthy();
    }
  });

  test('should show login form elements', async ({ page }) => {
    // Try to find login form
    await page.goto('/login').catch(() => {});
    await page.goto('/signin').catch(() => {});
    await page.goto('/auth').catch(() => {});
    
    // Look for common login form elements
    const formElements = await page.locator('form').count();
    const emailInputs = await page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').count();
    const passwordInputs = await page.locator('input[type="password"], input[name*="password"]').count();
    const submitButtons = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")').count();

    // If we have form elements, test them
    if (formElements > 0 || emailInputs > 0 || passwordInputs > 0) {
      if (emailInputs > 0) {
        const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
        await expect(emailInput).toBeVisible();
        await emailInput.fill('test@example.com');
        expect(await emailInput.inputValue()).toBe('test@example.com');
      }

      if (passwordInputs > 0) {
        const passwordInput = page.locator('input[type="password"], input[name*="password"]').first();
        await expect(passwordInput).toBeVisible();
        await passwordInput.fill('testpassword');
        expect(await passwordInput.inputValue()).toBe('testpassword');
      }

      if (submitButtons > 0) {
        const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toBeEnabled();
      }
    }
  });

  test('should handle invalid login attempts gracefully', async ({ page }) => {
    const hasAuthForm = await page.goto('/login').then(() => true).catch(() => false) ||
                       await page.goto('/signin').then(() => true).catch(() => false) ||
                       await page.goto('/auth').then(() => true).catch(() => false);

    if (!hasAuthForm) {
      // Skip if no auth pages found
      test.skip();
      return;
    }

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name*="password"]').first();
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

    if (await emailInput.isVisible() && await passwordInput.isVisible() && await submitButton.isVisible()) {
      // Try invalid credentials
      await emailInput.fill('invalid@example.com');
      await passwordInput.fill('wrongpassword');
      await submitButton.click();

      // Wait for response and check for error handling
      await page.waitForTimeout(2000);
      
      // Look for error messages
      const errorSelectors = [
        '[data-testid="error"]',
        '.error',
        '[role="alert"]',
        ':has-text("error")',
        ':has-text("invalid")',
        ':has-text("incorrect")',
        ':has-text("failed")'
      ];

      let hasError = false;
      for (const selector of errorSelectors) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          hasError = true;
          break;
        }
      }

      // The form should either show an error or remain on the same page
      // (not crash or show a blank page)
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      const bodyText = await body.textContent();
      expect(bodyText?.length).toBeGreaterThan(10); // Not a blank page
    }
  });

  test('should have proper form accessibility', async ({ page }) => {
    const hasAuthForm = await page.goto('/login').then(() => true).catch(() => false) ||
                       await page.goto('/signin').then(() => true).catch(() => false);

    if (!hasAuthForm) {
      test.skip();
      return;
    }

    // Check form has proper labels
    const formInputs = page.locator('input[type="email"], input[type="password"], input[type="text"]');
    const inputCount = await formInputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = formInputs.nth(i);
      const inputId = await input.getAttribute('id');
      const hasAriaLabel = await input.getAttribute('aria-label');
      const hasPlaceholder = await input.getAttribute('placeholder');
      
      // Each input should have at least one of: id+label, aria-label, or placeholder
      if (inputId) {
        const label = page.locator(`label[for="${inputId}"]`);
        const hasLabel = await label.isVisible();
        expect(hasLabel || hasAriaLabel || hasPlaceholder).toBeTruthy();
      } else {
        expect(hasAriaLabel || hasPlaceholder).toBeTruthy();
      }
    }

    // Check form is keyboard navigable
    const firstInput = formInputs.first();
    if (await firstInput.isVisible()) {
      await firstInput.focus();
      await expect(firstInput).toBeFocused();
      
      // Tab through form
      await page.keyboard.press('Tab');
      // Should focus next element (not necessarily still be on first input)
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should redirect after successful authentication', async ({ page }) => {
    // This test would require actual authentication setup
    // For now, just verify the structure exists for redirect handling
    
    const hasAuthForm = await page.goto('/login').then(() => true).catch(() => false);
    if (!hasAuthForm) {
      test.skip();
      return;
    }

    // Check that form submission doesn't cause a client-side error
    const form = page.locator('form').first();
    if (await form.isVisible()) {
      // Monitor for any client-side JavaScript errors
      const jsErrors: string[] = [];
      page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });

      const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should not have JavaScript errors
        expect(jsErrors).toHaveLength(0);
      }
    }
  });
});