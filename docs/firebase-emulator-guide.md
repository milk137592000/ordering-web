# Firebase 模擬器使用指南

## 🎯 概述

Firebase 模擬器讓我們可以在本地環境中測試 Firebase 功能，無需連接到真實的 Firebase 服務。這提供了更快、更可靠、更安全的測試環境。

## 🚀 快速開始

### 1. 安裝依賴

```bash
# 安裝 Firebase CLI（如果尚未安裝）
npm install -g firebase-tools

# 安裝項目依賴
npm install
```

### 2. 啟動模擬器

```bash
# 基本啟動
npm run emulator:start

# 啟動並包含 UI 界面
npm run emulator:start:ui

# 使用管理腳本啟動
node scripts/emulator-manager.js start --ui
```

### 3. 運行測試

```bash
# 運行模擬器測試
npm run test:emulator

# 自動啟動模擬器並運行測試
npm run test:with-emulator

# 使用管理腳本運行測試
node scripts/emulator-manager.js test
```

## 📋 可用命令

### NPM 腳本

| 命令 | 描述 |
|------|------|
| `npm run emulator:start` | 啟動 Firestore 模擬器 |
| `npm run emulator:start:ui` | 啟動模擬器並包含 UI |
| `npm run test:emulator` | 運行模擬器測試 |
| `npm run test:emulator:ui` | 在 UI 模式下運行模擬器測試 |
| `npm run test:with-emulator` | 自動啟動模擬器並運行測試 |

### 模擬器管理腳本

```bash
# 啟動模擬器
node scripts/emulator-manager.js start [--ui] [--detach]

# 停止模擬器
node scripts/emulator-manager.js stop

# 重啟模擬器
node scripts/emulator-manager.js restart

# 檢查模擬器狀態
node scripts/emulator-manager.js status

# 重置模擬器數據
node scripts/emulator-manager.js reset

# 運行測試
node scripts/emulator-manager.js test
```

## 🔧 配置說明

### Firebase 配置文件

#### `firebase.json`
```json
{
  "emulators": {
    "firestore": {
      "port": 8080,
      "host": "127.0.0.1"
    },
    "ui": {
      "enabled": true,
      "port": 4000,
      "host": "127.0.0.1"
    }
  }
}
```

#### `firestore.rules`
定義 Firestore 安全規則（測試環境允許所有操作）

#### `firestore.indexes.json`
定義 Firestore 索引配置

### 測試配置

#### `playwright-emulator.config.ts`
專門用於模擬器測試的 Playwright 配置，包括：
- 自動啟動模擬器
- 使用模擬器 URL (`?emulator=true`)
- 全局設置和清理

## 🧪 測試功能

### 自動化測試

模擬器測試包括以下功能：

1. **基本 CRUD 操作**
   - 創建、讀取、更新、刪除文檔
   - 驗證數據一致性

2. **實時同步測試**
   - 多用戶同時操作
   - 實時數據更新驗證

3. **離線/在線場景**
   - 模擬網路中斷
   - 數據同步恢復

4. **性能測試**
   - 大數據集操作
   - 響應時間測量

5. **錯誤處理**
   - 連接失敗處理
   - 數據驗證

### 測試數據管理

```typescript
// 設置測試數據
await setupTestData(page, {
  phase: 'TEAM_SETUP',
  teamMembers: ['測試用戶1', '測試用戶2']
}, 'test_session');

// 清理測試數據
await cleanupTestData(page, 'test_session');
```

## 🌐 模擬器 UI

啟動模擬器 UI 後，可以通過瀏覽器訪問：

- **模擬器 UI**: http://localhost:4000
- **Firestore 模擬器**: http://localhost:8080

UI 功能包括：
- 查看和編輯 Firestore 數據
- 監控請求和響應
- 查看安全規則執行情況
- 導入/導出數據

## 🔍 調試和故障排除

### 常見問題

#### 1. 模擬器啟動失敗
```bash
# 檢查端口是否被占用
lsof -i :8080
lsof -i :4000

# 停止占用端口的進程
kill -9 <PID>
```

#### 2. 測試連接失敗
```bash
# 檢查模擬器狀態
node scripts/emulator-manager.js status

# 重置模擬器數據
node scripts/emulator-manager.js reset
```

#### 3. 數據不同步
```bash
# 重啟模擬器
node scripts/emulator-manager.js restart
```

### 調試技巧

1. **查看模擬器日誌**
   - 模擬器啟動時會顯示詳細日誌
   - 注意錯誤和警告信息

2. **使用瀏覽器開發者工具**
   - 檢查網路請求
   - 查看控制台錯誤

3. **檢查測試輸出**
   - Playwright 會生成詳細的測試報告
   - 查看失敗測試的截圖和錄影

## 📊 性能優勢

### 模擬器 vs 真實 Firebase

| 指標 | 模擬器 | 真實 Firebase |
|------|--------|---------------|
| 啟動時間 | < 5 秒 | N/A |
| 響應時間 | < 50ms | 100-500ms |
| 數據重置 | 即時 | 不適用 |
| 網路依賴 | 無 | 是 |
| 成本 | 免費 | 按使用量計費 |
| 並發測試 | 支援 | 有限制 |

### 測試穩定性改善

- **消除網路變數**: 本地運行，無網路延遲
- **數據隔離**: 每次測試都有乾淨的環境
- **快速重置**: 秒級數據清理和重置
- **並發支援**: 支援多個測試同時運行

## 🚀 最佳實踐

### 1. 測試數據管理
```typescript
test.beforeEach(async ({ page }) => {
  // 清理之前的測試數據
  await cleanupTestData(page);
});

test.afterEach(async ({ page }) => {
  // 測試後清理
  await cleanupTestData(page);
});
```

### 2. 模擬器檢查
```typescript
test('should use emulator', async ({ page }) => {
  const isEmulator = await page.evaluate(() => {
    return window.location.search.includes('emulator=true');
  });
  expect(isEmulator).toBe(true);
});
```

### 3. 錯誤處理
```typescript
try {
  await waitForFirebaseOperation(page, async () => {
    // Firebase 操作
  });
} catch (error) {
  console.error('Firebase 操作失敗:', error);
  // 適當的錯誤處理
}
```

## 🔗 相關資源

- [Firebase 模擬器文檔](https://firebase.google.com/docs/emulator-suite)
- [Firestore 模擬器指南](https://firebase.google.com/docs/emulator-suite/connect_firestore)
- [測試最佳實踐](../TESTING.md)
- [Firebase 連接改進](./firebase-improvements.md)
