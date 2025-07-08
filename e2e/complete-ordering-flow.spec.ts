import { test, expect } from '@playwright/test';
import {
  waitForPageLoad,
  waitForElementReady,
  reliableClick,
  reliableType,
  waitForText,
  SmartSelector,
  TestDataIsolation
} from './utils/test-stability-helpers';

test.describe('Complete Ordering Flow', () => {
  let testData: TestDataIsolation;

  test.beforeEach(async ({ page }) => {
    testData = new TestDataIsolation(page);

    // 導航到應用程式
    await page.goto('/');

    // 使用改進的頁面載入等待
    await waitForPageLoad(page, { timeout: 30000 });

    // 清理測試數據
    await testData.cleanupIsolatedData();
  });

  test.afterEach(async ({ page }) => {
    await testData.cleanupIsolatedData();
  });

  test('should complete full ordering flow from team setup to order completion', async ({ page }) => {
    const smartSelector = new SmartSelector(page);

    // Step 1: Team Setup
    await waitForText(page, '團隊設定', { timeout: 15000 });

    // 添加團隊成員 - 使用可靠的輸入方法
    const members = ['張三', '李四', '王五'];

    for (const member of members) {
      // 使用可靠的輸入和點擊
      await reliableType(page, 'input[placeholder*="輸入成員姓名"]', member);
      await reliableClick(page, 'button:has-text("新增成員")');

      // 驗證成員已添加
      await waitForText(page, member, { timeout: 10000 });
    }

    // 驗證所有成員都已添加
    for (const member of members) {
      await expect(page.getByText(member)).toBeVisible();
    }

    // 開始點餐
    await reliableClick(page, 'button:has-text("開始點餐")');
    
    // Step 2: Restaurant Selection
    await expect(page.getByText('選擇一間餐廳')).toBeVisible();
    
    // Wait for restaurants to load
    await page.waitForTimeout(2000);
    
    // Select first restaurant
    const firstRestaurant = page.locator('[data-testid="store-card"]').first();
    await firstRestaurant.click();
    
    // Step 3: Drink Shop Selection
    await expect(page.getByText('選擇一間飲料店')).toBeVisible();
    
    // Wait for drink shops to load
    await page.waitForTimeout(2000);
    
    // Select first drink shop
    const firstDrinkShop = page.locator('[data-testid="store-card"]').first();
    await firstDrinkShop.click();
    
    // Step 4: Ordering Interface
    await expect(page.getByText('點餐介面')).toBeVisible();
    
    // Set deadline
    const timeInput = page.getByPlaceholder('設定截止時間 (HH:MM)');
    const now = new Date();
    const futureTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
    const timeString = futureTime.toTimeString().slice(0, 5);
    await timeInput.fill(timeString);
    await page.getByText('設定截止時間').click();
    
    // Order for first member (張三)
    await page.getByText('張三').click();
    
    // Add restaurant item
    await page.getByText('餐點').click();
    await page.waitForTimeout(1000);
    const firstMenuItem = page.locator('[data-testid="menu-item"]').first();
    await firstMenuItem.click();
    
    // Add drink item
    await page.getByText('飲料').click();
    await page.waitForTimeout(1000);
    const firstDrinkItem = page.locator('[data-testid="menu-item"]').first();
    await firstDrinkItem.click();
    
    // Order for second member (李四)
    await page.getByText('李四').click();
    
    // Add restaurant item
    await page.getByText('餐點').click();
    await page.waitForTimeout(1000);
    const secondMenuItem = page.locator('[data-testid="menu-item"]').nth(1);
    await secondMenuItem.click();
    
    // Verify order summary is updating
    await expect(page.getByText('即時訂單總覽')).toBeVisible();
    
    // Step 5: Complete ordering and view summary
    await page.getByText('完成點餐並查看總覽').click();
    
    // Step 6: Summary Display
    await expect(page.getByText('訂單總覽')).toBeVisible();
    
    // Verify all members and their orders are displayed
    await expect(page.getByText('張三')).toBeVisible();
    await expect(page.getByText('李四')).toBeVisible();
    
    // Verify total amount is calculated
    await expect(page.locator('[data-testid="total-amount"]')).toBeVisible();
    
    // Complete the order
    await page.getByText('完成訂單').click();
    
    // Verify order completion
    await expect(page.getByText('訂單已完成並保存到歷史記錄！')).toBeVisible();
  });

  test('should handle navigation between phases correctly', async ({ page }) => {
    // Setup team
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    await nameInput.fill('測試用戶');
    await page.getByText('新增成員').click();
    await page.getByText('開始點餐').click();
    
    // Navigate to restaurant selection and back
    await expect(page.getByText('選擇一間餐廳')).toBeVisible();
    await page.getByText('返回').click();
    await expect(page.getByText('團隊設定')).toBeVisible();
    
    // Navigate forward again
    await page.getByText('開始點餐').click();
    await expect(page.getByText('選擇一間餐廳')).toBeVisible();
    
    // Skip restaurant
    await page.getByText('今天不用餐').click();
    await expect(page.getByText('選擇一間飲料店')).toBeVisible();
    
    // Go back to restaurant selection
    await page.getByText('返回').click();
    await expect(page.getByText('選擇一間餐廳')).toBeVisible();
  });

  test('should handle temporary member addition during ordering', async ({ page }) => {
    // Setup initial team
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    await nameInput.fill('張三');
    await page.getByText('新增成員').click();
    await page.getByText('開始點餐').click();
    
    // Skip restaurant and drink shop selection for faster test
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // Add temporary member during ordering
    await page.getByText('新增臨時成員').click();
    const tempMemberInput = page.getByPlaceholder('輸入臨時成員姓名');
    await tempMemberInput.fill('臨時成員');
    await page.getByText('確認新增').click();
    
    // Verify temporary member is added
    await expect(page.getByText('臨時成員')).toBeVisible();
  });
});
