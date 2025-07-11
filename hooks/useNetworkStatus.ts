import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: 'unknown'
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setNetworkStatus({
        isOnline: navigator.onLine,
        isSlowConnection: connection ? connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' : false,
        connectionType: connection ? connection.effectiveType || 'unknown' : 'unknown'
      });
    };

    const handleOnline = () => {
      console.log('🌐 網路已連接');
      updateNetworkStatus();
    };

    const handleOffline = () => {
      console.log('📵 網路已斷線');
      updateNetworkStatus();
    };

    const handleConnectionChange = () => {
      console.log('🔄 網路狀態變更');
      updateNetworkStatus();
    };

    // 初始化
    updateNetworkStatus();

    // 監聽網路狀態變化
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 監聽連接類型變化（如果支援）
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
};
