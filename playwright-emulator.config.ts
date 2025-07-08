import { defineConfig, devices } from '@playwright/test';

/**
 * Firebase 模擬器測試配置
 * 專門用於在 Firebase 模擬器環境中運行測試
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/emulator-*.spec.ts', '**/firebase-*.spec.ts'],
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : undefined,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'emulator-report' }],
    ['json', { outputFile: 'emulator-results/results.json' }],
    ['junit', { outputFile: 'emulator-results/results.xml' }]
  ],
  
  /* Global timeout for emulator tests */
  timeout: 45000, // 45 seconds per test
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 8000, // 8 seconds for assertions
  },
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions */
    baseURL: 'http://localhost:5173?emulator=true',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Navigation timeout */
    navigationTimeout: 20000, // 20 seconds for navigation
    
    /* Action timeout */
    actionTimeout: 10000, // 10 seconds for actions
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'emulator'
    }
  },

  /* Configure projects for emulator testing */
  projects: [
    {
      name: 'emulator-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },

    {
      name: 'emulator-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },

    {
      name: 'emulator-mobile',
      use: { 
        ...devices['iPhone 12'],
      },
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/setup/emulator-global-setup.ts'),
  globalTeardown: require.resolve('./e2e/setup/emulator-global-teardown.ts'),

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'firebase emulators:start --only firestore',
      url: 'http://127.0.0.1:8080',
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
    }
  ],
});
