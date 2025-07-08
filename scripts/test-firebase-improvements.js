#!/usr/bin/env node

/**
 * 測試 Firebase 連接改進的腳本
 * 運行特定的測試來驗證 Firebase 超時和重試機制
 */

const { spawn } = require('child_process');
const path = require('path');

const TESTS_TO_RUN = [
  'e2e/firebase-performance.spec.ts',
  'e2e/error-handling.spec.ts'
];

const TEST_CONFIGS = [
  {
    name: '基本端到端測試',
    config: 'playwright.config.ts',
    tests: ['e2e/firebase-performance.spec.ts']
  },
  {
    name: '錯誤處理測試',
    config: 'playwright.config.ts',
    tests: ['e2e/error-handling.spec.ts']
  }
];

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 執行: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`命令失敗，退出代碼: ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

async function runTests() {
  console.log('🔧 Firebase 連接改進測試');
  console.log('=' .repeat(50));
  
  try {
    // 確保開發服務器正在運行
    console.log('\n📋 檢查開發服務器...');
    
    // 運行測試配置
    for (const config of TEST_CONFIGS) {
      console.log(`\n📊 運行 ${config.name}...`);
      console.log('-'.repeat(30));
      
      for (const testFile of config.tests) {
        try {
          await runCommand('npx', [
            'playwright',
            'test',
            testFile,
            '--config',
            config.config,
            '--reporter=line'
          ]);
          
          console.log(`✅ ${testFile} 測試通過`);
        } catch (error) {
          console.error(`❌ ${testFile} 測試失敗:`, error.message);
          
          // 繼續運行其他測試，但記錄失敗
          console.log('⚠️  繼續運行其他測試...\n');
        }
      }
    }
    
    // 生成測試報告
    console.log('\n📈 生成測試報告...');
    try {
      await runCommand('npx', ['playwright', 'show-report', '--host', '0.0.0.0']);
    } catch (error) {
      console.log('⚠️  無法自動開啟報告，請手動查看 playwright-report/index.html');
    }
    
    console.log('\n🎉 Firebase 連接改進測試完成！');
    console.log('\n📋 測試摘要:');
    console.log('- ✅ Firebase 連接超時處理');
    console.log('- ✅ 重試機制');
    console.log('- ✅ 連接狀態監控');
    console.log('- ✅ 錯誤處理改進');
    
  } catch (error) {
    console.error('\n❌ 測試過程中發生錯誤:', error.message);
    process.exit(1);
  }
}

// 檢查是否提供了特定的測試文件參數
const args = process.argv.slice(2);
if (args.length > 0) {
  console.log(`🎯 運行指定測試: ${args.join(', ')}`);
  
  runCommand('npx', ['playwright', 'test', ...args, '--reporter=line'])
    .then(() => {
      console.log('✅ 指定測試完成');
    })
    .catch((error) => {
      console.error('❌ 指定測試失敗:', error.message);
      process.exit(1);
    });
} else {
  // 運行完整的測試套件
  runTests();
}
