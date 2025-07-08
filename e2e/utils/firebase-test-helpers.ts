import { Page, expect } from '@playwright/test';

/**
 * Firebase 測試輔助工具
 * 提供更可靠的 Firebase 操作等待和驗證方法
 */

export interface FirebaseWaitOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: Required<FirebaseWaitOptions> = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 2000 // 2 seconds
};

/**
 * 等待 Firebase 初始化完成
 */
export async function waitForFirebaseInit(page: Page, options: FirebaseWaitOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      // 等待 Firebase 服務在 window 物件上可用
      await page.waitForFunction(
        () => {
          return window.firebaseServices && 
                 window.firebaseServices.db && 
                 typeof window.firebaseServices.setDoc === 'function';
        },
        { timeout: opts.timeout }
      );
      
      console.log(`Firebase 初始化成功 (嘗試 ${attempt}/${opts.retries})`);
      return;
    } catch (error) {
      console.warn(`Firebase 初始化失敗 (嘗試 ${attempt}/${opts.retries}):`, error);
      
      if (attempt === opts.retries) {
        throw new Error(`Firebase 初始化在 ${opts.retries} 次嘗試後失敗`);
      }
      
      // 等待後重試
      await page.waitForTimeout(opts.retryDelay);
    }
  }
}

/**
 * 等待 Firebase 連接狀態變為已連接
 */
export async function waitForFirebaseConnection(page: Page, options: FirebaseWaitOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 檢查連接狀態指示器是否顯示連接成功或完全不顯示（表示連接正常）
  await expect(async () => {
    const connectionStatus = page.locator('[data-testid="firebase-connection-status"]');
    const isVisible = await connectionStatus.isVisible();

    if (isVisible) {
      // 如果狀態指示器可見，檢查是否顯示連接成功
      const statusText = await connectionStatus.textContent();
      if (!statusText?.includes('連接正常') && !statusText?.includes('✓')) {
        throw new Error(`Firebase 連接狀態不正常: ${statusText}`);
      }
    }
    // 如果狀態指示器不可見，表示連接正常
  }).toPass({ timeout: opts.timeout });
}

/**
 * 等待 Firebase 模擬器連接
 */
export async function waitForEmulatorConnection(page: Page, options: FirebaseWaitOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log('🧪 驗證 Firebase 模擬器連接...');

  // 檢查模擬器是否可用
  const emulatorAvailable = await page.evaluate(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8080');
      return response.ok || response.status === 404;
    } catch (error) {
      return false;
    }
  });

  if (!emulatorAvailable) {
    throw new Error('Firebase 模擬器不可用，請確保模擬器正在運行');
  }

  // 驗證 Firebase 服務已連接到模擬器
  await expect(async () => {
    const isConnectedToEmulator = await page.evaluate(() => {
      // 檢查是否有模擬器相關的控制台日誌或配置
      return window.location.search.includes('emulator=true') &&
             window.firebaseServices &&
             window.firebaseServices.db;
    });

    if (!isConnectedToEmulator) {
      throw new Error('Firebase 服務未連接到模擬器');
    }
  }).toPass({ timeout: opts.timeout });

  console.log('✅ Firebase 模擬器連接驗證成功');
}

/**
 * 等待 Firebase 操作完成
 */
export async function waitForFirebaseOperation(
  page: Page, 
  operation: () => Promise<void>,
  options: FirebaseWaitOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      await operation();
      
      // 等待一小段時間確保操作完成
      await page.waitForTimeout(500);
      
      // 檢查是否有錯誤訊息
      const errorMessage = page.locator('.error-message, [data-testid="error-message"]');
      const hasError = await errorMessage.isVisible();
      
      if (hasError) {
        const errorText = await errorMessage.textContent();
        throw new Error(`Firebase 操作錯誤: ${errorText}`);
      }
      
      console.log(`Firebase 操作成功 (嘗試 ${attempt}/${opts.retries})`);
      return;
    } catch (error) {
      console.warn(`Firebase 操作失敗 (嘗試 ${attempt}/${opts.retries}):`, error);
      
      if (attempt === opts.retries) {
        throw error;
      }
      
      // 等待後重試
      await page.waitForTimeout(opts.retryDelay);
    }
  }
}

/**
 * 等待頁面載入並確保 Firebase 準備就緒
 */
export async function waitForPageWithFirebase(page: Page, url: string = '/', options: FirebaseWaitOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 檢查是否使用模擬器
  const isEmulatorTest = url.includes('emulator=true');
  if (isEmulatorTest) {
    console.log('🧪 使用 Firebase 模擬器進行測試');
  }

  // 導航到頁面
  await page.goto(url);

  // 等待網路空閒
  await page.waitForLoadState('networkidle', { timeout: opts.timeout });

  // 等待 Firebase 初始化
  await waitForFirebaseInit(page, options);

  // 如果使用模擬器，驗證模擬器連接
  if (isEmulatorTest) {
    await waitForEmulatorConnection(page, options);
  } else {
    // 等待 Firebase 連接
    await waitForFirebaseConnection(page, options);
  }
}

/**
 * 監控 Firebase 網路請求
 */
export function monitorFirebaseRequests(page: Page): {
  requests: any[];
  responses: any[];
  getStats: () => { total: number; successful: number; failed: number; avgResponseTime: number };
} {
  const requests: any[] = [];
  const responses: any[] = [];
  
  page.on('request', request => {
    if (isFirebaseRequest(request.url())) {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
        type: getFirebaseRequestType(request.url())
      });
    }
  });
  
  page.on('response', response => {
    if (isFirebaseRequest(response.url())) {
      const request = requests.find(req => 
        req.url === response.url() && !req.responseTime
      );
      if (request) {
        request.responseTime = Date.now() - request.timestamp;
        request.status = response.status();
        responses.push(request);
      }
    }
  });
  
  const getStats = () => {
    const total = responses.length;
    const successful = responses.filter(r => r.status < 400).length;
    const failed = total - successful;
    const avgResponseTime = total > 0 
      ? responses.reduce((sum, r) => sum + (r.responseTime || 0), 0) / total 
      : 0;
    
    return { total, successful, failed, avgResponseTime };
  };
  
  return { requests, responses, getStats };
}

/**
 * 檢查是否為 Firebase 請求
 */
function isFirebaseRequest(url: string): boolean {
  return url.includes('firebase') || 
         url.includes('firestore') || 
         url.includes('googleapis.com');
}

/**
 * 獲取 Firebase 請求類型
 */
function getFirebaseRequestType(url: string): string {
  if (url.includes(':listen')) return 'listen';
  if (url.includes(':commit')) return 'write';
  if (url.includes(':runQuery')) return 'query';
  if (url.includes(':batchGet')) return 'read';
  return 'other';
}

/**
 * 清理測試數據
 */
export async function cleanupTestData(page: Page, sessionId: string = 'active_session'): Promise<void> {
  try {
    await page.evaluate(async (sessionId) => {
      const { db, doc, setDoc } = (window as any).firebaseServices;
      if (db && doc && setDoc) {
        // 清空當前會話
        await setDoc(doc(db, 'sessions', sessionId), {});
      }
    }, sessionId);
  } catch (error) {
    console.warn('清理測試數據失敗:', error);
  }
}

/**
 * 設置測試數據
 */
export async function setupTestData(page: Page, data: any, sessionId: string = 'active_session'): Promise<void> {
  await page.evaluate(async ({ data, sessionId }) => {
    const { db, doc, setDoc } = (window as any).firebaseServices;
    if (db && doc && setDoc) {
      await setDoc(doc(db, 'sessions', sessionId), data);
    }
  }, { data, sessionId });
}
