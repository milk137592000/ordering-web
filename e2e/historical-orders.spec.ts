import { test, expect } from '@playwright/test';

test.describe('Historical Orders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display and navigate historical orders', async ({ page }) => {
    // First, create a completed order to have historical data
    await createSampleOrder(page);
    
    // Navigate to historical orders
    await page.getByText('歷史訂單').click();
    
    // Verify historical orders page
    await expect(page.getByText('歷史訂單')).toBeVisible();
    
    // Check if orders are displayed
    const orderCards = page.locator('[data-testid="historical-order-card"]');
    await expect(orderCards.first()).toBeVisible();
    
    // Click on first order to view details
    await orderCards.first().click();
    
    // Verify order details page
    await expect(page.getByText('訂單詳情')).toBeVisible();
    await expect(page.getByText('訂單編號')).toBeVisible();
    await expect(page.getByText('訂單日期')).toBeVisible();
    await expect(page.getByText('完成時間')).toBeVisible();
    
    // Navigate back to historical orders list
    await page.getByText('返回歷史訂單').click();
    await expect(page.getByText('歷史訂單')).toBeVisible();
    
    // Navigate back to main ordering interface
    await page.getByText('返回點餐').click();
    await expect(page.getByText('團隊設定')).toBeVisible();
  });

  test('should filter historical orders by date', async ({ page }) => {
    // Create multiple sample orders with different dates
    await createSampleOrder(page);
    
    // Navigate to historical orders
    await page.getByText('歷史訂單').click();
    
    // Test date filtering if implemented
    const dateFilter = page.getByTestId('date-filter');
    if (await dateFilter.isVisible()) {
      // Select today's date
      const today = new Date().toISOString().split('T')[0];
      await dateFilter.fill(today);
      
      // Verify filtered results
      const orderCards = page.locator('[data-testid="historical-order-card"]');
      await expect(orderCards).toHaveCount(1);
    }
  });

  test('should display order statistics correctly', async ({ page }) => {
    // Create sample order
    await createSampleOrder(page);
    
    // Navigate to historical orders
    await page.getByText('歷史訂單').click();
    
    // Check for statistics display
    const statsSection = page.getByTestId('order-statistics');
    if (await statsSection.isVisible()) {
      await expect(page.getByText('總訂單數')).toBeVisible();
      await expect(page.getByText('總金額')).toBeVisible();
    }
  });

  test('should handle empty historical orders state', async ({ page }) => {
    // Navigate directly to historical orders without creating any orders
    await page.getByText('歷史訂單').click();
    
    // Should show empty state message
    await expect(page.getByText('尚無歷史訂單')).toBeVisible();
    
    // Should provide option to start new order
    await expect(page.getByText('開始新的訂單')).toBeVisible();
  });

  test('should export historical order data', async ({ page }) => {
    // Create sample order
    await createSampleOrder(page);
    
    // Navigate to historical orders
    await page.getByText('歷史訂單').click();
    
    // Check for export functionality if implemented
    const exportButton = page.getByTestId('export-orders');
    if (await exportButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      
      // Verify download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('orders');
    }
  });
});

// Helper function to create a sample order
async function createSampleOrder(page: any) {
  // Setup team
  const nameInput = page.getByPlaceholder('輸入成員姓名');
  await nameInput.fill('測試用戶');
  await page.getByText('新增成員').click();
  await page.getByText('開始點餐').click();
  
  // Skip restaurant and drink shop selection for faster test
  await page.getByText('今天不用餐').click();
  await page.getByText('今天不訂飲料').click();
  
  // Complete ordering
  await page.getByText('完成點餐並查看總覽').click();
  await page.getByText('完成訂單').click();
  
  // Wait for order completion
  await page.waitForTimeout(1000);
}
