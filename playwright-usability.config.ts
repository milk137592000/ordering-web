import { defineConfig, devices } from '@playwright/test';

/**
 * Usability testing configuration for Playwright
 * Focused on accessibility, responsive design, and user experience
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/accessibility.spec.ts', '**/responsive.spec.ts', '**/user-experience.spec.ts'],
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : undefined,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'usability-report' }],
    ['json', { outputFile: 'usability-results/results.json' }],
    ['junit', { outputFile: 'usability-results/results.xml' }]
  ],
  
  /* Global timeout for usability tests */
  timeout: 45000, // 45 seconds per test
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions */
    baseURL: 'http://localhost:5173',

    /* Collect trace for usability analysis */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video for usability analysis */
    video: 'retain-on-failure',
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for usability testing */
  projects: [
    // Desktop browsers
    {
      name: 'accessibility-chrome',
      testMatch: '**/accessibility.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },

    {
      name: 'accessibility-firefox',
      testMatch: '**/accessibility.spec.ts',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },

    {
      name: 'accessibility-safari',
      testMatch: '**/accessibility.spec.ts',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },

    // Responsive design testing
    {
      name: 'responsive-mobile',
      testMatch: '**/responsive.spec.ts',
      use: { 
        ...devices['iPhone 12'],
      },
    },

    {
      name: 'responsive-tablet',
      testMatch: '**/responsive.spec.ts',
      use: { 
        ...devices['iPad Pro'],
      },
    },

    {
      name: 'responsive-desktop',
      testMatch: '**/responsive.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // User experience testing
    {
      name: 'ux-chrome',
      testMatch: '**/user-experience.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },

    {
      name: 'ux-mobile',
      testMatch: '**/user-experience.spec.ts',
      use: { 
        ...devices['iPhone 12'],
      },
    },

    // High contrast testing
    {
      name: 'high-contrast',
      testMatch: '**/accessibility.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        viewport: { width: 1280, height: 720 }
      },
    },

    // Reduced motion testing
    {
      name: 'reduced-motion',
      testMatch: '**/accessibility.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        reducedMotion: 'reduce',
        viewport: { width: 1280, height: 720 }
      },
    },

    // Touch device testing
    {
      name: 'touch-device',
      testMatch: '**/user-experience.spec.ts',
      use: { 
        ...devices['iPad Pro'],
        hasTouch: true
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
