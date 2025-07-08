import { test, expect } from '@playwright/test';
import {
  waitForPageWithFirebase,
  waitForFirebaseOperation,
  cleanupTestData
} from './utils/firebase-test-helpers';

test.describe('Error Handling and Edge Cases', () => {
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

  test('should handle network errors gracefully', async ({ page }) => {
    // Setup team first
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    await nameInput.fill('測試用戶');
    await page.getByText('新增成員').click();
    
    // Simulate network failure
    await page.route('**/*', route => route.abort());
    
    // Try to start ordering
    await page.getByText('開始點餐').click();
    
    // Should show error message
    await expect(page.getByText('網路連線錯誤')).toBeVisible();
    
    // Restore network
    await page.unroute('**/*');
  });

  test('should validate team member input', async ({ page }) => {
    // Try to add empty member name
    await page.getByText('新增成員').click();
    
    // Should show validation error
    await expect(page.getByText('請輸入成員姓名')).toBeVisible();
    
    // Try to add duplicate member name
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    await nameInput.fill('張三');
    await page.getByText('新增成員').click();
    
    await nameInput.fill('張三');
    await page.getByText('新增成員').click();
    
    // Should show duplicate name error
    await expect(page.getByText('成員姓名已存在')).toBeVisible();
  });

  test('should handle deadline validation', async ({ page }) => {
    // Setup team and navigate to ordering
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    await nameInput.fill('測試用戶');
    await page.getByText('新增成員').click();
    await page.getByText('開始點餐').click();
    
    // Skip to ordering interface
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Try to set past deadline
    const timeInput = page.getByPlaceholder('設定截止時間 (HH:MM)');
    await timeInput.fill('00:00');
    await page.getByText('設定截止時間').click();
    
    // Should show validation error
    await expect(page.getByText('截止時間不能是過去的時間')).toBeVisible();
    
    // Try invalid time format
    await timeInput.fill('25:70');
    await page.getByText('設定截止時間').click();
    
    // Should show format error
    await expect(page.getByText('請輸入有效的時間格式')).toBeVisible();
  });

  test('should handle empty order submission', async ({ page }) => {
    // Setup team and navigate to ordering
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    await nameInput.fill('測試用戶');
    await page.getByText('新增成員').click();
    await page.getByText('開始點餐').click();
    
    // Skip to ordering interface
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Try to complete ordering without any items
    await page.getByText('完成點餐並查看總覽').click();
    
    // Should show warning or confirmation
    await expect(page.getByText('確定要提交空訂單嗎？')).toBeVisible();
  });

  test('should handle Firebase connection errors', async ({ page }) => {
    // Mock Firebase error by intercepting requests
    await page.route('**/firestore.googleapis.com/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    // Try to perform actions that require Firebase with proper error handling
    await waitForFirebaseOperation(page, async () => {
      const nameInput = page.getByPlaceholder('輸入成員姓名');
      await nameInput.fill('測試用戶');
      await page.getByText('新增成員').click();
    }, { timeout: 20000, retries: 1 }); // Reduced retries since we expect failure

    // Should show Firebase error message or connection status indicator
    await expect(async () => {
      const errorMessage = page.getByText('無法連線至即時同步服務');
      const connectionStatus = page.locator('[data-testid="firebase-connection-status"]');

      const hasErrorMessage = await errorMessage.isVisible();
      const hasConnectionError = await connectionStatus.isVisible();

      if (!hasErrorMessage && !hasConnectionError) {
        throw new Error('應該顯示 Firebase 錯誤訊息或連接狀態指示器');
      }
    }).toPass({ timeout: 15000 });
  });

  test('should handle large team sizes', async ({ page }) => {
    // Add many team members
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    
    for (let i = 1; i <= 20; i++) {
      await nameInput.fill(`成員${i}`);
      await page.getByText('新增成員').click();
    }
    
    // Should handle large team gracefully
    await expect(page.getByText('成員20')).toBeVisible();
    
    // Try to add more members (test limit if exists)
    for (let i = 21; i <= 25; i++) {
      await nameInput.fill(`成員${i}`);
      await page.getByText('新增成員').click();
    }
    
    // Should show limit warning if implemented
    const limitWarning = page.getByText('團隊成員數量已達上限');
    if (await limitWarning.isVisible()) {
      await expect(limitWarning).toBeVisible();
    }
  });

  test('should handle session timeout', async ({ page }) => {
    // Setup team and start ordering
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    await nameInput.fill('測試用戶');
    await page.getByText('新增成員').click();
    await page.getByText('開始點餐').click();
    
    // Skip to ordering interface
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Set a very short deadline to simulate timeout
    const timeInput = page.getByPlaceholder('設定截止時間 (HH:MM)');
    const now = new Date();
    const shortDeadline = new Date(now.getTime() + 1000); // 1 second from now
    const timeString = shortDeadline.toTimeString().slice(0, 5);
    await timeInput.fill(timeString);
    await page.getByText('設定截止時間').click();
    
    // Wait for deadline to pass
    await page.waitForTimeout(2000);
    
    // Should show deadline reached message
    await expect(page.getByText('訂餐時間已截止')).toBeVisible();
    
    // Ordering buttons should be disabled
    const finishButton = page.getByText('完成點餐並查看總覽');
    await expect(finishButton).toBeDisabled();
  });

  test('should handle browser refresh during ordering', async ({ page }) => {
    // Setup team and start ordering
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    await nameInput.fill('測試用戶');
    await page.getByText('新增成員').click();
    await page.getByText('開始點餐').click();
    
    // Skip to ordering interface
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add some items
    await page.getByText('測試用戶').click();
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should restore session state
    await expect(page.getByText('點餐介面')).toBeVisible();
    await expect(page.getByText('測試用戶')).toBeVisible();
  });
});
