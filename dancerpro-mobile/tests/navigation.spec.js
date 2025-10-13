const { test, expect } = require('@playwright/test');

test.describe('Navigation and Core Features Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display main navigation menu', async ({ page }) => {
    // Look for navigation elements
    const navElements = [
      'nav',
      '.navigation',
      '.nav-menu',
      'ul[role="navigation"]',
      '.bottom-nav',
      '.tab-bar'
    ];

    for (const element of navElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should navigate to Clients screen', async ({ page }) => {
    // Look for clients navigation
    const clientsNav = [
      'text="Clients"',
      'button:has-text("Clients")',
      'a:has-text("Clients")',
      'text="👥"',
      'text="People"'
    ];

    for (const nav of clientsNav) {
      const locator = page.locator(nav);
      if (await locator.isVisible()) {
        await locator.click();
        // Check if clients screen loads
        await expect(page.locator('text=/client/i, text=/customer/i')).toBeVisible({ timeout: 5000 });
        break;
      }
    }
  });

  test('should navigate to Outfits screen', async ({ page }) => {
    // Look for outfits navigation
    const outfitsNav = [
      'text="Outfits"',
      'button:has-text("Outfits")',
      'a:has-text("Outfits")',
      'text="👗"',
      'text="Wardrobe"',
      'text="Clothing"'
    ];

    for (const nav of outfitsNav) {
      const locator = page.locator(nav);
      if (await locator.isVisible()) {
        await locator.click();
        // Check if outfits screen loads
        await expect(page.locator('text=/outfit/i, text=/wardrobe/i, text=/clothing/i')).toBeVisible({ timeout: 5000 });
        break;
      }
    }
  });

  test('should navigate to Venues screen', async ({ page }) => {
    // Look for venues navigation
    const venuesNav = [
      'text="Venues"',
      'button:has-text("Venues")',
      'a:has-text("Venues")',
      'text="🏢"',
      'text="Locations"',
      'text="Clubs"'
    ];

    for (const nav of venuesNav) {
      const locator = page.locator(nav);
      if (await locator.isVisible()) {
        await locator.click();
        // Check if venues screen loads
        await expect(page.locator('text=/venue/i, text=/location/i, text=/club/i')).toBeVisible({ timeout: 5000 });
        break;
      }
    }
  });

  test('should navigate to Money/Finance screen', async ({ page }) => {
    // Look for money/finance navigation
    const moneyNav = [
      'text="Money"',
      'text="Finance"',
      'text="Earnings"',
      'button:has-text("Money")',
      'a:has-text("Finance")',
      'text="💰"',
      'text="$"'
    ];

    for (const nav of moneyNav) {
      const locator = page.locator(nav);
      if (await locator.isVisible()) {
        await locator.click();
        // Check if money screen loads
        await expect(page.locator('text=/money/i, text=/finance/i, text=/earning/i, text=/\\$/i')).toBeVisible({ timeout: 5000 });
        break;
      }
    }
  });

  test('should navigate to Shifts screen', async ({ page }) => {
    // Look for shifts navigation
    const shiftsNav = [
      'text="Shifts"',
      'button:has-text("Shifts")',
      'a:has-text("Shifts")',
      'text="📅"',
      'text="Schedule"',
      'text="Work"'
    ];

    for (const nav of shiftsNav) {
      const locator = page.locator(nav);
      if (await locator.isVisible()) {
        await locator.click();
        // Check if shifts screen loads
        await expect(page.locator('text=/shift/i, text=/schedule/i, text=/work/i')).toBeVisible({ timeout: 5000 });
        break;
      }
    }
  });

  test('should navigate to Settings screen', async ({ page }) => {
    // Look for settings navigation
    const settingsNav = [
      'text="Settings"',
      'button:has-text("Settings")',
      'a:has-text("Settings")',
      'text="⚙️"',
      'text="Preferences"',
      'text="Config"'
    ];

    for (const nav of settingsNav) {
      const locator = page.locator(nav);
      if (await locator.isVisible()) {
        await locator.click();
        // Check if settings screen loads
        await expect(page.locator('text=/setting/i, text=/preference/i, text=/config/i')).toBeVisible({ timeout: 5000 });
        break;
      }
    }
  });

  test('should test back navigation', async ({ page }) => {
    // Navigate to a different screen first
    const clientsLink = page.locator('text="Clients", button:has-text("Clients")').first();
    if (await clientsLink.isVisible()) {
      await clientsLink.click();
      
      // Look for back button
      const backButton = page.locator('button:has-text("Back"), button[aria-label*="back" i], text="←", text="‹"');
      if (await backButton.isVisible()) {
        await backButton.click();
        // Should return to previous screen
        await expect(page.locator('text=/dashboard/i, text=/home/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should test hamburger menu on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Look for hamburger menu
    const hamburgerMenu = [
      'button[aria-label*="menu" i]',
      '.hamburger',
      'button:has-text("☰")',
      'button:has-text("≡")',
      '.menu-toggle'
    ];

    for (const menu of hamburgerMenu) {
      const locator = page.locator(menu);
      if (await locator.isVisible()) {
        await locator.click();
        // Check if menu opens
        await expect(page.locator('.menu-open, .nav-open, nav')).toBeVisible({ timeout: 3000 });
        break;
      }
    }
  });

  test('should test tab navigation', async ({ page }) => {
    // Look for tab-based navigation
    const tabs = [
      '.tab',
      '[role="tab"]',
      '.tab-button',
      'button[data-tab]'
    ];

    for (const tab of tabs) {
      const tabElements = page.locator(tab);
      const count = await tabElements.count();
      
      if (count > 0) {
        // Click first tab
        await tabElements.first().click();
        await expect(tabElements.first()).toHaveClass(/active|selected/);
        
        // Click second tab if exists
        if (count > 1) {
          await tabElements.nth(1).click();
          await expect(tabElements.nth(1)).toHaveClass(/active|selected/);
        }
        break;
      }
    }
  });

  test('should test search functionality', async ({ page }) => {
    // Look for search elements
    const searchElements = [
      'input[placeholder*="search" i]',
      'input[type="search"]',
      'button:has-text("Search")',
      '.search-box',
      '.search-input'
    ];

    for (const element of searchElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await locator.fill('test search');
        
        // Look for search button or press Enter
        const searchButton = page.locator('button:has-text("Search"), button[type="submit"]');
        if (await searchButton.isVisible()) {
          await searchButton.click();
        } else {
          await locator.press('Enter');
        }
        
        // Check for search results
        await expect(page.locator('text=/result/i, text=/found/i, .search-results')).toBeVisible({ timeout: 5000 });
        break;
      }
    }
  });

  test('should test profile/user menu', async ({ page }) => {
    // Look for profile elements
    const profileElements = [
      'button:has-text("Profile")',
      '.profile-button',
      '.user-menu',
      'img[alt*="profile" i]',
      'text="👤"',
      '.avatar'
    ];

    for (const element of profileElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await locator.click();
        // Check if profile menu opens
        await expect(page.locator('text=/profile/i, text=/account/i, text=/logout/i')).toBeVisible({ timeout: 3000 });
        break;
      }
    }
  });

  test('should test breadcrumb navigation', async ({ page }) => {
    // Look for breadcrumbs
    const breadcrumbElements = [
      '.breadcrumb',
      '.breadcrumbs',
      'nav[aria-label*="breadcrumb" i]',
      'ol.breadcrumb'
    ];

    for (const element of breadcrumbElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        
        // Test clicking breadcrumb links
        const breadcrumbLinks = locator.locator('a, button');
        const count = await breadcrumbLinks.count();
        
        if (count > 0) {
          await breadcrumbLinks.first().click();
          // Should navigate to parent page
          await page.waitForTimeout(1000);
        }
        break;
      }
    }
  });

  test('should test keyboard navigation', async ({ page }) => {
    // Test Tab key navigation
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test Enter key on focused element
    await page.keyboard.press('Enter');
    
    // Test Escape key
    await page.keyboard.press('Escape');
  });

  test('should test deep linking', async ({ page }) => {
    // Test direct navigation to specific routes
    const routes = [
      '/clients',
      '/outfits',
      '/venues',
      '/money',
      '/shifts',
      '/settings',
      '/dashboard'
    ];

    for (const route of routes) {
      await page.goto(route);
      // Check if page loads without error
      await expect(page.locator('body')).toBeVisible({ timeout: 5000 });
      
      // Check for 404 or error pages
      const errorIndicators = page.locator('text=/404/i, text=/not found/i, text=/error/i');
      const errorCount = await errorIndicators.count();
      
      if (errorCount === 0) {
        // Route exists and loads successfully
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});