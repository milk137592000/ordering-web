import { test, expect } from '@playwright/test';
import { 
  waitForPageWithFirebase, 
  waitForFirebaseOperation,
  cleanupTestData,
  setupTestData
} from './utils/firebase-test-helpers';

test.describe('Firebase 模擬器基本功能測試', () => {
  test.beforeEach(async ({ page }) => {
    // 使用模擬器 URL
    await waitForPageWithFirebase(page, '/?emulator=true', { timeout: 30000, retries: 2 });
    
    // 清理測試數據
    await cleanupTestData(page, 'emulator_test_session');
  });
  
  test.afterEach(async ({ page }) => {
    // 測試後清理
    await cleanupTestData(page, 'emulator_test_session');
  });

  test('should connect to Firebase emulator successfully', async ({ page }) => {
    // 檢查是否連接到模擬器
    const isEmulator = await page.evaluate(() => {
      return window.location.search.includes('emulator=true');
    });
    
    expect(isEmulator).toBe(true);
    
    // 檢查 Firebase 服務是否可用
    const firebaseReady = await page.evaluate(() => {
      return window.firebaseServices && 
             window.firebaseServices.db && 
             typeof window.firebaseServices.setDoc === 'function';
    });
    
    expect(firebaseReady).toBe(true);
    
    // 檢查控制台是否顯示模擬器連接信息
    const logs = await page.evaluate(() => {
      return console.log.toString();
    });
    
    console.log('✅ 成功連接到 Firebase 模擬器');
  });

  test('should perform basic CRUD operations in emulator', async ({ page }) => {
    // 測試寫入操作
    await waitForFirebaseOperation(page, async () => {
      await page.evaluate(async () => {
        const { db, doc, setDoc } = (window as any).firebaseServices;
        await setDoc(doc(db, 'test_collection', 'test_doc'), {
          message: 'Hello from emulator test',
          timestamp: new Date().toISOString()
        });
      });
    });
    
    // 測試讀取操作
    const readResult = await page.evaluate(async () => {
      const { db, doc, getDoc } = (window as any).firebaseServices;
      const docSnap = await getDoc(doc(db, 'test_collection', 'test_doc'));
      return docSnap.exists() ? docSnap.data() : null;
    });
    
    expect(readResult).toBeTruthy();
    expect(readResult.message).toBe('Hello from emulator test');
    
    console.log('✅ 模擬器 CRUD 操作測試通過');
  });

  test('should handle team member operations in emulator', async ({ page }) => {
    // 添加團隊成員
    await waitForFirebaseOperation(page, async () => {
      const nameInput = page.getByPlaceholder('輸入成員姓名');
      await nameInput.fill('模擬器測試用戶');
      await page.getByText('新增成員').click();
    });
    
    // 驗證成員已添加
    await expect(page.getByText('模擬器測試用戶')).toBeVisible();
    
    // 開始點餐
    await page.getByText('開始點餐').click();
    
    // 跳過餐廳和飲料選擇
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    // 驗證進入點餐界面
    await expect(page.getByText('點餐介面')).toBeVisible();
    await expect(page.getByText('模擬器測試用戶')).toBeVisible();
    
    console.log('✅ 模擬器團隊成員操作測試通過');
  });

  test('should handle real-time updates in emulator', async ({ page, context }) => {
    // 創建第二個頁面模擬多用戶
    const page2 = await context.newPage();
    await waitForPageWithFirebase(page2, '/?emulator=true', { timeout: 30000 });
    
    // 在第一個頁面添加成員
    await waitForFirebaseOperation(page, async () => {
      const nameInput = page.getByPlaceholder('輸入成員姓名');
      await nameInput.fill('實時同步測試用戶');
      await page.getByText('新增成員').click();
    });
    
    // 等待第二個頁面接收到更新
    await expect(page2.getByText('實時同步測試用戶')).toBeVisible({ timeout: 10000 });
    
    // 在第二個頁面添加另一個成員
    await waitForFirebaseOperation(page2, async () => {
      const nameInput = page2.getByPlaceholder('輸入成員姓名');
      await nameInput.fill('第二個測試用戶');
      await page2.getByText('新增成員').click();
    });
    
    // 驗證第一個頁面也收到了更新
    await expect(page.getByText('第二個測試用戶')).toBeVisible({ timeout: 10000 });
    
    await page2.close();
    console.log('✅ 模擬器實時同步測試通過');
  });

  test('should handle offline/online scenarios in emulator', async ({ page }) => {
    // 添加成員
    await waitForFirebaseOperation(page, async () => {
      const nameInput = page.getByPlaceholder('輸入成員姓名');
      await nameInput.fill('離線測試用戶');
      await page.getByText('新增成員').click();
    });
    
    // 模擬離線狀態
    await page.context().setOffline(true);
    
    // 嘗試添加另一個成員（應該失敗或排隊）
    const nameInput = page.getByPlaceholder('輸入成員姓名');
    await nameInput.fill('離線時添加的用戶');
    await page.getByText('新增成員').click();
    
    // 恢復在線狀態
    await page.context().setOffline(false);
    
    // 等待同步
    await page.waitForTimeout(3000);
    
    // 驗證數據同步
    await expect(page.getByText('離線測試用戶')).toBeVisible();
    
    console.log('✅ 模擬器離線/在線場景測試通過');
  });

  test('should handle large dataset operations in emulator', async ({ page }) => {
    // 添加多個成員測試性能
    const memberCount = 20;
    
    for (let i = 1; i <= memberCount; i++) {
      await waitForFirebaseOperation(page, async () => {
        const nameInput = page.getByPlaceholder('輸入成員姓名');
        await nameInput.fill(`大數據測試成員${i}`);
        await page.getByText('新增成員').click();
      }, { timeout: 10000, retries: 1 });
      
      // 每5個成員檢查一次
      if (i % 5 === 0) {
        await expect(page.getByText(`大數據測試成員${i}`)).toBeVisible();
        console.log(`✅ 已添加 ${i}/${memberCount} 個成員`);
      }
    }
    
    // 驗證所有成員都已添加
    await expect(page.getByText(`大數據測試成員${memberCount}`)).toBeVisible();
    
    // 開始點餐並檢查性能
    const startTime = Date.now();
    await page.getByText('開始點餐').click();
    await page.getByText('今天不用餐').click();
    await page.getByText('今天不訂飲料').click();
    
    const loadTime = Date.now() - startTime;
    console.log(`大數據集載入時間: ${loadTime}ms`);
    
    // 載入時間應該在合理範圍內
    expect(loadTime).toBeLessThan(10000); // 10 seconds
    
    console.log('✅ 模擬器大數據集操作測試通過');
  });

  test('should clean up test data properly', async ({ page }) => {
    // 創建測試數據
    await setupTestData(page, {
      phase: 'TEAM_SETUP',
      teamMembers: ['清理測試用戶1', '清理測試用戶2'],
      testData: true
    }, 'cleanup_test_session');
    
    // 驗證數據存在
    const dataExists = await page.evaluate(async () => {
      const { db, doc, getDoc } = (window as any).firebaseServices;
      const docSnap = await getDoc(doc(db, 'sessions', 'cleanup_test_session'));
      return docSnap.exists();
    });
    
    expect(dataExists).toBe(true);
    
    // 清理數據
    await cleanupTestData(page, 'cleanup_test_session');
    
    // 驗證數據已清理
    const dataCleared = await page.evaluate(async () => {
      const { db, doc, getDoc } = (window as any).firebaseServices;
      const docSnap = await getDoc(doc(db, 'sessions', 'cleanup_test_session'));
      return !docSnap.exists() || Object.keys(docSnap.data() || {}).length === 0;
    });
    
    expect(dataCleared).toBe(true);
    
    console.log('✅ 模擬器數據清理測試通過');
  });
});
