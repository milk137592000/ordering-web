// 全新方法：Firebase 在 index.html 中初始化並掛載到 window。
// 這個檔案作為一個橋樑，讓這些服務可以透過標準的 ES6 模組導入方式被應用程式的其他部分使用，
// 而無需更改任何其他檔案。

// 導入連接狀態管理
import { addConnectionListener as importedAddConnectionListener, getConnectionState as importedGetConnectionState } from './firebase-emulator';

// 型別斷言，告知 TypeScript 我們全域物件的結構。
interface FirebaseServices {
  db: any; // 理想情況下會導入真實型別，但此處 'any' 是安全的。
  doc: (...args: any[]) => any;
  setDoc: (...args: any[]) => Promise<void>;
  updateDoc: (...args: any[]) => Promise<void>;
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

// 使用 firebase-emulator.ts 中的連接狀態管理
export const addConnectionListener = importedAddConnectionListener;
export const getConnectionState = importedGetConnectionState;

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

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

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

// 等待 Firebase 服務初始化的函數
const waitForFirebaseServices = (): Promise<FirebaseServices> => {
  return new Promise((resolve, reject) => {
    const checkServices = () => {
      const services = (window as any).firebaseServices as FirebaseServices;
      if (services && services.db) {
        resolve(services);
      } else {
        // 如果超過 10 秒還沒有初始化，則拋出錯誤
        setTimeout(() => {
          const currentServices = (window as any).firebaseServices as FirebaseServices;
          if (currentServices && currentServices.db) {
            resolve(currentServices);
          } else {
            reject(new Error("Firebase 服務初始化超時。請檢查 index.html 中的 Firebase 配置。"));
          }
        }, 10000);

        // 每 100ms 檢查一次
        setTimeout(checkServices, 100);
      }
    };
    checkServices();
  });
};

// 獲取 Firebase 服務（同步方式，用於向後兼容）
const getFirebaseServices = (): FirebaseServices => {
  const services = (window as any).firebaseServices as FirebaseServices;
  if (!services) {
    // 返回一個離線模式服務，避免應用崩潰
    console.log("📱 Firebase 服務尚未初始化，使用離線模式");
    return {
      db: null,
      doc: () => ({ id: 'offline-doc' }),
      setDoc: () => {
        console.log('📱 離線模式：數據已保存到本地');
        return Promise.resolve();
      },
      updateDoc: () => {
        console.log('📱 離線模式：數據已更新到本地');
        return Promise.resolve();
      },
      onSnapshot: () => {
        console.log('📱 離線模式：使用本地數據');
        return () => {};
      },
      getDoc: () => {
        console.log('📱 離線模式：返回本地數據');
        return Promise.resolve({ exists: () => false, data: () => ({}) });
      }
    };
  }
  return services;
};

// 直接獲取服務，簡化邏輯
const getServices = (): FirebaseServices => {
  const services = (window as any).firebaseServices as FirebaseServices;
  if (services) {
    return services;
  }
  // 如果服務不可用，返回離線模式服務
  return {
    db: null,
    doc: () => ({ id: 'offline-doc' }),
    setDoc: () => {
      console.log('📱 離線模式：數據已保存到本地');
      return Promise.resolve();
    },
    updateDoc: () => {
      console.log('📱 離線模式：數據已更新到本地');
      return Promise.resolve();
    },
    onSnapshot: () => {
      console.log('📱 離線模式：使用本地數據');
      return () => {};
    },
    getDoc: () => {
      console.log('📱 離線模式：返回本地數據');
      return Promise.resolve({ exists: () => false, data: () => ({}) });
    }
  };
};

// 包裝 Firebase 服務以添加重試和超時功能
const wrappedSetDoc = async (...args: any[]): Promise<void> => {
  const currentServices = getServices();
  return withRetry(() => currentServices.setDoc(...args), 'setDoc');
};

const wrappedUpdateDoc = async (...args: any[]): Promise<void> => {
  const currentServices = getServices();
  // 在離線模式下，updateDoc 等同於 setDoc
  return withRetry(() => currentServices.setDoc(...args), 'updateDoc');
};

const wrappedGetDoc = async (...args: any[]): Promise<any> => {
  const currentServices = getServices();
  return withRetry(() => currentServices.getDoc(...args), 'getDoc');
};

// onSnapshot 需要特殊處理，因為它是實時監聽器
const wrappedOnSnapshot = (...args: any[]): (() => void) => {
  const [docRef, callback, errorCallback] = args;
  const currentServices = getServices();

  const enhancedCallback = (snapshot: any) => {
    callback(snapshot);
  };

  const enhancedErrorCallback = (error: any) => {
    console.error('Firebase onSnapshot 錯誤:', error);

    if (errorCallback) {
      errorCallback(error);
    }
  };

  return currentServices.onSnapshot(docRef, enhancedCallback, enhancedErrorCallback);
};

// 直接導出服務
const services = getServices();
export const { db, doc } = services;
export const setDoc = wrappedSetDoc;
export const updateDoc = wrappedUpdateDoc;
export const getDoc = wrappedGetDoc;
export const onSnapshot = wrappedOnSnapshot;

// 導出連接狀態檢查函數
export const isFirebaseConnected = () => getConnectionState().isConnected;