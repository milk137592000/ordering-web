import { test, expect } from '@playwright/test';
import { PerformanceMonitor } from './utils/performance-monitor';
import {
  waitForPageWithFirebase,
  waitForFirebaseOperation,
  monitorFirebaseRequests,
  cleanupTestData
} from './utils/firebase-test-helpers';

test.describe('Firebase Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 使用改進的 Firebase 等待邏輯
    await waitForPageWithFirebase(page, '/', { timeout: 45000, retries: 3 });

    // 清理之前的測試數據
    await cleanupTestData(page);
  });

  test.afterEach(async ({ page }) => {
    // 測試後清理
    await cleanupTestData(page);
  });

  test('should measure Firebase initialization time', async ({ page }) => {
    const monitor = new PerformanceMonitor(page);

    // 使用改進的 Firebase 請求監控
    const requestMonitor = monitorFirebaseRequests(page);

    // 重新載入頁面以測量 Firebase 初始化
    const { duration: reloadTime } = await monitor.measureAction(async () => {
      await page.reload();
      await waitForPageWithFirebase(page, undefined, { timeout: 30000, retries: 2 });
    });

    console.log(`頁面重新載入和 Firebase 初始化時間: ${reloadTime}ms`);

    // 獲取 Firebase 請求統計
    const stats = requestMonitor.getStats();
    console.log('Firebase 請求統計:', stats);

    // Firebase 初始化應該在合理時間內完成
    expect(reloadTime).toBeLessThan(15000); // 15 seconds

    // 平均響應時間應該合理
    if (stats.total > 0) {
      expect(stats.avgResponseTime).toBeLessThan(3000); // 3 seconds average

      // 成功率應該很高
      const successRate = stats.successful / stats.total;
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate
    }
  });

  test('should measure real-time sync performance', async ({ page }) => {
    const monitor = new PerformanceMonitor(page);
    
    // Track Firestore operations
    const firestoreOps: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('firestore.googleapis.com')) {
        firestoreOps.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now(),
          type: request.url().includes(':listen') ? 'listen' : 
                request.url().includes(':commit') ? 'write' : 'read'
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('firestore.googleapis.com')) {
        const op = firestoreOps.find(op => 
          op.url === response.url() && !op.responseTime
        );
        if (op) {
          op.responseTime = Date.now() - op.timestamp;
          op.status = response.status();
        }
      }
    });
    
    // Perform actions that trigger Firestore operations
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add member (should trigger write operation)
    const { duration: addMemberTime } = await monitor.measureAction(async () => {
      await page.getByText('新增臨時成員').click();
      const tempMemberInput = page.getByPlaceholder('輸入臨時成員姓名');
      await tempMemberInput.fill('效能測試用戶');
      await page.getByText('確認新增').click();
      await page.waitForTimeout(1000); // Wait for sync
    });
    
    console.log(`Add member operation: ${addMemberTime}ms`);
    
    // Check Firestore operation performance
    const writeOps = firestoreOps.filter(op => op.type === 'write' && op.responseTime);
    const readOps = firestoreOps.filter(op => op.type === 'read' && op.responseTime);
    const listenOps = firestoreOps.filter(op => op.type === 'listen' && op.responseTime);
    
    console.log('Firestore operations:', {
      writes: writeOps.length,
      reads: readOps.length,
      listens: listenOps.length
    });
    
    // Write operations should complete within 2 seconds
    const slowWrites = writeOps.filter(op => op.responseTime > 2000);
    expect(slowWrites.length).toBe(0);
    
    // Read operations should complete within 1 second
    const slowReads = readOps.filter(op => op.responseTime > 1000);
    expect(slowReads.length).toBe(0);
  });

  test('should handle concurrent Firebase operations efficiently', async ({ page, context }) => {
    // Create multiple pages to simulate concurrent users
    const pages = [page];
    
    for (let i = 0; i < 3; i++) {
      const newPage = await context.newPage();
      await newPage.goto('/');
      await newPage.waitForLoadState('networkidle');
      pages.push(newPage);
    }
    
    const startTime = Date.now();
    
    // Simulate concurrent Firebase operations
    const promises = pages.map(async (p, index) => {
      await p.getByText('今天不用餐').click();
      await p.getByText('今天不訂飲料').click();
      
      // Each user adds a member
      await p.getByText('新增臨時成員').click();
      const tempMemberInput = p.getByPlaceholder('輸入臨時成員姓名');
      await tempMemberInput.fill(`並發用戶${index + 1}`);
      await p.getByText('確認新增').click();
      
      // Wait for Firebase sync
      await p.waitForTimeout(1000);
    });
    
    await Promise.all(promises);
    
    const totalTime = Date.now() - startTime;
    console.log(`Concurrent Firebase operations completed in ${totalTime}ms`);
    
    // Should handle concurrent operations within reasonable time
    expect(totalTime).toBeLessThan(15000);
    
    // Clean up
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  });

  test('should measure offline/online performance', async ({ page }) => {
    const monitor = new PerformanceMonitor(page);
    
    // Start with online state
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add member while online
    const { duration: onlineTime } = await monitor.measureAction(async () => {
      await page.getByText('新增臨時成員').click();
      const tempMemberInput = page.getByPlaceholder('輸入臨時成員姓名');
      await tempMemberInput.fill('線上用戶');
      await page.getByText('確認新增').click();
      await page.waitForTimeout(1000);
    });
    
    // Simulate offline state
    await page.context().setOffline(true);
    
    // Try to add member while offline
    const { duration: offlineTime } = await monitor.measureAction(async () => {
      await page.getByText('新增臨時成員').click();
      const tempMemberInput = page.getByPlaceholder('輸入臨時成員姓名');
      await tempMemberInput.fill('離線用戶');
      await page.getByText('確認新增').click();
      await page.waitForTimeout(1000);
    });
    
    // Go back online
    await page.context().setOffline(false);
    
    // Wait for sync
    await page.waitForTimeout(3000);
    
    console.log(`Online operation: ${onlineTime}ms, Offline operation: ${offlineTime}ms`);
    
    // Offline operations should still be responsive (cached locally)
    expect(offlineTime).toBeLessThan(5000);
    
    // Verify both users are visible after going back online
    await expect(page.getByText('線上用戶')).toBeVisible();
    await expect(page.getByText('離線用戶')).toBeVisible();
  });

  test('should measure large dataset performance', async ({ page }) => {
    const monitor = new PerformanceMonitor(page);
    
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add many members to test large dataset performance
    const memberCount = 30;
    const startTime = Date.now();
    
    for (let i = 1; i <= memberCount; i++) {
      await page.getByText('新增臨時成員').click();
      const tempMemberInput = page.getByPlaceholder('輸入臨時成員姓名');
      await tempMemberInput.fill(`大數據成員${i}`);
      await page.getByText('確認新增').click();
      
      // Check performance every 10 members
      if (i % 10 === 0) {
        const currentTime = Date.now() - startTime;
        console.log(`Added ${i} members in ${currentTime}ms`);
        
        // Should maintain reasonable performance
        expect(currentTime).toBeLessThan(i * 500); // 500ms per member max
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Added ${memberCount} members in ${totalTime}ms`);
    
    // Test navigation with large dataset
    const { duration: summaryTime } = await monitor.measureAction(async () => {
      await page.getByText('完成點餐並查看總覽').click();
      await page.waitForSelector('[data-testid="total-amount"]', { timeout: 10000 });
    });
    
    console.log(`Summary loaded with ${memberCount} members in ${summaryTime}ms`);
    
    // Summary should load within reasonable time even with large dataset
    expect(summaryTime).toBeLessThan(8000);
  });

  test('should measure Firebase query performance', async ({ page }) => {
    // Monitor Firestore query operations
    const queryOps: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('firestore.googleapis.com') && 
          request.url().includes(':runQuery')) {
        queryOps.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('firestore.googleapis.com') && 
          response.url().includes(':runQuery')) {
        const query = queryOps.find(q => q.url === response.url() && !q.responseTime);
        if (query) {
          query.responseTime = Date.now() - query.timestamp;
          query.status = response.status();
        }
      }
    });
    
    // Navigate to historical orders (should trigger queries)
    await page.getByText('歷史訂單').click();
    
    // Wait for queries to complete
    await page.waitForTimeout(3000);
    
    // Check query performance
    const completedQueries = queryOps.filter(q => q.responseTime);
    console.log('Firebase queries:', completedQueries);
    
    if (completedQueries.length > 0) {
      const avgQueryTime = completedQueries.reduce((sum, q) => sum + q.responseTime, 0) / completedQueries.length;
      console.log(`Average query time: ${avgQueryTime}ms`);
      
      // Queries should complete within reasonable time
      expect(avgQueryTime).toBeLessThan(2000);
      
      // No queries should take more than 5 seconds
      const slowQueries = completedQueries.filter(q => q.responseTime > 5000);
      expect(slowQueries.length).toBe(0);
    }
  });
});
