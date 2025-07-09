import React, { useState } from 'react';

interface OfflineModeNoticeProps {
  onRetry?: () => void;
}

const OfflineModeNotice: React.FC<OfflineModeNoticeProps> = ({ onRetry }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          title="顯示離線模式說明"
        >
          📱
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📱</span>
          <div>
            <h3 className="font-semibold text-blue-800">離線模式</h3>
            <p className="text-sm text-blue-600">系統正在離線模式下運行</p>
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-blue-400 hover:text-blue-600 text-lg"
          title="最小化"
        >
          ×
        </button>
      </div>
      
      <div className="mt-3 text-sm text-blue-700">
        <p className="mb-2">✅ 基本功能正常運作</p>
        <p className="mb-2">📝 數據會保存在本地</p>
        <p className="mb-3">🔄 網路恢復後會自動同步</p>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
          >
            重新連接
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineModeNotice;
