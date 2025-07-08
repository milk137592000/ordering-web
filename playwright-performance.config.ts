import { defineConfig, devices } from '@playwright/test';

/**
 * Performance testing configuration for Playwright
 * Optimized for performance measurement and monitoring
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/performance.spec.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Disable for accurate performance measurement
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  
  /* Opt out of parallel tests for performance testing */
  workers: 1,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'performance-report' }],
    ['json', { outputFile: 'performance-results/results.json' }],
    ['junit', { outputFile: 'performance-results/results.xml' }]
  ],
  
  /* Global timeout for performance tests */
  timeout: 60000, // 1 minute per test
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions */
    baseURL: 'http://localhost:5173',

    /* Collect trace for performance analysis */
    trace: 'on',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video for performance analysis */
    video: 'retain-on-failure',
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Set viewport for consistent performance testing */
    viewport: { width: 1280, height: 720 },
    
    /* Disable animations for consistent timing */
    reducedMotion: 'reduce',
  },

  /* Configure projects for performance testing */
  projects: [
    {
      name: 'performance-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable performance monitoring
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-memory-info',
            '--js-flags=--expose-gc',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
    },

    {
      name: 'performance-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox specific performance settings
        launchOptions: {
          firefoxUserPrefs: {
            'dom.enable_performance_observer': true,
            'dom.enable_performance': true
          }
        }
      },
    },

    /* Test against mobile viewports for mobile performance */
    {
      name: 'performance-mobile',
      use: { 
        ...devices['Pixel 5'],
        // Mobile performance settings
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--enable-memory-info'
          ]
        }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
