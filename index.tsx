
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// 等待 Firebase 初始化完成再渲染應用
const initializeApp = async () => {
  try {
    // 等待 Firebase 服務初始化
    let retries = 0;
    const maxRetries = 50; // 5 秒最大等待時間

    while (retries < maxRetries) {
      const services = (window as any).firebaseServices;
      if (services && services.db) {
        console.log('✅ Firebase 服務已就緒，開始渲染應用');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (retries >= maxRetries) {
      console.warn('⚠️ Firebase 初始化超時，使用降級模式');
    }

    // 渲染應用
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('❌ 應用初始化失敗:', error);
    // 即使 Firebase 失敗，也嘗試渲染應用
    root.render(
      <React.StrictMode>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>應用載入中...</h1>
          <p>如果此頁面持續顯示，請重新整理頁面</p>
        </div>
      </React.StrictMode>
    );
  }
};

// 啟動應用
initializeApp();
