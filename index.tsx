
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
  console.log('🚀 開始初始化應用...');

  try {
    // 先顯示載入畫面
    root.render(
      <React.StrictMode>
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
          <h1>🍜 丁二烯C班點餐系統</h1>
          <p>正在載入中...</p>
          <div style={{ marginTop: '20px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
        </div>
      </React.StrictMode>
    );

    // 等待 Firebase 服務初始化，但設置較短的超時
    let retries = 0;
    const maxRetries = 30; // 3 秒最大等待時間

    console.log('⏳ 等待 Firebase 服務初始化...');
    while (retries < maxRetries) {
      const services = (window as any).firebaseServices;
      if (services && services.db) {
        console.log('✅ Firebase 服務已就緒，開始渲染應用');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;

      if (retries % 10 === 0) {
        console.log(`⏳ 等待中... (${retries}/${maxRetries})`);
      }
    }

    if (retries >= maxRetries) {
      console.warn('⚠️ Firebase 初始化超時，直接渲染應用');
    }

    // 渲染主應用
    console.log('🎨 渲染主應用...');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('✅ 應用渲染完成');

  } catch (error) {
    console.error('❌ 應用初始化失敗:', error);
    // 顯示錯誤信息
    root.render(
      <React.StrictMode>
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
          <h1>❌ 載入失敗</h1>
          <p>應用初始化時發生錯誤</p>
          <p style={{ color: 'red', fontSize: '14px' }}>{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            重新載入
          </button>
        </div>
      </React.StrictMode>
    );
  }
};

// 啟動應用
initializeApp();
