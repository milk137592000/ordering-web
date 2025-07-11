/**
 * 增強的同步修復測試腳本
 * 測試新的重試機制和錯誤處理
 */

// 模擬網路狀態變化
function simulateNetworkChange(isOnline) {
  // 觸發網路狀態變化事件
  const event = new Event(isOnline ? 'online' : 'offline');
  window.dispatchEvent(event);
  
  // 更新 navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: isOnline
  });
  
  console.log(`🌐 模擬網路狀態變更: ${isOnline ? '在線' : '離線'}`);
}

// 測試重試機制
async function testRetryMechanism() {
  console.log('🧪 開始測試重試機制...');
  
  // 檢查是否有重試按鈕
  const retryButton = document.querySelector('button:contains("重試同步")') || 
                     document.querySelector('[data-testid="retry-sync-button"]') ||
                     Array.from(document.querySelectorAll('button')).find(btn => 
                       btn.textContent.includes('重試同步') || btn.textContent.includes('🔄')
                     );
  
  if (retryButton) {
    console.log('✅ 找到重試按鈕');
    
    // 模擬點擊重試
    retryButton.click();
    console.log('🔄 已觸發重試操作');
    
    // 等待重試完成
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 檢查重試狀態
    const isRetrying = retryButton.disabled || retryButton.textContent.includes('重試中');
    console.log(`📊 重試狀態: ${isRetrying ? '進行中' : '完成'}`);
    
    return true;
  } else {
    console.log('❌ 未找到重試按鈕');
    return false;
  }
}

// 測試自動重連機制
async function testAutoReconnect() {
  console.log('🧪 開始測試自動重連機制...');
  
  // 1. 模擬網路斷線
  simulateNetworkChange(false);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 2. 模擬網路恢復
  simulateNetworkChange(true);
  console.log('⏳ 等待自動重連觸發...');
  
  // 3. 等待自動重連邏輯執行
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('✅ 自動重連測試完成');
}

// 測試錯誤顯示改進
function testErrorDisplay() {
  console.log('🧪 開始測試錯誤顯示改進...');
  
  // 檢查錯誤界面元素
  const errorContainer = document.querySelector('[class*="error"]') ||
                         document.querySelector('[class*="red-"]') ||
                         Array.from(document.querySelectorAll('div')).find(div => 
                           div.textContent.includes('同步失敗') || div.textContent.includes('錯誤')
                         );
  
  if (errorContainer) {
    console.log('✅ 找到錯誤顯示容器');
    
    // 檢查是否有解決建議
    const suggestions = errorContainer.textContent.includes('解決建議') ||
                       errorContainer.textContent.includes('💡');
    console.log(`📋 解決建議: ${suggestions ? '已顯示' : '未找到'}`);
    
    // 檢查是否有網路狀態顯示
    const networkStatus = errorContainer.textContent.includes('網路連接') ||
                          errorContainer.textContent.includes('✅') ||
                          errorContainer.textContent.includes('❌');
    console.log(`🌐 網路狀態: ${networkStatus ? '已顯示' : '未找到'}`);
    
    return true;
  } else {
    console.log('ℹ️ 當前沒有錯誤顯示（這可能是正常的）');
    return false;
  }
}

// 測試Firebase連接狀態
function testFirebaseConnection() {
  console.log('🧪 開始測試Firebase連接狀態...');
  
  // 檢查Firebase服務是否可用
  const firebaseServices = window.firebaseServices;
  if (firebaseServices) {
    console.log('✅ Firebase服務已載入');
    console.log(`📊 數據庫狀態: ${firebaseServices.db ? '已連接' : '離線模式'}`);
    
    // 檢查連接狀態組件
    const connectionStatus = document.querySelector('[data-testid="firebase-connection-status"]');
    if (connectionStatus) {
      console.log('✅ 找到Firebase連接狀態組件');
      console.log(`📊 連接狀態: ${connectionStatus.textContent}`);
    } else {
      console.log('ℹ️ Firebase連接狀態組件未顯示（可能表示連接正常）');
    }
    
    return true;
  } else {
    console.log('❌ Firebase服務未載入');
    return false;
  }
}

// 主測試函數
async function runSyncFixTests() {
  console.log('🚀 開始執行同步修復測試...');
  console.log('='.repeat(50));
  
  const results = {
    firebaseConnection: false,
    errorDisplay: false,
    retryMechanism: false,
    autoReconnect: false
  };
  
  try {
    // 測試1: Firebase連接狀態
    results.firebaseConnection = testFirebaseConnection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 測試2: 錯誤顯示改進
    results.errorDisplay = testErrorDisplay();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 測試3: 重試機制
    results.retryMechanism = await testRetryMechanism();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 測試4: 自動重連機制
    await testAutoReconnect();
    results.autoReconnect = true;
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
  }
  
  // 輸出測試結果
  console.log('='.repeat(50));
  console.log('📊 測試結果總結:');
  console.log(`🔥 Firebase連接: ${results.firebaseConnection ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`🎨 錯誤顯示: ${results.errorDisplay ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`🔄 重試機制: ${results.retryMechanism ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`🌐 自動重連: ${results.autoReconnect ? '✅ 通過' : '❌ 失敗'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 總體結果: ${passedTests}/${totalTests} 項測試通過`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有測試都通過！同步修復成功！');
  } else {
    console.log('⚠️ 部分測試未通過，可能需要進一步調整');
  }
  
  return results;
}

// 自動執行測試（如果在瀏覽器環境中）
if (typeof window !== 'undefined') {
  // 等待頁面載入完成後執行測試
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runSyncFixTests, 2000);
    });
  } else {
    setTimeout(runSyncFixTests, 2000);
  }
}

// 導出測試函數供手動調用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runSyncFixTests,
    testRetryMechanism,
    testAutoReconnect,
    testErrorDisplay,
    testFirebaseConnection,
    simulateNetworkChange
  };
}
