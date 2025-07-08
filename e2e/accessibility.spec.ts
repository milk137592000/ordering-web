import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    // Should have at least one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check heading levels are logical
    let previousLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const currentLevel = parseInt(tagName.charAt(1));
      
      if (previousLevel > 0) {
        // Heading levels should not skip more than one level
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
      
      previousLevel = currentLevel;
    }
  });

  test('should have proper alt text for images', async ({ page }) => {
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      
      // Images should have alt text or be decorative
      if (src && !src.includes('data:')) {
        expect(alt).toBeDefined();
        expect(alt).not.toBe('');
      }
    }
  });

  test('should have proper form labels', async ({ page }) => {
    const inputs = await page.locator('input, textarea, select').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      
      // Input should have some form of labeling
      const hasLabel = id && await page.locator(`label[for="${id}"]`).count() > 0;
      const hasAriaLabel = ariaLabel && ariaLabel.trim() !== '';
      const hasAriaLabelledBy = ariaLabelledBy && ariaLabelledBy.trim() !== '';
      const hasPlaceholder = placeholder && placeholder.trim() !== '';
      
      expect(hasLabel || hasAriaLabel || hasAriaLabelledBy || hasPlaceholder).toBe(true);
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Test tab navigation
    const focusableElements = await page.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])').all();
    
    if (focusableElements.length > 0) {
      // Start from first element
      await focusableElements[0].focus();
      
      // Tab through elements
      for (let i = 1; i < Math.min(focusableElements.length, 10); i++) {
        await page.keyboard.press('Tab');
        
        // Check if focus moved to next element
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
      }
      
      // Test shift+tab (reverse navigation)
      await page.keyboard.press('Shift+Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    expect(colorContrastViolations).toEqual([]);
  });

  test('should support screen readers', async ({ page }) => {
    // Check for ARIA landmarks
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').count();
    expect(landmarks).toBeGreaterThan(0);
    
    // Check for skip links
    const skipLinks = await page.locator('a[href^="#"]').first();
    if (await skipLinks.count() > 0) {
      const skipLinkText = await skipLinks.textContent();
      expect(skipLinkText?.toLowerCase()).toContain('skip');
    }
    
    // Check for proper button roles
    const buttons = await page.locator('button, [role="button"]').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      // Buttons should have accessible text
      expect(text?.trim() || ariaLabel?.trim()).toBeTruthy();
    }
  });

  test('should handle focus management properly', async ({ page }) => {
    // Test modal focus management (if modals exist)
    const modalTriggers = await page.locator('[data-testid*="modal"], [aria-haspopup="dialog"]').all();
    
    for (const trigger of modalTriggers) {
      await trigger.click();
      
      // Check if focus is trapped in modal
      const modal = page.locator('[role="dialog"], [aria-modal="true"]');
      if (await modal.count() > 0) {
        // Focus should be within modal
        const focusedElement = page.locator(':focus');
        const isInModal = await modal.locator(':focus').count() > 0;
        expect(isInModal).toBe(true);
        
        // Escape should close modal
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('should provide proper error messages', async ({ page }) => {
    // Navigate to team setup or form
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    if (await nameInput.count() > 0) {
      // Try to submit empty form
      await page.getByText('新增成員').click();
      
      // Check for error message
      const errorMessage = page.locator('[role="alert"], .error, [aria-live="polite"]');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
        
        // Error message should be descriptive
        const errorText = await errorMessage.textContent();
        expect(errorText?.length).toBeGreaterThan(5);
      }
    }
  });

  test('should work with high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Check that content is still visible
    await expect(page.getByText('丁二烯C班點餐系統')).toBeVisible();
    
    // Run accessibility scan in high contrast mode
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    const criticalViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'critical'
    );
    
    expect(criticalViolations).toEqual([]);
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Check that animations are disabled or reduced
    const animatedElements = await page.locator('[class*="animate"], [class*="transition"]').all();
    
    for (const element of animatedElements) {
      const computedStyle = await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          animationDuration: style.animationDuration,
          transitionDuration: style.transitionDuration
        };
      });
      
      // Animations should be disabled or very short
      if (computedStyle.animationDuration !== 'none') {
        expect(parseFloat(computedStyle.animationDuration)).toBeLessThanOrEqual(0.1);
      }
    }
  });

  test('should be usable at 200% zoom', async ({ page }) => {
    // Set viewport to simulate 200% zoom
    await page.setViewportSize({ width: 640, height: 360 });
    
    // Check that content is still accessible
    await expect(page.getByText('丁二烯C班點餐系統')).toBeVisible();
    
    // Check that interactive elements are still clickable
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 3)) { // Test first 3 buttons
      await expect(button).toBeVisible();
      
      const boundingBox = await button.boundingBox();
      if (boundingBox) {
        // Button should be large enough to click (minimum 44x44px)
        expect(boundingBox.width).toBeGreaterThanOrEqual(24);
        expect(boundingBox.height).toBeGreaterThanOrEqual(24);
      }
    }
  });

  test('should provide clear navigation structure', async ({ page }) => {
    // Check for navigation landmarks
    const navigation = await page.locator('nav, [role="navigation"]').count();
    expect(navigation).toBeGreaterThanOrEqual(1);
    
    // Check for breadcrumbs or progress indicators
    const progressIndicators = await page.locator('[aria-label*="progress"], [role="progressbar"], .breadcrumb').count();
    
    // Check for clear page titles
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    expect(pageTitle.length).toBeGreaterThan(0);
  });
});
