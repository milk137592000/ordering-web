# 測試指南 - 丁二烯C班點餐系統

本文件說明如何運行和維護本專案的測試套件。

## 🚀 快速開始

### 安裝依賴
```bash
npm install
```

### 安裝 Playwright 瀏覽器
```bash
npx playwright install
```

### 啟動開發服務器
```bash
npm run dev
```

### 運行測試
```bash
# 運行所有測試
npm run test:e2e:all

# 或分別運行不同類型的測試
npm run test:e2e           # 端到端測試
npm run test:e2e:performance  # 效能測試
npm run test:e2e:usability    # 可用性測試
```

## 📁 測試結構

```
e2e/
├── complete-ordering-flow.spec.ts    # 完整訂餐流程測試
├── historical-orders.spec.ts         # 歷史訂單功能測試
├── error-handling.spec.ts            # 錯誤處理測試
├── basic-functionality.spec.ts       # 基本功能測試
├── performance.spec.ts               # 效能測試
├── firebase-performance.spec.ts      # Firebase 效能測試
├── accessibility.spec.ts             # 無障礙性測試
├── responsive.spec.ts                # 響應式設計測試
├── user-experience.spec.ts           # 用戶體驗測試
└── utils/
    └── performance-monitor.ts         # 效能監控工具

playwright.config.ts                  # 主要測試配置
playwright-performance.config.ts      # 效能測試配置
playwright-usability.config.ts        # 可用性測試配置
```

## 🧪 測試類型說明

### 端到端測試 (E2E)
測試完整的用戶流程，確保所有功能正常運作。

**主要測試案例:**
- 團隊設定 → 餐廳選擇 → 飲料店選擇 → 點餐 → 完成訂單
- 歷史訂單查看和導航
- 錯誤處理和邊界情況
- 臨時成員新增功能

### 效能測試
監控應用程式的效能指標，確保良好的用戶體驗。

**測試指標:**
- 頁面載入時間 (目標: < 3秒)
- Firebase 操作響應時間 (目標: < 2秒)
- UI 互動響應時間 (目標: < 100ms)
- 記憶體使用量 (目標: < 50MB)

### 可用性測試
確保應用程式符合無障礙標準和響應式設計要求。

**測試範圍:**
- WCAG 2.1 AA 無障礙標準
- 鍵盤導航支援
- 螢幕閱讀器相容性
- 響應式設計 (手機/平板/桌面)
- 觸控友善介面

## 🔧 測試配置

### 瀏覽器支援
- Desktop Chrome
- Desktop Firefox  
- Desktop Safari
- Mobile Chrome
- Mobile Safari

### 測試環境
- **開發環境:** http://localhost:5173
- **超時設定:** 30-60 秒 (依測試類型)
- **重試次數:** CI 環境 2 次，本地 0 次

## 📊 查看測試結果

### HTML 報告
測試執行後會自動生成 HTML 報告：
```bash
# 報告會在瀏覽器中自動開啟
# 或手動開啟: playwright-report/index.html
```

### 測試截圖和影片
失敗的測試會自動產生：
- 截圖 (PNG)
- 錄影 (WebM)
- 追蹤檔案 (用於除錯)

### 效能報告
效能測試會產生詳細的效能指標報告，包括：
- 載入時間分析
- 網路請求統計
- 記憶體使用情況
- Firebase 操作效能

## 🛠️ 維護和除錯

### 常見問題

#### 1. Firebase 連接超時
**問題:** 測試在等待 Firebase 連接時超時
**解決方案:**
```bash
# 增加超時時間或檢查 Firebase 配置
# 確保網路連接正常
```

#### 2. 元素找不到
**問題:** 測試無法找到頁面元素
**解決方案:**
- 檢查元素是否已載入
- 確認 `data-testid` 屬性正確
- 增加等待時間

#### 3. 測試不穩定
**問題:** 測試結果不一致
**解決方案:**
- 檢查網路依賴
- 增加適當的等待條件
- 使用更可靠的選擇器

### 新增測試

#### 1. 新增測試案例
```typescript
test('should do something', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  
  // 你的測試邏輯
  await expect(page.getByText('預期文字')).toBeVisible();
});
```

#### 2. 新增測試 ID
在組件中添加 `data-testid` 屬性：
```tsx
<button data-testid="my-button">點擊我</button>
```

在測試中使用：
```typescript
await page.getByTestId('my-button').click();
```

### 效能測試最佳實踐

#### 1. 使用效能監控器
```typescript
import { PerformanceMonitor } from './utils/performance-monitor';

const monitor = new PerformanceMonitor(page);
const metrics = await monitor.getMetrics();
```

#### 2. 設定效能基準
```typescript
expect(loadTime).toBeLessThan(3000); // 3 秒
expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB
```

## 🚀 CI/CD 整合

### GitHub Actions 範例
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e:all
```

## 📈 測試指標追蹤

建議定期監控以下指標：
- 測試通過率
- 測試執行時間
- 效能基準達成率
- 無障礙性合規程度

## 🤝 貢獻指南

### 新增測試時請確保：
1. 測試案例有清楚的描述
2. 使用適當的等待條件
3. 添加必要的註解
4. 遵循現有的命名慣例
5. 更新相關文件

### 測試命名慣例
- 檔案名稱：`feature-name.spec.ts`
- 測試描述：`should [動作] when [條件]`
- 測試 ID：`kebab-case` 格式

---

## 📞 支援

如有測試相關問題，請：
1. 檢查本文件的常見問題部分
2. 查看測試報告中的錯誤訊息
3. 檢查 Playwright 官方文件
4. 聯繫開發團隊

**祝測試順利！** 🎉
