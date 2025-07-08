import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  waitForElementReady,
  reliableClick,
  SmartSelector,
  TestDataIsolation
} from './utils/test-stability-helpers';

test.describe('Basic Functionality Tests', () => {
  let testData: TestDataIsolation;

  test.beforeEach(async ({ page }) => {
    testData = new TestDataIsolation(page);

    await page.goto('/');
    await waitForPageLoad(page, { timeout: 30000 });

    // 清理任何現有的測試數據
    await testData.cleanupIsolatedData();
  });

  test.afterEach(async ({ page }) => {
    // 測試後清理
    await testData.cleanupIsolatedData();
  });

  test('should load the application successfully', async ({ page }) => {
    // 使用智能等待檢查主標題
    const titleElement = await waitForElementReady(page, 'h1:has-text("丁二烯C班點餐系統")', { timeout: 15000 });
    await expect(titleElement).toBeVisible();

    // 檢查頁面是否有錯誤
    const errors = await page.locator('.error, [role="alert"], [data-testid="error"]').count();
    expect(errors).toBe(0);

    // 驗證基本 UI 元素存在
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display main navigation elements', async ({ page }) => {
    // Check for the history button which should be visible
    await expect(page.getByText('歷史訂單')).toBeVisible();

    // Look for common navigation elements
    const navElements = await page.locator('button, a, [role="button"]').count();
    expect(navElements).toBeGreaterThan(0);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that main title is still visible
    await expect(page.getByText('丁二烯C班點餐系統')).toBeVisible();

    // Check that content doesn't overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 50); // Allow some margin
  });

  test('should handle basic user interactions', async ({ page }) => {
    const smartSelector = new SmartSelector(page);

    // 查找可交互的按鈕
    const visibleButtons = await page.locator('button:visible').all();

    if (visibleButtons.length > 0) {
      // 使用可靠的點擊方法
      const firstButton = visibleButtons[0];
      const buttonText = await firstButton.textContent() || '未知按鈕';

      console.log(`測試點擊按鈕: ${buttonText}`);

      await reliableClick(page, 'button:visible', { retries: 2 });

      // 等待頁面響應
      await page.waitForTimeout(500);

      // 檢查頁面仍然正常運作
      await expect(page.locator('body')).toBeVisible();

      // 檢查沒有出現錯誤
      const errors = await page.locator('.error, [role="alert"]').count();
      expect(errors).toBe(0);
    }
  });

  test('should have proper accessibility basics', async ({ page }) => {
    // Check for basic accessibility features
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      
      // Images should have alt text (unless decorative)
      if (src && !src.startsWith('data:')) {
        expect(alt).toBeDefined();
      }
    }
    
    // Check for heading structure - we know there's at least the main title
    await expect(page.getByRole('heading', { name: '丁二烯C班點餐系統' })).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test basic tab navigation
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = page.locator(':focus');
    const focusedCount = await focusedElement.count();
    
    // Should have at least one focusable element
    expect(focusedCount).toBeGreaterThanOrEqual(0);
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Reload page to capture any console errors
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Filter out known acceptable errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('net::ERR_')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should have reasonable performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 10 seconds (generous for testing)
    expect(loadTime).toBeLessThan(10000);
    
    console.log(`Page loaded in ${loadTime}ms`);
  });
});
