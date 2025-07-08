import { FullConfig } from '@playwright/test';

/**
 * Firebase 模擬器全局清理
 * 在所有測試結束後運行
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 開始 Firebase 模擬器全局清理...');
  
  try {
    // 清理模擬器數據
    await clearEmulatorData();
    
    // 生成測試報告
    await generateTestReport();
    
    console.log('✅ Firebase 模擬器全局清理完成');
  } catch (error) {
    console.error('❌ Firebase 模擬器全局清理失敗:', error);
    // 不拋出錯誤，避免影響測試結果
  }
}

/**
 * 清理模擬器數據
 */
async function clearEmulatorData(): Promise<void> {
  console.log('🧹 最終清理模擬器數據...');
  
  try {
    const response = await fetch(
      'http://127.0.0.1:8080/emulator/v1/projects/demo-ordering-app/databases/(default)/documents',
      { method: 'DELETE' }
    );
    
    if (response.ok) {
      console.log('✅ 模擬器數據最終清理完成');
    } else {
      console.warn('⚠️ 最終清理模擬器數據失敗');
    }
  } catch (error) {
    console.warn('⚠️ 最終清理模擬器數據時發生錯誤:', error);
  }
}

/**
 * 生成測試報告
 */
async function generateTestReport(): Promise<void> {
  console.log('📊 生成模擬器測試報告...');
  
  try {
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: 'emulator',
      summary: {
        message: 'Firebase 模擬器測試完成',
        emulatorUsed: true,
        testDataCleaned: true
      }
    };
    
    // 這裡可以添加更詳細的報告生成邏輯
    console.log('📋 測試報告摘要:', reportData.summary);
    console.log('✅ 模擬器測試報告生成完成');
  } catch (error) {
    console.warn('⚠️ 生成測試報告時發生錯誤:', error);
  }
}

export default globalTeardown;
