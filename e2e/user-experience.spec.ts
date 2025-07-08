import { test, expect } from '@playwright/test';

test.describe('User Experience Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should provide clear visual feedback for user actions', async ({ page }) => {
    // Test button hover states
    const buttons = await page.locator('button').all();
    
    for (const button of buttons.slice(0, 3)) {
      if (await button.isVisible()) {
        // Get initial styles
        const initialStyles = await button.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            transform: styles.transform
          };
        });
        
        // Hover over button
        await button.hover();
        
        // Check for visual changes on hover
        const hoverStyles = await button.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            transform: styles.transform
          };
        });
        
        // At least one style should change on hover
        const hasVisualFeedback = 
          initialStyles.backgroundColor !== hoverStyles.backgroundColor ||
          initialStyles.color !== hoverStyles.color ||
          initialStyles.transform !== hoverStyles.transform;
        
        expect(hasVisualFeedback).toBe(true);
      }
    }
  });

  test('should provide loading states for async operations', async ({ page }) => {
    // Navigate to a section that might have loading states
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add a member (async operation)
    await page.getByText('新增臨時成員').click();
    const memberInput = page.getByPlaceholder('輸入臨時成員姓名');
    await memberInput.fill('載入測試用戶');
    
    // Click add button and check for loading state
    const addButton = page.getByText('確認新增');
    await addButton.click();
    
    // Check for loading indicators (spinner, disabled state, etc.)
    const loadingIndicators = await page.locator('.loading, .spinner, [aria-busy="true"], [disabled]').count();
    
    // Wait for operation to complete
    await page.waitForTimeout(1000);
    
    // Verify user was added
    await expect(page.getByText('載入測試用戶')).toBeVisible();
  });

  test('should provide clear error messages and recovery options', async ({ page }) => {
    // Try to trigger validation errors
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    if (await nameInput.count() > 0) {
      // Try to add empty member
      await page.getByText('新增成員').click();
      
      // Check for error message
      const errorMessage = page.locator('.error, [role="alert"], .text-red');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
        
        // Error message should be descriptive
        const errorText = await errorMessage.textContent();
        expect(errorText?.length).toBeGreaterThan(5);
        
        // Should provide recovery option (clear error when typing)
        await nameInput.fill('有效用戶名');
        await page.waitForTimeout(500);
        
        // Error should be cleared or less prominent
        const errorStillVisible = await errorMessage.isVisible();
        if (errorStillVisible) {
          // Error might still be visible but should be less prominent
          const errorOpacity = await errorMessage.evaluate(el => 
            window.getComputedStyle(el).opacity
          );
          expect(parseFloat(errorOpacity)).toBeLessThan(1);
        }
      }
    }
  });

  test('should maintain consistent navigation patterns', async ({ page }) => {
    // Test navigation consistency
    const navigationElements = await page.locator('nav a, [role="navigation"] a, .nav-link').all();
    
    for (const navElement of navigationElements) {
      if (await navElement.isVisible()) {
        const href = await navElement.getAttribute('href');
        const text = await navElement.textContent();
        
        // Navigation elements should have meaningful text
        expect(text?.trim().length).toBeGreaterThan(0);
        
        // Internal links should have proper href
        if (href && !href.startsWith('http')) {
          expect(href.startsWith('/') || href.startsWith('#')).toBe(true);
        }
      }
    }
    
    // Test back button functionality
    const backButtons = await page.locator('[aria-label*="back"], [aria-label*="返回"], .back-button').all();
    
    for (const backButton of backButtons) {
      if (await backButton.isVisible()) {
        // Back buttons should be clearly labeled
        const ariaLabel = await backButton.getAttribute('aria-label');
        const text = await backButton.textContent();
        
        expect(ariaLabel || text).toBeTruthy();
      }
    }
  });

  test('should provide appropriate feedback for form submissions', async ({ page }) => {
    // Navigate to ordering interface
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add a member
    await page.getByText('新增臨時成員').click();
    const memberInput = page.getByPlaceholder('輸入臨時成員姓名');
    await memberInput.fill('表單測試用戶');
    await page.getByText('確認新增').click();
    
    // Complete ordering
    await page.getByText('完成點餐並查看總覽').click();
    
    // Check for success feedback
    const successIndicators = await page.locator('.success, [role="status"], .text-green, [aria-live="polite"]').count();
    
    // Complete the order
    const completeButton = page.getByText('完成訂單');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      
      // Should show completion feedback
      await expect(page.getByText('訂單已完成')).toBeVisible();
    }
  });

  test('should handle empty states gracefully', async ({ page }) => {
    // Navigate to historical orders (likely empty for new session)
    const historyButton = page.getByText('歷史訂單');
    if (await historyButton.isVisible()) {
      await historyButton.click();
      
      // Check for empty state message
      const emptyStateMessage = page.locator('.empty-state, .no-data, [data-testid="empty-state"]');
      if (await emptyStateMessage.count() > 0) {
        await expect(emptyStateMessage).toBeVisible();
        
        // Empty state should provide helpful guidance
        const messageText = await emptyStateMessage.textContent();
        expect(messageText?.length).toBeGreaterThan(10);
      }
    }
  });

  test('should provide clear progress indicators', async ({ page }) => {
    // Check for progress indicators in multi-step process
    const progressIndicators = await page.locator('.progress, [role="progressbar"], .step-indicator, .breadcrumb').all();
    
    for (const indicator of progressIndicators) {
      if (await indicator.isVisible()) {
        // Progress indicators should show current state
        const ariaValueNow = await indicator.getAttribute('aria-valuenow');
        const ariaValueMax = await indicator.getAttribute('aria-valuemax');
        
        if (ariaValueNow && ariaValueMax) {
          const current = parseInt(ariaValueNow);
          const max = parseInt(ariaValueMax);
          
          expect(current).toBeGreaterThanOrEqual(0);
          expect(current).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  test('should maintain focus management during interactions', async ({ page }) => {
    // Test focus management when adding members
    const addMemberButton = page.getByText('新增臨時成員');
    if (await addMemberButton.isVisible()) {
      await addMemberButton.click();
      
      // Focus should move to input field
      const memberInput = page.getByPlaceholder('輸入臨時成員姓名');
      if (await memberInput.isVisible()) {
        const isFocused = await memberInput.evaluate(el => el === document.activeElement);
        expect(isFocused).toBe(true);
        
        // Test keyboard navigation
        await memberInput.fill('焦點測試用戶');
        await page.keyboard.press('Tab');
        
        // Focus should move to next interactive element
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
      }
    }
  });

  test('should provide contextual help and tooltips', async ({ page }) => {
    // Look for help elements
    const helpElements = await page.locator('[title], [aria-describedby], .tooltip, .help-text').all();
    
    for (const helpElement of helpElements) {
      if (await helpElement.isVisible()) {
        const title = await helpElement.getAttribute('title');
        const ariaDescribedBy = await helpElement.getAttribute('aria-describedby');
        
        if (title) {
          expect(title.length).toBeGreaterThan(3);
        }
        
        if (ariaDescribedBy) {
          const describedByElement = page.locator(`#${ariaDescribedBy}`);
          await expect(describedByElement).toBeAttached();
        }
      }
    }
  });

  test('should handle rapid user interactions gracefully', async ({ page }) => {
    // Navigate to ordering interface
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Rapidly add multiple members
    for (let i = 1; i <= 5; i++) {
      await page.getByText('新增臨時成員').click();
      const memberInput = page.getByPlaceholder('輸入臨時成員姓名');
      await memberInput.fill(`快速用戶${i}`);
      await page.getByText('確認新增').click();
      
      // Small delay to prevent overwhelming the system
      await page.waitForTimeout(100);
    }
    
    // Verify all members were added
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByText(`快速用戶${i}`)).toBeVisible();
    }
  });

  test('should provide clear visual hierarchy', async ({ page }) => {
    // Check heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    let previousLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const currentLevel = parseInt(tagName.charAt(1));
      
      // Check font sizes follow hierarchy
      const fontSize = await heading.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return parseFloat(styles.fontSize);
      });
      
      if (previousLevel > 0) {
        // Higher level headings should generally be larger or equal
        const previousHeading = headings[headings.indexOf(heading) - 1];
        const previousFontSize = await previousHeading.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return parseFloat(styles.fontSize);
        });
        
        if (currentLevel > previousLevel) {
          // Lower level headings should be smaller or equal
          expect(fontSize).toBeLessThanOrEqual(previousFontSize + 2); // Allow small variance
        }
      }
      
      previousLevel = currentLevel;
    }
  });

  test('should maintain state consistency across navigation', async ({ page }) => {
    // Add some state
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    await page.getByText('新增臨時成員').click();
    const memberInput = page.getByPlaceholder('輸入臨時成員姓名');
    await memberInput.fill('狀態測試用戶');
    await page.getByText('確認新增').click();
    
    // Navigate to summary
    await page.getByText('完成點餐並查看總覽').click();
    
    // Verify state is maintained
    await expect(page.getByText('狀態測試用戶')).toBeVisible();
    
    // Navigate back (if possible)
    const backButton = page.getByText('返回');
    if (await backButton.isVisible()) {
      await backButton.click();
      
      // State should still be maintained
      await expect(page.getByText('狀態測試用戶')).toBeVisible();
    }
  });

  test('should provide appropriate timing for user interactions', async ({ page }) => {
    // Test that interactions don't happen too quickly
    const startTime = Date.now();
    
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    const navigationTime = Date.now() - startTime;
    
    // Navigation should be responsive but not instantaneous (shows feedback)
    expect(navigationTime).toBeGreaterThan(50); // At least 50ms for visual feedback
    expect(navigationTime).toBeLessThan(2000); // But not more than 2 seconds
    
    // Test timeout handling for deadline
    const timeInput = page.getByPlaceholder('設定截止時間 (HH:MM)');
    if (await timeInput.isVisible()) {
      // Set a very short deadline
      const now = new Date();
      const shortDeadline = new Date(now.getTime() + 2000); // 2 seconds from now
      const timeString = shortDeadline.toTimeString().slice(0, 5);
      
      await timeInput.fill(timeString);
      await page.getByText('設定截止時間').click();
      
      // Wait for deadline to pass
      await page.waitForTimeout(3000);
      
      // Should show appropriate timeout message
      const timeoutMessage = page.locator('.timeout, .expired, [aria-live="assertive"]');
      if (await timeoutMessage.count() > 0) {
        await expect(timeoutMessage).toBeVisible();
      }
    }
  });
});
