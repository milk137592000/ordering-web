import { Page, Locator, expect } from '@playwright/test';

/**
 * 測試穩定性輔助工具
 * 提供可靠的等待策略和選擇器方法
 */

export interface StabilityOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  pollInterval?: number;
}

const DEFAULT_STABILITY_OPTIONS: Required<StabilityOptions> = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  pollInterval: 100
};

/**
 * 智能等待元素可見並可交互
 */
export async function waitForElementReady(
  page: Page, 
  selector: string, 
  options: StabilityOptions = {}
): Promise<Locator> {
  const opts = { ...DEFAULT_STABILITY_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      const element = page.locator(selector);
      
      // 等待元素存在
      await element.waitFor({ state: 'attached', timeout: opts.timeout });
      
      // 等待元素可見
      await element.waitFor({ state: 'visible', timeout: opts.timeout });
      
      // 確保元素穩定（不在動畫中）
      await waitForElementStable(element, { timeout: 2000 });
      
      // 如果是可交互元素，確保可以交互
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
      
      if (interactiveTags.includes(tagName)) {
        await element.waitFor({ state: 'visible', timeout: opts.timeout });
        
        // 檢查是否被禁用
        const isDisabled = await element.isDisabled();
        if (isDisabled) {
          throw new Error(`元素 ${selector} 被禁用`);
        }
      }
      
      console.log(`✅ 元素 ${selector} 準備就緒 (嘗試 ${attempt}/${opts.retries})`);
      return element;
    } catch (error) {
      console.warn(`⚠️ 等待元素失敗 (嘗試 ${attempt}/${opts.retries}):`, error);
      
      if (attempt === opts.retries) {
        throw new Error(`元素 ${selector} 在 ${opts.retries} 次嘗試後仍未準備就緒: ${error}`);
      }
      
      await page.waitForTimeout(opts.retryDelay);
    }
  }
  
  throw new Error(`元素 ${selector} 等待失敗`);
}

/**
 * 等待元素位置穩定（不在動畫中）
 */
export async function waitForElementStable(
  element: Locator, 
  options: { timeout?: number; threshold?: number } = {}
): Promise<void> {
  const { timeout = 5000, threshold = 2 } = options;
  const startTime = Date.now();
  
  let lastPosition: { x: number; y: number } | null = null;
  let stableCount = 0;
  
  while (Date.now() - startTime < timeout) {
    try {
      const box = await element.boundingBox();
      if (!box) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      const currentPosition = { x: box.x, y: box.y };
      
      if (lastPosition && 
          Math.abs(currentPosition.x - lastPosition.x) < 1 && 
          Math.abs(currentPosition.y - lastPosition.y) < 1) {
        stableCount++;
        if (stableCount >= threshold) {
          return; // 元素位置穩定
        }
      } else {
        stableCount = 0;
      }
      
      lastPosition = currentPosition;
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // 元素可能暫時不可用，繼續等待
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.warn('⚠️ 元素位置未完全穩定，但繼續執行');
}

/**
 * 可靠的點擊操作
 */
export async function reliableClick(
  page: Page, 
  selector: string, 
  options: StabilityOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_STABILITY_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      const element = await waitForElementReady(page, selector, options);
      
      // 滾動到元素可見區域
      await element.scrollIntoViewIfNeeded();
      
      // 等待一小段時間確保滾動完成
      await page.waitForTimeout(200);
      
      // 執行點擊
      await element.click();
      
      // 等待點擊效果
      await page.waitForTimeout(300);
      
      console.log(`✅ 成功點擊 ${selector} (嘗試 ${attempt}/${opts.retries})`);
      return;
    } catch (error) {
      console.warn(`⚠️ 點擊失敗 (嘗試 ${attempt}/${opts.retries}):`, error);
      
      if (attempt === opts.retries) {
        throw new Error(`點擊 ${selector} 在 ${opts.retries} 次嘗試後失敗: ${error}`);
      }
      
      await page.waitForTimeout(opts.retryDelay);
    }
  }
}

/**
 * 可靠的文字輸入
 */
