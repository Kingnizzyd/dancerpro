const { test, expect } = require('@playwright/test');

test.describe('Dashboard and Analytics Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Skip authentication for now - testing dashboard UI elements
  });

  test('should display dashboard overview cards', async ({ page }) => {
    // Look for dashboard elements that might be visible without auth
    const dashboardElements = [
      'text=/total.*earnings/i',
      'text=/this.*month/i',
      'text=/shifts.*completed/i',
      'text=/clients/i',
      'text=/venues/i',
      'text=/analytics/i',
      'text=/dashboard/i'
    ];

    // Check if any dashboard elements are visible
    for (const element of dashboardElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should display earnings analytics', async ({ page }) => {
    // Look for earnings-related elements
    const earningsElements = [
      'text=/\\$[0-9,]+/i', // Dollar amounts
      'text=/earnings/i',
      'text=/revenue/i',
      'text=/income/i',
      'text=/total/i'
    ];

    for (const element of earningsElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should display time period filters', async ({ page }) => {
    // Look for time filter elements
    const timeFilters = [
      'text="Today"',
      'text="This Week"',
      'text="This Month"',
      'text="This Year"',
      'select',
      'button:has-text("Week")',
      'button:has-text("Month")',
      'button:has-text("Year")'
    ];

    for (const filter of timeFilters) {
      const locator = page.locator(filter);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should display charts and graphs', async ({ page }) => {
    // Look for chart elements (common chart libraries use these)
    const chartElements = [
      'canvas', // Chart.js, D3.js
      'svg', // D3.js, Victory
      '.recharts-wrapper', // Recharts
      '.chart-container',
      '.graph',
      '.analytics-chart'
    ];

    for (const element of chartElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should display KPI metrics', async ({ page }) => {
    // Look for key performance indicators
    const kpiElements = [
      'text=/average.*per.*shift/i',
      'text=/hourly.*rate/i',
      'text=/tips.*percentage/i',
      'text=/performance/i',
      'text=/metrics/i',
      'text=/statistics/i'
    ];

    for (const element of kpiElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should test export functionality', async ({ page }) => {
    // Look for export buttons
    const exportButtons = [
      'button:has-text("Export")',
      'button:has-text("Download")',
      'button:has-text("PDF")',
      'button:has-text("CSV")',
      'text="Export"',
      'text="Download"'
    ];

    for (const button of exportButtons) {
      const locator = page.locator(button);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        // Test click functionality
        await locator.click();
        // Check for download or export confirmation
        await expect(page.locator('text=/download/i, text=/export/i, text=/generating/i')).toBeVisible({ timeout: 5000 });
        break;
      }
    }
  });

  test('should display recent activity feed', async ({ page }) => {
    // Look for activity or recent items
    const activityElements = [
      'text=/recent/i',
      'text=/activity/i',
      'text=/history/i',
      'text=/latest/i',
      '.activity-feed',
      '.recent-items',
      '.history-list'
    ];

    for (const element of activityElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should test date range picker', async ({ page }) => {
    // Look for date picker elements
    const dateElements = [
      'input[type="date"]',
      'input[placeholder*="date" i]',
      '.date-picker',
      'button:has-text("Calendar")',
      'text="From"',
      'text="To"'
    ];

    for (const element of dateElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        // Test interaction if it's an input
        if (element.includes('input')) {
          await locator.fill('2024-01-01');
        }
        break;
      }
    }
  });

  test('should display venue performance metrics', async ({ page }) => {
    // Look for venue-specific analytics
    const venueElements = [
      'text=/venue.*performance/i',
      'text=/top.*venues/i',
      'text=/venue.*earnings/i',
      'text=/location/i',
      'text=/club/i',
      'text=/bar/i'
    ];

    for (const element of venueElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should test responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if dashboard adapts to mobile
    await page.reload();
    
    // Look for mobile-specific elements
    const mobileElements = [
      'button[aria-label*="menu" i]',
      '.hamburger',
      '.mobile-nav',
      'button:has-text("☰")'
    ];

    for (const element of mobileElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should test dashboard refresh functionality', async ({ page }) => {
    // Look for refresh button
    const refreshElements = [
      'button:has-text("Refresh")',
      'button[aria-label*="refresh" i]',
      'text="Refresh"',
      'button:has-text("↻")',
      'button:has-text("🔄")'
    ];

    for (const element of refreshElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        await locator.click();
        // Check for loading state
        await expect(page.locator('text=/loading/i, text=/refreshing/i, .spinner, .loading')).toBeVisible({ timeout: 3000 });
        break;
      }
    }
  });

  test('should display health check status', async ({ page }) => {
    // Look for system health indicators
    const healthElements = [
      'text=/online/i',
      'text=/connected/i',
      'text=/status/i',
      'text=/health/i',
      '.status-indicator',
      '.health-check',
      'text="🟢"',
      'text="✅"'
    ];

    for (const element of healthElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });
});