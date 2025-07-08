#!/usr/bin/env node

/**
 * Firebase 模擬器管理腳本
 * 提供啟動、停止、重置模擬器的功能
 */

const { spawn, exec } = require('child_process');
const path = require('path');

const EMULATOR_CONFIG = {
  firestore: {
    host: '127.0.0.1',
    port: 8080
  },
  ui: {
    host: '127.0.0.1',
    port: 4000
  }
};

class EmulatorManager {
  constructor() {
    this.emulatorProcess = null;
    this.isRunning = false;
  }

  async checkEmulatorStatus() {
    try {
      const response = await fetch(`http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}`);
      return response.ok || response.status === 404;
    } catch (error) {
      return false;
    }
  }

  async start(options = {}) {
    const { withUI = false, detached = false } = options;
    
    console.log('🚀 啟動 Firebase 模擬器...');
    
    // 檢查模擬器是否已經在運行
    const isAlreadyRunning = await this.checkEmulatorStatus();
    if (isAlreadyRunning) {
      console.log('✅ Firebase 模擬器已在運行');
      this.isRunning = true;
      return true;
    }

    const command = 'firebase';
    const args = ['emulators:start'];
    
    if (withUI) {
      args.push('--only', 'firestore,ui');
    } else {
      args.push('--only', 'firestore');
    }

    if (detached) {
      args.push('--detach');
    }

    return new Promise((resolve, reject) => {
      this.emulatorProcess = spawn(command, args, {
        stdio: detached ? 'ignore' : 'inherit',
        shell: true,
        detached: detached
      });

      if (detached && this.emulatorProcess.pid) {
        this.emulatorProcess.unref();
        console.log(`✅ Firebase 模擬器已在背景啟動 (PID: ${this.emulatorProcess.pid})`);
        this.isRunning = true;
        resolve(true);
        return;
      }

      this.emulatorProcess.on('spawn', () => {
        console.log('✅ Firebase 模擬器啟動成功');
        this.isRunning = true;
        resolve(true);
      });

      this.emulatorProcess.on('error', (error) => {
        console.error('❌ Firebase 模擬器啟動失敗:', error.message);
        this.isRunning = false;
        reject(error);
      });

      this.emulatorProcess.on('close', (code) => {
        console.log(`🛑 Firebase 模擬器已停止 (退出代碼: ${code})`);
        this.isRunning = false;
      });

      // 設置超時
      setTimeout(() => {
        if (!this.isRunning) {
          reject(new Error('模擬器啟動超時'));
        }
      }, 30000);
    });
  }

  async stop() {
    console.log('🛑 停止 Firebase 模擬器...');
    
    if (this.emulatorProcess) {
      this.emulatorProcess.kill('SIGTERM');
      this.emulatorProcess = null;
    }

    // 嘗試使用 Firebase CLI 停止
    return new Promise((resolve) => {
      exec('firebase emulators:stop', (error, stdout, stderr) => {
        if (error) {
          console.warn('⚠️ 使用 CLI 停止模擬器失敗:', error.message);
        } else {
          console.log('✅ Firebase 模擬器已停止');
        }
        this.isRunning = false;
        resolve();
      });
    });
  }

  async reset() {
    console.log('🔄 重置 Firebase 模擬器數據...');
    
    try {
      const response = await fetch(
        `http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}/emulator/v1/projects/demo-ordering-app/databases/(default)/documents`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        console.log('✅ 模擬器數據已重置');
        return true;
      } else {
        console.warn('⚠️ 重置模擬器數據失敗');
        return false;
      }
    } catch (error) {
      console.error('❌ 重置模擬器數據時發生錯誤:', error.message);
      return false;
    }
  }

  async status() {
    const isRunning = await this.checkEmulatorStatus();
    
    if (isRunning) {
      console.log('✅ Firebase 模擬器正在運行');
      console.log(`   Firestore: http://${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}`);
      console.log(`   UI: http://${EMULATOR_CONFIG.ui.host}:${EMULATOR_CONFIG.ui.port}`);
    } else {
      console.log('❌ Firebase 模擬器未運行');
    }
    
    return isRunning;
  }

  async runTests() {
    console.log('🧪 運行模擬器測試...');
    
    // 確保模擬器正在運行
    const isRunning = await this.checkEmulatorStatus();
    if (!isRunning) {
      console.log('⚠️ 模擬器未運行，正在啟動...');
      await this.start({ detached: true });
      
      // 等待模擬器完全啟動
      await this.waitForEmulator();
    }

    // 運行測試
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npx', ['playwright', 'test', '--config=playwright-emulator.config.ts'], {
        stdio: 'inherit',
        shell: true
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ 模擬器測試完成');
          resolve();
        } else {
          console.error(`❌ 模擬器測試失敗 (退出代碼: ${code})`);
          reject(new Error(`測試失敗，退出代碼: ${code}`));
        }
      });

      testProcess.on('error', reject);
    });
  }

  async waitForEmulator(maxRetries = 30, retryDelay = 2000) {
    console.log('⏳ 等待模擬器啟動...');
    
    for (let i = 0; i < maxRetries; i++) {
      const isRunning = await this.checkEmulatorStatus();
      if (isRunning) {
        console.log('✅ 模擬器已準備就緒');
        return true;
      }
      
      console.log(`⏳ 等待中... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    
    throw new Error('等待模擬器啟動超時');
  }
}

// 命令行界面
async function main() {
  const manager = new EmulatorManager();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'start':
        const withUI = process.argv.includes('--ui');
        const detached = process.argv.includes('--detach');
        await manager.start({ withUI, detached });
        break;
        
      case 'stop':
        await manager.stop();
        break;
        
      case 'reset':
        await manager.reset();
        break;
        
      case 'status':
        await manager.status();
        break;
        
      case 'test':
        await manager.runTests();
        break;
        
      case 'restart':
        await manager.stop();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await manager.start();
        break;
        
      default:
        console.log('🔧 Firebase 模擬器管理工具');
        console.log('');
        console.log('使用方法:');
        console.log('  node scripts/emulator-manager.js <command> [options]');
        console.log('');
        console.log('命令:');
        console.log('  start [--ui] [--detach]  啟動模擬器');
        console.log('  stop                     停止模擬器');
        console.log('  restart                  重啟模擬器');
        console.log('  reset                    重置模擬器數據');
        console.log('  status                   檢查模擬器狀態');
        console.log('  test                     運行模擬器測試');
        console.log('');
        console.log('選項:');
        console.log('  --ui                     啟動時包含 UI');
        console.log('  --detach                 在背景運行');
        break;
    }
  } catch (error) {
    console.error('❌ 操作失敗:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = EmulatorManager;