export async function reliableType(
  page: Page, 
  selector: string, 
  text: string, 
  options: StabilityOptions & { clear?: boolean } = {}
): Promise<void> {
  const opts = { ...DEFAULT_STABILITY_OPTIONS, ...options };
  const { clear = true } = options;
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      const element = await waitForElementReady(page, selector, options);
      
      // 聚焦到輸入框
      await element.focus();
      
      // 清空現有內容（如果需要）
      if (clear) {
        await element.selectText();
        await page.keyboard.press('Delete');
      }
      
      // 輸入文字
      await element.type(text, { delay: 50 }); // 稍微慢一點輸入
      
      // 驗證輸入的文字
      const inputValue = await element.inputValue();
      if (inputValue !== text) {
        throw new Error(`輸入驗證失敗: 期望 "${text}", 實際 "${inputValue}"`);
      }
      
      console.log(`✅ 成功輸入文字到 ${selector} (嘗試 ${attempt}/${opts.retries})`);
      return;
    } catch (error) {
      console.warn(`⚠️ 輸入文字失敗 (嘗試 ${attempt}/${opts.retries}):`, error);
      
      if (attempt === opts.retries) {
        throw new Error(`輸入文字到 ${selector} 在 ${opts.retries} 次嘗試後失敗: ${error}`);
      }
      
      await page.waitForTimeout(opts.retryDelay);
    }
  }
}

/**
 * 等待文字出現
 */
export async function waitForText(
  page: Page, 
  text: string, 
  options: StabilityOptions = {}
): Promise<Locator> {
  const opts = { ...DEFAULT_STABILITY_OPTIONS, ...options };
  
  const element = page.getByText(text);
  await element.waitFor({ state: 'visible', timeout: opts.timeout });
  
  return element;
}

/**
 * 等待頁面載入完成
 */
export async function waitForPageLoad(
  page: Page, 
  options: StabilityOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_STABILITY_OPTIONS, ...options };
  
  // 等待基本載入狀態
  await page.waitForLoadState('domcontentloaded', { timeout: opts.timeout });
  
  // 等待網路空閒
  await page.waitForLoadState('networkidle', { timeout: opts.timeout });
  
  // 等待 React 渲染完成
  await page.waitForFunction(() => {
    return document.readyState === 'complete' && 
           window.React !== undefined;
  }, { timeout: opts.timeout });
  
  // 額外等待確保動態內容載入
  await page.waitForTimeout(1000);
}

/**
 * 智能選擇器策略
 */
export class SmartSelector {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * 按優先級查找元素
   */
  async findByPriority(selectors: string[]): Promise<Locator | null> {
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector);
        await element.waitFor({ state: 'visible', timeout: 2000 });
        return element;
      } catch (error) {
        // 繼續嘗試下一個選擇器
      }
    }
    return null;
  }
  
  /**
   * 查找按鈕（多種策略）
   */
  async findButton(text: string): Promise<Locator> {
    const selectors = [
      `button:has-text("${text}")`,
      `[role="button"]:has-text("${text}")`,
      `input[type="button"][value="${text}"]`,
      `input[type="submit"][value="${text}"]`,
      `a:has-text("${text}")`,
      `*:has-text("${text}")[onclick]`
    ];
    
    const element = await this.findByPriority(selectors);
    if (!element) {
      throw new Error(`找不到按鈕: ${text}`);
    }
    
    return element;
  }
  
  /**
   * 查找輸入框（多種策略）
   */
  async findInput(placeholder?: string, label?: string): Promise<Locator> {
    const selectors: string[] = [];
    
    if (placeholder) {
      selectors.push(`input[placeholder="${placeholder}"]`);
      selectors.push(`textarea[placeholder="${placeholder}"]`);
    }
    
    if (label) {
      selectors.push(`input[aria-label="${label}"]`);
      selectors.push(`textarea[aria-label="${label}"]`);
    }
    
    // 通用輸入框選擇器
    selectors.push('input[type="text"]', 'input:not([type])', 'textarea');
    
    const element = await this.findByPriority(selectors);
    if (!element) {
      throw new Error(`找不到輸入框: ${placeholder || label || '未指定'}`);
    }
    
    return element;
  }
}

/**
 * 測試數據隔離
 */
export class TestDataIsolation {
  private page: Page;
  private testId: string;
  
  constructor(page: Page, testId?: string) {
    this.page = page;
    this.testId = testId || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 獲取隔離的測試 ID
   */
  getTestId(): string {
    return this.testId;
  }
  
  /**
   * 創建隔離的測試數據
   */
  async setupIsolatedData(data: any): Promise<void> {
    await this.page.evaluate(async ({ testId, data }) => {
      const { db, doc, setDoc } = (window as any).firebaseServices;
      if (db && doc && setDoc) {
        await setDoc(doc(db, 'test_sessions', testId), {
          ...data,
          createdAt: new Date().toISOString(),
          testId
        });
      }
    }, { testId: this.testId, data });
  }
  
  /**
   * 清理隔離的測試數據
   */
  async cleanupIsolatedData(): Promise<void> {
    await this.page.evaluate(async (testId) => {
      const { db, doc, setDoc } = (window as any).firebaseServices;
      if (db && doc && setDoc) {
        await setDoc(doc(db, 'test_sessions', testId), {});
      }
    }, this.testId);
  }
}
