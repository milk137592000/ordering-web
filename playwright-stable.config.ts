import { defineConfig, devices } from '@playwright/test';

/**
 * 穩定性優化的 Playwright 配置
 * 專注於提高測試穩定性和可靠性
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/basic-functionality.spec.ts', '**/complete-ordering-flow.spec.ts', '**/error-handling.spec.ts'],
  
  /* Run tests in files in parallel */
  fullyParallel: false, // 禁用並行以提高穩定性
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 2, // 增加重試次數
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1, // 單線程執行
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'stable-report' }],
    ['json', { outputFile: 'stable-results/results.json' }],
    ['junit', { outputFile: 'stable-results/results.xml' }],
    ['line'] // 添加行報告器以便實時查看進度
  ],
  
  /* Global timeout for stable tests */
  timeout: 90000, // 90 seconds per test - 更長的超時時間
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test */
    trace: 'retain-on-failure', // 失敗時保留追蹤
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Navigation timeout */
    navigationTimeout: 45000, // 45 seconds for navigation
    
    /* Action timeout */
    actionTimeout: 20000, // 20 seconds for actions
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'stable'
    },
    
    /* Slow down actions for stability */
    launchOptions: {
      slowMo: 100, // 100ms delay between actions
    }
  },

  /* Configure projects for stable testing */
  projects: [
    {
      name: 'stable-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // 禁用某些可能影響穩定性的功能
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-background-timer-throttling',
            '--force-color-profile=srgb',
            '--disable-dev-shm-usage'
          ]
        }
      },
    },

    // 只在 Chrome 中運行以提高穩定性
    // 其他瀏覽器可以在單獨的配置中測試
  ],

  /* Global setup and teardown for stable tests */
  // globalSetup: './e2e/setup/stable-global-setup.ts',
  // globalTeardown: './e2e/setup/stable-global-teardown.ts',

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // 確保服務器完全啟動
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
