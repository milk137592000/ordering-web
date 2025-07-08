#!/usr/bin/env node

/**
 * 測試穩定性分析工具
 * 分析測試結果並提供穩定性改進建議
 */

const fs = require('fs');
const path = require('path');

class TestStabilityAnalyzer {
  constructor() {
    this.testResults = [];
    this.stabilityMetrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      retriedTests: 0,
      averageExecutionTime: 0,
      stabilityScore: 0
    };
  }

  /**
   * 分析測試結果文件
   */
  async analyzeTestResults(resultsPath) {
    console.log('🔍 分析測試穩定性...');
    
    try {
      if (!fs.existsSync(resultsPath)) {
        console.warn(`⚠️ 測試結果文件不存在: ${resultsPath}`);
        return;
      }

      const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      this.processTestResults(resultsData);
      this.calculateStabilityMetrics();
      this.generateRecommendations();
      
    } catch (error) {
      console.error('❌ 分析測試結果失敗:', error.message);
    }
  }

  /**
   * 處理測試結果數據
   */
  processTestResults(resultsData) {
    if (!resultsData.suites) {
      console.warn('⚠️ 測試結果格式不正確');
      return;
    }

    resultsData.suites.forEach(suite => {
      this.processSuite(suite);
    });
  }

  /**
   * 處理測試套件
   */
  processSuite(suite) {
    if (suite.specs) {
      suite.specs.forEach(spec => {
        this.processSpec(spec);
      });
    }

    if (suite.suites) {
      suite.suites.forEach(subSuite => {
        this.processSuite(subSuite);
      });
    }
  }

  /**
   * 處理測試規格
   */
  processSpec(spec) {
    spec.tests.forEach(test => {
      const testResult = {
        title: test.title,
        status: test.status,
        duration: test.duration || 0,
        retries: test.results ? test.results.length - 1 : 0,
        errors: test.results ? test.results.filter(r => r.status === 'failed').map(r => r.error) : []
      };

      this.testResults.push(testResult);
      this.stabilityMetrics.totalTests++;

      if (test.status === 'passed') {
        this.stabilityMetrics.passedTests++;
      } else if (test.status === 'failed') {
        this.stabilityMetrics.failedTests++;
      }

      if (testResult.retries > 0) {
        this.stabilityMetrics.retriedTests++;
      }
    });
  }

  /**
   * 計算穩定性指標
   */
  calculateStabilityMetrics() {
    const { totalTests, passedTests, retriedTests } = this.stabilityMetrics;
    
    if (totalTests === 0) {
      console.warn('⚠️ 沒有找到測試結果');
      return;
    }

    // 計算通過率
    const passRate = (passedTests / totalTests) * 100;
    
    // 計算重試率
    const retryRate = (retriedTests / totalTests) * 100;
    
    // 計算平均執行時間
    const totalDuration = this.testResults.reduce((sum, test) => sum + test.duration, 0);
    this.stabilityMetrics.averageExecutionTime = totalDuration / totalTests;
    
    // 計算穩定性分數 (0-100)
    // 基於通過率和重試率
    this.stabilityMetrics.stabilityScore = Math.max(0, passRate - (retryRate * 2));
    
    console.log('\n📊 穩定性指標:');
    console.log(`   總測試數: ${totalTests}`);
    console.log(`   通過測試: ${passedTests} (${passRate.toFixed(1)}%)`);
    console.log(`   失敗測試: ${this.stabilityMetrics.failedTests}`);
    console.log(`   重試測試: ${retriedTests} (${retryRate.toFixed(1)}%)`);
    console.log(`   平均執行時間: ${this.stabilityMetrics.averageExecutionTime.toFixed(0)}ms`);
    console.log(`   穩定性分數: ${this.stabilityMetrics.stabilityScore.toFixed(1)}/100`);
  }

  /**
   * 生成改進建議
   */
  generateRecommendations() {
    const { stabilityScore, retriedTests, totalTests, averageExecutionTime } = this.stabilityMetrics;
    const recommendations = [];

    console.log('\n💡 穩定性改進建議:');

    // 基於穩定性分數的建議
    if (stabilityScore < 70) {
      recommendations.push('🔴 穩定性分數較低，需要重點關注測試穩定性');
      recommendations.push('   - 檢查失敗的測試案例');
      recommendations.push('   - 增加更可靠的等待策略');
      recommendations.push('   - 改善選擇器策略');
    } else if (stabilityScore < 85) {
      recommendations.push('🟡 穩定性分數中等，有改進空間');
      recommendations.push('   - 優化重試較多的測試');
      recommendations.push('   - 檢查間歇性失敗的原因');
    } else {
      recommendations.push('🟢 穩定性分數良好，保持現有品質');
    }

    // 基於重試率的建議
    const retryRate = (retriedTests / totalTests) * 100;
    if (retryRate > 20) {
      recommendations.push('🔄 重試率較高，建議:');
      recommendations.push('   - 增加元素等待時間');
      recommendations.push('   - 使用更穩定的選擇器');
      recommendations.push('   - 檢查網路依賴問題');
    }

    // 基於執行時間的建議
    if (averageExecutionTime > 30000) {
      recommendations.push('⏱️ 測試執行時間較長，建議:');
      recommendations.push('   - 優化等待策略');
      recommendations.push('   - 減少不必要的延遲');
      recommendations.push('   - 考慮並行執行');
    }

    // 分析常見錯誤
    this.analyzeCommonErrors(recommendations);

    // 輸出建議
    recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });

    // 生成具體的改進計劃
    this.generateImprovementPlan();
  }

  /**
   * 分析常見錯誤
   */
  analyzeCommonErrors(recommendations) {
    const errorPatterns = {};
    
    this.testResults.forEach(test => {
      test.errors.forEach(error => {
        if (error && error.message) {
          const message = error.message.toLowerCase();
          
          // 檢查常見錯誤模式
          if (message.includes('timeout')) {
            errorPatterns.timeout = (errorPatterns.timeout || 0) + 1;
          }
          if (message.includes('element not found') || message.includes('locator')) {
            errorPatterns.locator = (errorPatterns.locator || 0) + 1;
          }
          if (message.includes('network') || message.includes('connection')) {
            errorPatterns.network = (errorPatterns.network || 0) + 1;
          }
        }
      });
    });

    // 基於錯誤模式提供建議
    if (errorPatterns.timeout > 0) {
      recommendations.push(`⏰ 發現 ${errorPatterns.timeout} 個超時錯誤，建議增加超時時間`);
    }
    if (errorPatterns.locator > 0) {
      recommendations.push(`🎯 發現 ${errorPatterns.locator} 個元素定位錯誤，建議改善選擇器`);
    }
    if (errorPatterns.network > 0) {
      recommendations.push(`🌐 發現 ${errorPatterns.network} 個網路錯誤，建議檢查網路依賴`);
    }
  }

  /**
   * 生成改進計劃
   */
  generateImprovementPlan() {
    const { stabilityScore } = this.stabilityMetrics;
    
    console.log('\n📋 建議的改進計劃:');
    
    if (stabilityScore < 70) {
      console.log('   🚨 緊急改進 (1-2 天):');
      console.log('     1. 修復失敗率最高的測試');
      console.log('     2. 增加基本的重試機制');
      console.log('     3. 改善關鍵路徑的等待策略');
      
      console.log('   📈 短期改進 (1 週):');
      console.log('     1. 實施智能等待策略');
      console.log('     2. 優化選擇器策略');
      console.log('     3. 添加測試數據隔離');
    } else if (stabilityScore < 85) {
      console.log('   📈 持續改進 (2 週):');
      console.log('     1. 分析間歇性失敗的測試');
      console.log('     2. 優化測試執行順序');
      console.log('     3. 增強錯誤處理機制');
    } else {
      console.log('   🎯 維護和監控:');
      console.log('     1. 定期監控穩定性指標');
      console.log('     2. 持續優化測試性能');
      console.log('     3. 建立穩定性基準線');
    }
  }

  /**
   * 運行完整分析
   */
  async runAnalysis() {
    console.log('🚀 開始測試穩定性分析...');
    
    // 分析不同類型的測試結果
    const resultPaths = [
      'test-results/results.json',
      'stable-results/results.json',
      'emulator-results/results.json'
    ];

    let foundResults = false;
    
    for (const resultPath of resultPaths) {
      if (fs.existsSync(resultPath)) {
        console.log(`\n📁 分析 ${resultPath}...`);
        await this.analyzeTestResults(resultPath);
        foundResults = true;
      }
    }

    if (!foundResults) {
      console.log('⚠️ 沒有找到測試結果文件');
      console.log('請先運行測試：npm run test:e2e 或 npm run test:emulator');
    }

    console.log('\n✅ 穩定性分析完成');
  }
}

// 命令行界面
async function main() {
  const analyzer = new TestStabilityAnalyzer();
  
  const command = process.argv[2];
  const filePath = process.argv[3];
  
  try {
    if (command === 'analyze' && filePath) {
      await analyzer.analyzeTestResults(filePath);
    } else {
      await analyzer.runAnalysis();
    }
  } catch (error) {
    console.error('❌ 分析失敗:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestStabilityAnalyzer;
