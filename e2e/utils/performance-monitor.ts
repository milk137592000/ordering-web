import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  memoryUsage: number;
  networkRequests: NetworkRequest[];
}

export interface NetworkRequest {
  url: string;
  method: string;
  responseTime: number;
  size: number;
  status: number;
}

export class PerformanceMonitor {
  private page: Page;
  private startTime: number;
  private networkRequests: NetworkRequest[] = [];

  constructor(page: Page) {
    this.page = page;
    this.startTime = Date.now();
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring() {
    this.page.on('request', request => {
      const requestData = {
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
        size: 0,
        status: 0,
        responseTime: 0
      };
      
      this.networkRequests.push(requestData);
    });

    this.page.on('response', response => {
      const request = this.networkRequests.find(req => 
        req.url === response.url() && req.status === 0
      );
      
      if (request) {
        request.status = response.status();
        request.responseTime = Date.now() - request.timestamp;
        request.size = parseInt(response.headers()['content-length'] || '0');
      }
    });
  }

  async getMetrics(): Promise<PerformanceMetrics> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0;
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      // Get LCP if available
      let largestContentfulPaint = 0;
      if ('PerformanceObserver' in window) {
        try {
          const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
          if (lcpEntries.length > 0) {
            largestContentfulPaint = lcpEntries[lcpEntries.length - 1].startTime;
          }
        } catch (e) {
          // LCP not supported
        }
      }

      // Get memory usage if available
      let memoryUsage = 0;
      if ((performance as any).memory) {
        memoryUsage = (performance as any).memory.usedJSHeapSize;
      }

      return {
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        firstPaint,
        firstContentfulPaint,
        largestContentfulPaint,
        memoryUsage
      };
    });

    return {
      ...metrics,
      networkRequests: this.networkRequests.filter(req => req.status > 0)
    };
  }

  async measureAction<T>(action: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await action();
    const duration = Date.now() - start;
    
    return { result, duration };
  }

  async measureMemoryUsage(): Promise<number> {
    return await this.page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
  }

  async measureNetworkLatency(url: string): Promise<number> {
    const request = this.networkRequests.find(req => req.url.includes(url));
    return request ? request.responseTime : 0;
  }

  getSlowRequests(threshold: number = 1000): NetworkRequest[] {
    return this.networkRequests.filter(req => req.responseTime > threshold);
  }

  getFailedRequests(): NetworkRequest[] {
    return this.networkRequests.filter(req => req.status >= 400);
  }

  getTotalNetworkSize(): number {
    return this.networkRequests.reduce((total, req) => total + req.size, 0);
  }

  async generateReport(): Promise<string> {
    const metrics = await this.getMetrics();
    const slowRequests = this.getSlowRequests();
    const failedRequests = this.getFailedRequests();
    
    return `
Performance Report
==================

Load Metrics:
- Total Load Time: ${metrics.loadTime}ms
- DOM Content Loaded: ${metrics.domContentLoaded}ms
- First Paint: ${metrics.firstPaint}ms
- First Contentful Paint: ${metrics.firstContentfulPaint}ms
- Largest Contentful Paint: ${metrics.largestContentfulPaint}ms

Memory Usage:
- JS Heap Size: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB

Network:
- Total Requests: ${metrics.networkRequests.length}
- Total Size: ${(this.getTotalNetworkSize() / 1024).toFixed(2)} KB
- Slow Requests (>1s): ${slowRequests.length}
- Failed Requests: ${failedRequests.length}

${slowRequests.length > 0 ? `
Slow Requests:
${slowRequests.map(req => `- ${req.method} ${req.url} (${req.responseTime}ms)`).join('\n')}
` : ''}

${failedRequests.length > 0 ? `
Failed Requests:
${failedRequests.map(req => `- ${req.method} ${req.url} (${req.status})`).join('\n')}
` : ''}
    `.trim();
  }
}

export async function measurePageLoad(page: Page, url: string): Promise<PerformanceMetrics> {
  const monitor = new PerformanceMonitor(page);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return await monitor.getMetrics();
}

export async function measureUserAction(
  page: Page, 
  action: () => Promise<void>,
  description: string
): Promise<{ duration: number; memoryBefore: number; memoryAfter: number }> {
  const monitor = new PerformanceMonitor(page);
  
  const memoryBefore = await monitor.measureMemoryUsage();
  const { duration } = await monitor.measureAction(action);
  const memoryAfter = await monitor.measureMemoryUsage();
  
  console.log(`${description}: ${duration}ms (Memory: ${memoryBefore} -> ${memoryAfter})`);
  
  return { duration, memoryBefore, memoryAfter };
}
