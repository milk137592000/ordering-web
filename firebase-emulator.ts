/**
 * Firebase 模擬器配置
 * 用於測試環境中自動連接到 Firebase 模擬器
 */

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

// 更新連接狀態
const updateConnectionState = (isConnected: boolean, error: string | null) => {
  connectionState.isConnected = isConnected;
  connectionState.lastError = error;
  if (isConnected) {
    connectionState.retryCount = 0;
    connectionState.lastSuccessfulOperation = Date.now();
  }
  notifyConnectionChange();
};

// 獲取連接狀態
export const getConnectionState = () => ({ ...connectionState });

// 模擬器配置
export const EMULATOR_CONFIG = {
  firestore: {
    host: '127.0.0.1',
    port: 8080
  },
  ui: {
    host: '127.0.0.1',
    port: 4000
  }
};

// 檢查是否在測試環境中
export const isTestEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
         (window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1') &&
         (process.env.NODE_ENV === 'test' || 
          window.location.search.includes('emulator=true'));
};

// 檢查模擬器是否可用
export const isEmulatorAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}`);
    return response.ok || response.status === 404; // 404 也表示模擬器在運行
  } catch (error) {
    return false;
  }
};

// 獲取 Firebase 配置（根據環境選擇生產或模擬器）
export const getFirebaseConfig = async () => {
  const shouldUseEmulator = isTestEnvironment() && await isEmulatorAvailable();
  
  if (shouldUseEmulator) {
    console.log('🧪 使用 Firebase 模擬器進行測試');
    return {
      projectId: 'demo-ordering-app',
      apiKey: 'demo-key',
      authDomain: 'demo-ordering-app.firebaseapp.com',
      storageBucket: 'demo-ordering-app.appspot.com',
      messagingSenderId: '123456789',
      appId: 'demo-app-id',
      useEmulator: true
    };
  } else {
    console.log('🔥 使用生產 Firebase 服務');
    return {
      apiKey: "AIzaSyC1IElfl_hDvSFzABKvqzLaqTNiz4zCH84",
      authDomain: "ordering-app-aac96.firebaseapp.com",
      projectId: "ordering-app-aac96",
      storageBucket: "ordering-app-aac96.firebasestorage.app",
      messagingSenderId: "937885720861",
      appId: "1:937885720861:web:8559ab578c9687bcbb81f4",
      measurementId: "G-0VLZJHL7WR",
      useEmulator: false
    };
  }
};

// 初始化 Firebase 服務（支持模擬器）
export const initializeFirebaseServices = async () => {
  const config = await getFirebaseConfig();

  try {
    // 動態導入 Firebase 模組
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js");
    const { getFirestore, connectFirestoreEmulator, doc, setDoc, onSnapshot, getDoc } =
      await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");

    const app = initializeApp(config);
    const db = getFirestore(app);

    // 如果使用模擬器，連接到模擬器
    if (config.useEmulator) {
      try {
        connectFirestoreEmulator(db, EMULATOR_CONFIG.firestore.host, EMULATOR_CONFIG.firestore.port);
        console.log('✅ 已連接到 Firestore 模擬器');
      } catch (error) {
        // 如果已經連接過模擬器，會拋出錯誤，這是正常的
        console.log('ℹ️ Firestore 模擬器已連接');
      }
    } else {
      // 生產環境，嘗試連接但不強制要求成功
      console.log('🔥 正在初始化 Firestore 連接...');
      try {
        // 簡單的連接測試，但不要求必須成功
        const testDoc = doc(db, 'sessions', 'test');
        await Promise.race([
          getDoc(testDoc),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('連接超時')), 5000)
          )
        ]);
        console.log('✅ Firestore 連接測試成功');
        updateConnectionState(true, null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('⚠️ Firestore 連接測試失敗，但應用將繼續運行:', errorMessage);
        // 設置為已連接但有警告，讓應用正常運行
        updateConnectionState(true, `連接警告: ${errorMessage}`);
      }
    }

    return { db, doc, setDoc, onSnapshot, getDoc };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Firebase 初始化失敗:", errorMessage);
    updateConnectionState(false, `初始化失敗: ${errorMessage}`);

    // 返回模擬服務以防止應用程式崩潰
    return {
      db: null,
      doc: () => {},
      setDoc: () => Promise.reject("Firebase not initialized"),
      onSnapshot: () => {
        console.error("onSnapshot failed: Firebase not initialized");
        return () => {};
      },
      getDoc: () => Promise.reject("Firebase not initialized")
    };
  }
};

// 模擬器管理工具
export class EmulatorManager {
  private static instance: EmulatorManager;
  private isRunning = false;
  
  static getInstance(): EmulatorManager {
    if (!EmulatorManager.instance) {
      EmulatorManager.instance = new EmulatorManager();
    }
    return EmulatorManager.instance;
  }
  
  async start(): Promise<boolean> {
    if (this.isRunning) {
      return true;
    }
    
    try {
      // 檢查模擬器是否已經在運行
      const isAvailable = await isEmulatorAvailable();
      if (isAvailable) {
        this.isRunning = true;
        console.log('✅ Firebase 模擬器已在運行');
        return true;
      }
      
      console.log('⚠️ Firebase 模擬器未運行，請手動啟動：firebase emulators:start');
      return false;
    } catch (error) {
      console.error('❌ 檢查模擬器狀態失敗:', error);
      return false;
    }
  }
  
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 模擬器管理器已停止');
  }
  
  isEmulatorRunning(): boolean {
    return this.isRunning;
  }
  
  async clearData(): Promise<void> {
    if (!this.isRunning) {
      console.warn('⚠️ 模擬器未運行，無法清理數據');
      return;
    }
    
    try {
      // 清理模擬器數據的 API 調用
      const response = await fetch(
        `http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}/emulator/v1/projects/demo-ordering-app/databases/(default)/documents`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        console.log('🧹 模擬器數據已清理');
      } else {
        console.warn('⚠️ 清理模擬器數據失敗');
      }
    } catch (error) {
      console.error('❌ 清理模擬器數據時發生錯誤:', error);
    }
  }
}
