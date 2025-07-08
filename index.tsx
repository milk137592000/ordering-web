
import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('📦 index.tsx 開始執行');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ 找不到 root 元素');
  throw new Error("Could not find root element to mount to");
}

console.log('✅ 找到 root 元素');

const root = ReactDOM.createRoot(rootElement);

// 先渲染一個簡單的測試頁面
console.log('🎨 渲染測試頁面');
try {
  root.render(
    <React.StrictMode>
      <div style={{
        padding: '20px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f0f0f0',
        minHeight: '100vh'
      }}>
        <h1 style={{ color: '#333' }}>🍜 丁二烯C班點餐系統</h1>
        <p style={{ color: '#666' }}>測試版本 - 如果您看到這個頁面，表示基本渲染正常</p>
        <div style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h2>系統狀態</h2>
          <p>✅ React 渲染正常</p>
          <p>✅ CSS 樣式正常</p>
          <p>⏳ 正在檢查 Firebase 連接...</p>

          <button
            onClick={() => {
              console.log('🔄 用戶點擊重新載入');
              window.location.reload();
            }}
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

        <div style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
          <p>如果您看到這個頁面，請告訴開發者基本渲染已經正常</p>
          <p>時間: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </React.StrictMode>
  );
  console.log('✅ 測試頁面渲染完成');
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
