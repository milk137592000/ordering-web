import { chromium, FullConfig } from '@playwright/test';

/**
 * Firebase 模擬器全局設置
 * 在所有測試開始前運行
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 開始 Firebase 模擬器全局設置...');
  
  try {
    // 等待模擬器啟動
    await waitForEmulator();
    
    // 清理模擬器數據
    await clearEmulatorData();
    
    // 設置測試數據
    await setupTestData();
    
    console.log('✅ Firebase 模擬器全局設置完成');
  } catch (error) {
    console.error('❌ Firebase 模擬器全局設置失敗:', error);
    throw error;
  }
}

/**
 * 等待模擬器啟動
 */
async function waitForEmulator(maxRetries = 30, retryDelay = 2000): Promise<void> {
  console.log('⏳ 等待 Firebase 模擬器啟動...');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://127.0.0.1:8080');
      if (response.ok || response.status === 404) {
        console.log('✅ Firebase 模擬器已啟動');
        return;
      }
    } catch (error) {
      // 模擬器還未啟動，繼續等待
    }
    
    console.log(`⏳ 等待模擬器啟動... (${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  
  throw new Error('Firebase 模擬器啟動超時');
}

/**
 * 清理模擬器數據
 */
async function clearEmulatorData(): Promise<void> {
  console.log('🧹 清理模擬器數據...');
  
  try {
    const response = await fetch(
      'http://127.0.0.1:8080/emulator/v1/projects/demo-ordering-app/databases/(default)/documents',
      { method: 'DELETE' }
    );
    
    if (response.ok) {
      console.log('✅ 模擬器數據已清理');
    } else {
      console.warn('⚠️ 清理模擬器數據失敗，但繼續執行');
    }
  } catch (error) {
    console.warn('⚠️ 清理模擬器數據時發生錯誤:', error);
  }
}

/**
 * 設置測試數據
 */
async function setupTestData(): Promise<void> {
  console.log('📝 設置測試數據...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // 導航到應用程式並設置測試數據
    await page.goto('http://localhost:5173?emulator=true');
    
    // 等待 Firebase 初始化
    await page.waitForFunction(() => {
      return window.firebaseServices && window.firebaseServices.db;
    }, { timeout: 30000 });
    
    // 設置一些基礎測試數據
    await page.evaluate(async () => {
      const { db, doc, setDoc } = (window as any).firebaseServices;
      
      // 創建測試會話
      await setDoc(doc(db, 'sessions', 'test_session'), {
        phase: 'TEAM_SETUP',
        teamMembers: [],
        selectedRestaurant: null,
        selectedDrinkShop: null,
        memberOrders: {},
        deadline: null,
        isDeadlineReached: false,
        orderId: 'test_order_001',
        orderDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      
      // 創建測試歷史訂單
      await setDoc(doc(db, 'historical_orders', 'test_historical_001'), {
        orderId: 'test_historical_001',
        orderDate: new Date(Date.now() - 86400000).toISOString(), // 昨天
        teamMembers: ['測試用戶1', '測試用戶2'],
        memberOrders: {
          '測試用戶1': {
            restaurantItems: [{ name: '測試餐點', price: 100, quantity: 1 }],
            drinkItems: [{ name: '測試飲料', price: 50, quantity: 1 }],
            totalAmount: 150
          }
        },
        totalAmount: 150,
        restaurantName: '測試餐廳',
        drinkShopName: '測試飲料店'
      });
      
      // 更新訂單列表
      await setDoc(doc(db, 'history', 'order_list'), {
        orderIds: ['test_historical_001']
      });
    });
    
    console.log('✅ 測試數據設置完成');
  } catch (error) {
    console.error('❌ 設置測試數據失敗:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
