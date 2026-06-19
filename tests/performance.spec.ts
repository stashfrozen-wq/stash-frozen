import { test, expect } from '@playwright/test';

test.describe('Performance Testing', () => {
  test('Debts Report page meets performance budgets', async ({ page }) => {
    // Navigate to the page
    await page.goto('/reports/debts');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded');

    // Extract metrics using the browser's native Performance API
    const metrics = await page.evaluate(() => {
      const timing = window.performance.timing;
      const navigationStart = timing.navigationStart;
      
      // Calculate paint metrics
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      
      return {
        // Time to First Byte (backend response time)
        ttfb: timing.responseStart - navigationStart,
        // Time to interactive
        domInteractive: timing.domInteractive - navigationStart,
        // Full Page Load
        pageLoad: timing.loadEventEnd - navigationStart,
        // First Contentful Paint
        fcp: fcp ? fcp.startTime : 0,
      };
    });

    console.log(`Performance Metrics for /reports/debts:`);
    console.table(metrics);

    // Performance Budgets (Adjust these thresholds based on your goals!)
    // Expected TTFB < 1000ms (relaxed for local testing)
    expect(metrics.ttfb).toBeLessThan(1000);
    
    // Expected DOM Interactive < 1500ms
    expect(metrics.domInteractive).toBeLessThan(1500);
    
    // Expected Page Load < 3000ms
    expect(metrics.pageLoad).toBeLessThan(3000);
  });
});
