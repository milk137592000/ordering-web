// 全新方法：Firebase 在 index.html 中初始化並掛載到 window。
// 這個檔案作為一個橋樑，讓這些服務可以透過標準的 ES6 模組導入方式被應用程式的其他部分使用，
// 而無需更改任何其他檔案。

// 型別斷言，告知 TypeScript 我們全域物件的結構。
interface FirebaseServices {
  db: any; // 理想情況下會導入真實型別，但此處 'any' 是安全的。
  doc: (...args: any[]) => any;
  setDoc: (...args: any[]) => Promise<void>;
  onSnapshot: (...args: any[]) => () => void; // 返回一個取消訂閱的函式
  getDoc: (...args: any[]) => Promise<any>;
}

// 連接狀態管理
interface ConnectionState {
  isConnected: boolean;
  lastError: string | null;
  retryCount: number;
  lastSuccessfulOperation: number;
}

let connectionState: ConnectionState = {
  isConnected: false,
  lastError: null,
  retryCount: 0,
  lastSuccessfulOperation: Date.now()
};

// 連接狀態監聽器
const connectionListeners: ((state: ConnectionState) => void)[] = [];

// 添加連接狀態監聽器
export const addConnectionListener = (listener: (state: ConnectionState) => void) => {
  connectionListeners.push(listener);
  return () => {
    const index = connectionListeners.indexOf(listener);
    if (index > -1) {
      connectionListeners.splice(index, 1);
    }
  };
};

// 通知連接狀態變更
const notifyConnectionChange = () => {
  connectionListeners.forEach(listener => listener({ ...connectionState }));
};

// 重試配置
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  timeoutMs: 15000 // 15 seconds
};

// 延遲函數
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 計算重試延遲（指數退避）
const getRetryDelay = (retryCount: number): number => {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, retryCount),
    RETRY_CONFIG.maxDelay
  );
  return delay + Math.random() * 1000; // 添加隨機抖動
};

// 超時包裝器
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = RETRY_CONFIG.timeoutMs): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`操作超時 (${timeoutMs}ms)`)), timeoutMs)
    )
  ]);
};

// 重試包裝器
const withRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string = '未知操作'
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const result = await withTimeout(operation());

      // 操作成功，更新連接狀態
      connectionState.isConnected = true;
      connectionState.lastError = null;
      connectionState.retryCount = 0;
      connectionState.lastSuccessfulOperation = Date.now();
      notifyConnectionChange();

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 更新連接狀態
      connectionState.isConnected = false;
      connectionState.lastError = lastError.message;
      connectionState.retryCount = attempt + 1;
      notifyConnectionChange();

      console.warn(`${operationName} 失敗 (嘗試 ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}):`, lastError.message);

      // 如果不是最後一次嘗試，等待後重試
      if (attempt < RETRY_CONFIG.maxRetries) {
        const retryDelay = getRetryDelay(attempt);
        console.log(`${retryDelay}ms 後重試...`);
        await delay(retryDelay);
      }
    }
  }

  // 所有重試都失敗了
  throw new Error(`${operationName} 在 ${RETRY_CONFIG.maxRetries + 1} 次嘗試後失敗: ${lastError.message}`);
};

const services = (window as any).firebaseServices as FirebaseServices;

if (!services || !services.db) {
  // 如果 index.html 中的初始化腳本失敗，這個錯誤會非常明顯。
  // 請確認您已在 index.html 中填入您自己的 firebaseConfig。
  throw new Error("在 window 物件上找不到 Firebase 服務。index.html 中的初始化可能已失敗。");
}

// 包裝 Firebase 服務以添加重試和超時功能
const wrappedSetDoc = async (...args: any[]): Promise<void> => {
  return withRetry(() => services.setDoc(...args), 'setDoc');
};

const wrappedGetDoc = async (...args: any[]): Promise<any> => {
  return withRetry(() => services.getDoc(...args), 'getDoc');
};

// onSnapshot 需要特殊處理，因為它是實時監聽器
const wrappedOnSnapshot = (...args: any[]): (() => void) => {
  const [docRef, callback, errorCallback] = args;

  const enhancedCallback = (snapshot: any) => {
    // 成功接收到數據，更新連接狀態
    connectionState.isConnected = true;
    connectionState.lastError = null;
    connectionState.lastSuccessfulOperation = Date.now();
    notifyConnectionChange();

    callback(snapshot);
  };

  const enhancedErrorCallback = (error: any) => {
    // 連接錯誤，更新狀態
    connectionState.isConnected = false;
    connectionState.lastError = error.message || String(error);
    notifyConnectionChange();

    console.error('Firebase onSnapshot 錯誤:', error);

    if (errorCallback) {
      errorCallback(error);
    }
  };

  return services.onSnapshot(docRef, enhancedCallback, enhancedErrorCallback);
};

export const { db, doc } = services;
export const setDoc = wrappedSetDoc;
export const getDoc = wrappedGetDoc;
export const onSnapshot = wrappedOnSnapshot;

// 導出連接狀態和工具函數
export const getConnectionState = () => ({ ...connectionState });
export const isFirebaseConnected = () => connectionState.isConnected;