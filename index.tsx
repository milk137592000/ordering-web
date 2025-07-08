
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

console.log('📦 index.tsx 開始執行');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ 找不到 root 元素');
  throw new Error("Could not find root element to mount to");
}

console.log('✅ 找到 root 元素');

const root = ReactDOM.createRoot(rootElement);

// 載入狀態組件
const LoadingApp: React.FC = () => {
  const [status, setStatus] = useState('正在初始化...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setStatus('正在載入 Firebase...');
        setProgress(25);

        // 等待 Firebase 初始化
        let retries = 0;
        const maxRetries = 30;

        while (retries < maxRetries) {
          const services = (window as any).firebaseServices;
          if (services && services.db) {
            console.log('✅ Firebase 服務已就緒');
            setStatus('Firebase 連接成功');
            setProgress(50);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (retries >= maxRetries) {
          console.warn('⚠️ Firebase 初始化超時，使用降級模式');
          setStatus('Firebase 連接超時，使用離線模式');
        }

        setStatus('正在載入主應用...');
        setProgress(75);

        // 動態載入 App 組件
        const { default: App } = await import('./App');
        console.log('✅ App 組件載入成功');

        setStatus('載入完成');
        setProgress(100);

        // 渲染主應用
        setTimeout(() => {
          root.render(
            <React.StrictMode>
              <App />
            </React.StrictMode>
          );
          console.log('✅ 主應用渲染完成');
        }, 500);

      } catch (error) {
        console.error('❌ 應用初始化失敗:', error);
        setStatus(`載入失敗: ${error.message}`);
        setProgress(0);
      }
    };

    initializeApp();
  }, []);

  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ color: '#333', marginBottom: '30px' }}>🍜 丁二烯C班點餐系統</h1>

      <div style={{
        padding: '30px',
        backgroundColor: 'white',
        borderRadius: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#3498db',
              transition: 'width 0.3s ease'
            }}></div>
          </div>
          <p style={{ margin: '10px 0', color: '#666' }}>{progress}%</p>
        </div>

        <p style={{ color: '#333', fontSize: '16px' }}>{status}</p>

        {status.includes('失敗') && (
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            重新載入
          </button>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
        <p>時間: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

// 渲染載入應用
console.log('🎨 渲染載入應用');
try {
  root.render(
    <React.StrictMode>
      <LoadingApp />
    </React.StrictMode>
  );
  console.log('✅ 載入應用渲染完成');
} catch (error) {
  console.error('❌ 渲染失敗:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial;">
      <h1>❌ 渲染失敗</h1>
      <p>React 渲染時發生錯誤: ${error.message}</p>
      <button onclick="window.location.reload()">重新載入</button>
    </div>
  `;
}
