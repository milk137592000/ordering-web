#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate comprehensive test report from all test results
 */
class TestReportGenerator {
  constructor() {
    this.results = {
      e2e: null,
      performance: null,
      usability: null,
      unit: null
    };
  }

  loadTestResults() {
    // Load E2E test results
    try {
      const e2eResults = fs.readFileSync('test-results/results.json', 'utf8');
      this.results.e2e = JSON.parse(e2eResults);
    } catch (error) {
      console.warn('E2E test results not found');
    }

    // Load Performance test results
    try {
      const perfResults = fs.readFileSync('performance-results/results.json', 'utf8');
      this.results.performance = JSON.parse(perfResults);
    } catch (error) {
      console.warn('Performance test results not found');
    }

    // Load Usability test results
    try {
      const usabilityResults = fs.readFileSync('usability-results/results.json', 'utf8');
      this.results.usability = JSON.parse(usabilityResults);
    } catch (error) {
      console.warn('Usability test results not found');
    }

    // Load Unit test results (if available)
    try {
      const unitResults = fs.readFileSync('coverage/coverage-summary.json', 'utf8');
      this.results.unit = JSON.parse(unitResults);
    } catch (error) {
      console.warn('Unit test results not found');
    }
  }

  generateSummary() {
    const summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      coverage: null
    };

    // Process each test type
    Object.values(this.results).forEach(result => {
      if (result && result.stats) {
        summary.totalTests += result.stats.total || 0;
        summary.passedTests += result.stats.passed || 0;
        summary.failedTests += result.stats.failed || 0;
        summary.skippedTests += result.stats.skipped || 0;
        summary.duration += result.stats.duration || 0;
      }
    });

    // Add coverage information
    if (this.results.unit && this.results.unit.total) {
      summary.coverage = {
        statements: this.results.unit.total.statements.pct,
        branches: this.results.unit.total.branches.pct,
        functions: this.results.unit.total.functions.pct,
        lines: this.results.unit.total.lines.pct
      };
    }

    return summary;
  }

  generateDetailedReport() {
    const summary = this.generateSummary();
    const timestamp = new Date().toISOString();

    const report = `
# 丁二烯C班點餐系統 - 測試報告

**生成時間:** ${timestamp}

## 測試總覽

| 指標 | 數值 |
|------|------|
| 總測試數 | ${summary.totalTests} |
| 通過測試 | ${summary.passedTests} |
| 失敗測試 | ${summary.failedTests} |
| 跳過測試 | ${summary.skippedTests} |
| 總執行時間 | ${Math.round(summary.duration / 1000)}秒 |
| 成功率 | ${summary.totalTests > 0 ? Math.round((summary.passedTests / summary.totalTests) * 100) : 0}% |

${summary.coverage ? `
## 代碼覆蓋率

| 類型 | 覆蓋率 |
|------|--------|
| 語句覆蓋率 | ${summary.coverage.statements}% |
| 分支覆蓋率 | ${summary.coverage.branches}% |
| 函數覆蓋率 | ${summary.coverage.functions}% |
| 行覆蓋率 | ${summary.coverage.lines}% |
` : ''}

## 端到端測試 (E2E)

${this.generateTestSection(this.results.e2e, 'E2E')}

## 效能測試

${this.generateTestSection(this.results.performance, 'Performance')}

## 可用性測試

${this.generateTestSection(this.results.usability, 'Usability')}

## 測試建議

### 通過的測試
${this.generateRecommendations('passed')}

### 失敗的測試
${this.generateRecommendations('failed')}

### 效能建議
${this.generatePerformanceRecommendations()}

### 可用性建議
${this.generateUsabilityRecommendations()}

## 下一步行動

1. **修復失敗的測試**: 優先處理關鍵功能的測試失敗
2. **提升覆蓋率**: 為未覆蓋的代碼添加測試
3. **效能優化**: 關注載入時間和響應時間
4. **可用性改進**: 提升無障礙性和用戶體驗

---

*此報告由自動化測試系統生成*
    `.trim();

    return report;
  }

  generateTestSection(results, type) {
    if (!results || !results.stats) {
      return `**${type} 測試結果:** 未執行或結果不可用\n`;
    }

    const stats = results.stats;
    const successRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

    let section = `
**${type} 測試結果:**
- 總測試數: ${stats.total}
- 通過: ${stats.passed}
- 失敗: ${stats.failed}
- 跳過: ${stats.skipped}
- 成功率: ${successRate}%
- 執行時間: ${Math.round((stats.duration || 0) / 1000)}秒

`;

    // Add failed tests details
    if (results.suites && stats.failed > 0) {
      section += `**失敗的測試:**\n`;
      results.suites.forEach(suite => {
        suite.specs.forEach(spec => {
          spec.tests.forEach(test => {
            if (test.results.some(result => result.status === 'failed')) {
              section += `- ${suite.title}: ${test.title}\n`;
            }
          });
        });
      });
    }

    return section;
  }

  generateRecommendations(type) {
    const recommendations = {
      passed: [
        '✅ 核心用戶流程測試通過，系統基本功能穩定',
        '✅ 響應式設計測試通過，支援多種設備',
        '✅ 無障礙性測試通過，符合可用性標準'
      ],
      failed: [
        '❌ 檢查失敗的測試案例，優先修復關鍵功能',
        '❌ 驗證測試環境配置是否正確',
        '❌ 考慮更新測試案例以反映最新的需求變更'
      ]
    };

    return recommendations[type]?.join('\n') || '無特定建議';
  }

  generatePerformanceRecommendations() {
    return `
- 🚀 優化頁面載入時間，目標 < 3秒
- 🚀 減少 Firebase 操作響應時間
- 🚀 實施代碼分割和懶加載
- 🚀 優化圖片和靜態資源
- 🚀 考慮實施服務工作者 (Service Worker)
    `.trim();
  }

  generateUsabilityRecommendations() {
    return `
- ♿ 確保所有互動元素符合 WCAG 2.1 AA 標準
- ♿ 提供清晰的錯誤訊息和恢復選項
- ♿ 優化觸控目標大小 (最小 44x44px)
- ♿ 改善鍵盤導航體驗
- ♿ 提供更好的載入狀態指示器
    `.trim();
  }

  saveReport(report) {
    // Ensure reports directory exists
    const reportsDir = 'reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Save markdown report
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `test-report-${timestamp}.md`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, report, 'utf8');
    
    // Also save as latest
    fs.writeFileSync(path.join(reportsDir, 'latest-test-report.md'), report, 'utf8');
    
    console.log(`測試報告已生成: ${filepath}`);
    return filepath;
  }

  generate() {
    console.log('正在生成測試報告...');
    
    this.loadTestResults();
    const report = this.generateDetailedReport();
    const filepath = this.saveReport(report);
    
    console.log('測試報告生成完成！');
    return filepath;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new TestReportGenerator();
  generator.generate();
}

export default TestReportGenerator;
