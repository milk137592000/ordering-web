import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load initial page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check for essential elements
    await expect(page.getByText('丁二烯C班點餐系統')).toBeVisible();
  });

  test('should handle large team sizes efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    // Skip to ordering interface quickly
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add many team members
    for (let i = 1; i <= 50; i++) {
      await page.getByText('新增臨時成員').click();
      const tempMemberInput = page.getByPlaceholder('輸入臨時成員姓名');
      await tempMemberInput.fill(`成員${i}`);
      await page.getByText('確認新增').click();
      
      // Check performance every 10 members
      if (i % 10 === 0) {
        const currentTime = Date.now() - startTime;
        // Should not take more than 10 seconds for 50 members
        expect(currentTime).toBeLessThan(10000);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Added 50 members in ${totalTime}ms`);
    
    // Verify all members are displayed
    await expect(page.getByText('成員50')).toBeVisible();
  });

  test('should handle rapid menu item additions efficiently', async ({ page }) => {
    // Setup minimal team
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add one member
    await page.getByText('新增臨時成員').click();
    const tempMemberInput = page.getByPlaceholder('輸入臨時成員姓名');
    await tempMemberInput.fill('測試用戶');
    await page.getByText('確認新增').click();
    
    // Select the member
    await page.getByText('測試用戶').click();
    
    const startTime = Date.now();
    
    // Rapidly add menu items (if available)
    const menuItems = page.locator('[data-testid="menu-item"]');
    const itemCount = await menuItems.count();
    
    if (itemCount > 0) {
      // Add first 10 items rapidly
      for (let i = 0; i < Math.min(10, itemCount); i++) {
        await menuItems.nth(i).click();
        
        // Check performance every 5 items
        if (i % 5 === 0) {
          const currentTime = Date.now() - startTime;
          expect(currentTime).toBeLessThan(5000);
        }
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Added menu items in ${totalTime}ms`);
  });

  test('should measure Firebase operation performance', async ({ page }) => {
    // Monitor network requests
    const firebaseRequests: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('firestore.googleapis.com') || 
          request.url().includes('firebase')) {
        firebaseRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('firestore.googleapis.com') || 
          response.url().includes('firebase')) {
        const request = firebaseRequests.find(req => req.url === response.url());
        if (request) {
          request.responseTime = Date.now() - request.timestamp;
        }
      }
    });
    
    // Perform actions that trigger Firebase operations
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add a member (should trigger Firebase save)
    await page.getByText('新增臨時成員').click();
    const tempMemberInput = page.getByPlaceholder('輸入臨時成員姓名');
    await tempMemberInput.fill('Firebase測試用戶');
    await page.getByText('確認新增').click();
    
    // Wait for Firebase operations to complete
    await page.waitForTimeout(2000);
    
    // Check Firebase response times
    const slowRequests = firebaseRequests.filter(req => req.responseTime > 2000);
    expect(slowRequests.length).toBe(0);
    
    console.log('Firebase requests:', firebaseRequests.map(req => 
      `${req.method} ${req.url} - ${req.responseTime}ms`
    ));
  });

  test('should handle memory usage efficiently during long sessions', async ({ page }) => {
    // Start performance monitoring
    await page.evaluate(() => {
      (window as any).performanceStart = performance.now();
      (window as any).memoryStart = (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Simulate a long ordering session
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add and remove members multiple times
    for (let cycle = 0; cycle < 5; cycle++) {
      // Add 10 members
      for (let i = 1; i <= 10; i++) {
        await page.getByText('新增臨時成員').click();
        const tempMemberInput = page.getByPlaceholder('輸入臨時成員姓名');
        await tempMemberInput.fill(`週期${cycle}_成員${i}`);
        await page.getByText('確認新增').click();
      }
      
      // Remove some members (if removal functionality exists)
      // This would test memory cleanup
      
      await page.waitForTimeout(500);
    }
    
    // Check memory usage
    const memoryInfo = await page.evaluate(() => {
      const now = performance.now();
      const memoryNow = (performance as any).memory?.usedJSHeapSize || 0;
      
      return {
        timeElapsed: now - (window as any).performanceStart,
        memoryUsed: memoryNow - (window as any).memoryStart,
        totalMemory: memoryNow
      };
    });
    
    console.log('Memory usage:', memoryInfo);
    
    // Memory usage should not exceed 50MB for this test
    expect(memoryInfo.memoryUsed).toBeLessThan(50 * 1024 * 1024);
  });

  test('should handle concurrent user simulation', async ({ page, context }) => {
    // Create multiple pages to simulate concurrent users
    const pages = [page];
    
    // Create 2 additional pages
    for (let i = 0; i < 2; i++) {
      const newPage = await context.newPage();
      await newPage.goto('/');
      await newPage.waitForLoadState('networkidle');
      pages.push(newPage);
    }
    
    const startTime = Date.now();
    
    // Simulate concurrent actions
    const promises = pages.map(async (p, index) => {
      // Each "user" performs different actions
      await p.getByText('今天不用餐').click();
      await p.getByText('今天不訂飲料').click();
      
      // Add a member
      await p.getByText('新增臨時成員').click();
      const tempMemberInput = p.getByPlaceholder('輸入臨時成員姓名');
      await tempMemberInput.fill(`並發用戶${index + 1}`);
      await p.getByText('確認新增').click();
      
      return p;
    });
    
    // Wait for all concurrent operations to complete
    await Promise.all(promises);
    
    const totalTime = Date.now() - startTime;
    console.log(`Concurrent operations completed in ${totalTime}ms`);
    
    // Should handle concurrent users within reasonable time
    expect(totalTime).toBeLessThan(10000);
    
    // Verify each page has its own state
    for (let i = 0; i < pages.length; i++) {
      await expect(pages[i].getByText(`並發用戶${i + 1}`)).toBeVisible();
    }
    
    // Clean up additional pages
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  });

  test('should measure page rendering performance', async ({ page }) => {
    // Navigate to page and measure rendering metrics
    await page.goto('/');
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        domInteractive: navigation.domInteractive - navigation.navigationStart,
        domComplete: navigation.domComplete - navigation.navigationStart
      };
    });
    
    console.log('Rendering metrics:', metrics);
    
    // Performance thresholds
    expect(metrics.domContentLoaded).toBeLessThan(1000); // 1 second
    expect(metrics.firstContentfulPaint).toBeLessThan(2000); // 2 seconds
    expect(metrics.domInteractive).toBeLessThan(1500); // 1.5 seconds
  });

  test('should handle large order summaries efficiently', async ({ page }) => {
    // Create a large order to test summary performance
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add many members with orders
    for (let i = 1; i <= 20; i++) {
      await page.getByText('新增臨時成員').click();
      const tempMemberInput = page.getByPlaceholder('輸入臨時成員姓名');
      await tempMemberInput.fill(`大訂單成員${i}`);
      await page.getByText('確認新增').click();
    }
    
    const startTime = Date.now();
    
    // Navigate to summary
    await page.getByText('完成點餐並查看總覽').click();
    
    // Wait for summary to load
    await page.waitForSelector('[data-testid="total-amount"]', { timeout: 10000 });
    
    const summaryLoadTime = Date.now() - startTime;
    console.log(`Summary loaded in ${summaryLoadTime}ms`);
    
    // Summary should load within 5 seconds even with large orders
    expect(summaryLoadTime).toBeLessThan(5000);
    
    // Verify summary is displayed correctly
    await expect(page.getByText('訂單總覽')).toBeVisible();
  });
});
