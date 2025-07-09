import React, { useState, useEffect } from 'react';
import { addConnectionListener, getConnectionState } from '../firebase';

interface ConnectionState {
  isConnected: boolean;
  lastError: string | null;
  retryCount: number;
  lastSuccessfulOperation: number;
}

const FirebaseConnectionStatus: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(getConnectionState());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = addConnectionListener(setConnectionState);
    return unsubscribe;
  }, []);

  // 如果連接正常且沒有錯誤，不顯示狀態指示器
  if (connectionState.isConnected && !connectionState.lastError) {
    return null;
  }

  const getStatusColor = () => {
    if (connectionState.isConnected) return 'text-green-600 bg-green-50 border-green-200';
    if (connectionState.retryCount > 0) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusIcon = () => {
    if (connectionState.isConnected) return '✓';
    if (connectionState.retryCount > 0) return '⚠';
    return '✗';
  };

  const getStatusText = () => {
    if (connectionState.isConnected) return '連接正常';
    if (connectionState.retryCount > 0) return `重新連接中... (${connectionState.retryCount}/3)`;
    return '離線模式';
  };

  const formatLastSuccess = () => {
    const now = Date.now();
    const diff = now - connectionState.lastSuccessfulOperation;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) return `${minutes}分${seconds}秒前`;
    return `${seconds}秒前`;
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 border rounded-lg p-3 shadow-lg max-w-sm ${getStatusColor()}`}
      data-testid="firebase-connection-status"
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold">{getStatusIcon()}</span>
          <span className="font-medium">{getStatusText()}</span>
        </div>
        <button className="text-sm opacity-70 hover:opacity-100">
          {showDetails ? '▼' : '▶'}
        </button>
      </div>
      
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20 text-sm space-y-1">
          <div>
            <strong>連接狀態:</strong> {connectionState.isConnected ? '已連接' : '未連接'}
          </div>
          {connectionState.lastError && (
            <div>
              <strong>最後錯誤:</strong> {connectionState.lastError}
            </div>
          )}
          <div>
            <strong>重試次數:</strong> {connectionState.retryCount}
          </div>
          <div>
            <strong>最後成功:</strong> {formatLastSuccess()}
          </div>
          
          {!connectionState.isConnected && (
            <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
              <strong>離線模式說明:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>系統將使用本地儲存</li>
                <li>功能可能受限但基本操作正常</li>
                <li>網路恢復後會自動同步</li>
              </ul>
              <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                <strong>如需完整功能:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>檢查網路連接</li>
                  <li>重新整理頁面</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FirebaseConnectionStatus;
