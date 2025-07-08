import { chromium, FullConfig } from '@playwright/test';

/**
 * 穩定性測試全局設置
 * 確保測試環境的一致性和可靠性
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 開始穩定性測試全局設置...');
  
  try {
    // 等待開發服務器啟動
    await waitForDevServer();
    
    // 預熱應用程式
    await warmupApplication();
    
    // 設置測試環境
    await setupTestEnvironment();
    
    console.log('✅ 穩定性測試全局設置完成');
  } catch (error) {
    console.error('❌ 穩定性測試全局設置失敗:', error);
    throw error;
  }
}

/**
 * 等待開發服務器啟動
 */
async function waitForDevServer(maxRetries = 60, retryDelay = 2000): Promise<void> {
  console.log('⏳ 等待開發服務器啟動...');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:5173');
      if (response.ok) {
        console.log('✅ 開發服務器已啟動');
        return;
      }
    } catch (error) {
      // 服務器還未啟動，繼續等待
    }
    
    if (i % 10 === 0) {
      console.log(`⏳ 等待開發服務器啟動... (${i + 1}/${maxRetries})`);
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  
  throw new Error('開發服務器啟動超時');
}

/**
 * 預熱應用程式
 */
async function warmupApplication(): Promise<void> {
  console.log('🔥 預熱應用程式...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // 載入主頁面
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // 等待 React 載入
    await page.waitForFunction(() => {
      return window.React !== undefined && document.readyState === 'complete';
    }, { timeout: 30000 });
    
    // 預載入關鍵資源
    await page.evaluate(() => {
      // 觸發字體載入
      document.fonts.ready;
      
      // 預載入圖片
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.src) {
          const preloadImg = new Image();
          preloadImg.src = img.src;
        }
      });
    });
    
    // 等待一段時間確保所有資源載入
    await page.waitForTimeout(3000);
    
    console.log('✅ 應用程式預熱完成');
  } catch (error) {
    console.warn('⚠️ 應用程式預熱失敗，但繼續執行:', error);
  } finally {
    await browser.close();
  }
}

/**
 * 設置測試環境
 */
async function setupTestEnvironment(): Promise<void> {
  console.log('🛠️ 設置測試環境...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173');
    
    // 等待 Firebase 初始化
    await page.waitForFunction(() => {
      return window.firebaseServices && window.firebaseServices.db;
    }, { timeout: 30000 });
    
    // 清理任何現有的測試數據
    await page.evaluate(async () => {
      try {
        const { db, doc, setDoc } = (window as any).firebaseServices;
        if (db && doc && setDoc) {
          // 清理測試會話
          await setDoc(doc(db, 'sessions', 'active_session'), {});
          
          // 清理測試數據
          const testCollections = ['test_sessions', 'temp_data'];
          for (const collection of testCollections) {
            try {
              await setDoc(doc(db, collection, 'cleanup'), {});
            } catch (error) {
              console.warn(`清理 ${collection} 失敗:`, error);
            }
          }
        }
      } catch (error) {
        console.warn('清理測試數據失敗:', error);
      }
    });
    
    // 設置測試標記
    await page.evaluate(() => {
      window.testEnvironment = {
        isStabilityTest: true,
        setupTime: new Date().toISOString(),
        testId: `stable_${Date.now()}`
      };
    });
    
    console.log('✅ 測試環境設置完成');
  } catch (error) {
    console.warn('⚠️ 測試環境設置失敗，但繼續執行:', error);
  } finally {
    await browser.close();
  }
}

/**
 * 檢查系統資源
 */
async function checkSystemResources(): Promise<void> {
  console.log('📊 檢查系統資源...');
  
  try {
    // 檢查記憶體使用情況
    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    console.log(`💾 記憶體使用: ${memoryMB}MB`);
    
    if (memoryMB > 500) {
      console.warn('⚠️ 記憶體使用較高，可能影響測試穩定性');
    }
    
    // 檢查 CPU 負載（簡單檢查）
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endTime = Date.now();
    const actualDelay = endTime - startTime;
    
    if (actualDelay > 150) {
      console.warn('⚠️ 系統負載較高，可能影響測試時序');
    }
    
    console.log('✅ 系統資源檢查完成');
  } catch (error) {
    console.warn('⚠️ 系統資源檢查失敗:', error);
  }
}

export default globalSetup;
