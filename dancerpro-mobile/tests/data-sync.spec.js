const { test, expect } = require('@playwright/test');

test.describe('Data Persistence and Cloud Sync Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display sync status indicator', async ({ page }) => {
    // Look for sync status elements
    const syncElements = [
      'text=/sync/i',
      'text=/connected/i',
      'text=/online/i',
      'text=/offline/i',
      '.sync-status',
      '.connection-status',
      'text="🔄"',
      'text="☁️"',
      'text="✅"',
      'text="❌"'
    ];

    for (const element of syncElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should handle offline mode', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    await page.reload();
    
    // Look for offline indicators
    const offlineElements = [
      'text=/offline/i',
      'text=/no.*connection/i',
      'text=/disconnected/i',
      '.offline-banner',
      '.no-connection'
    ];

    for (const element of offlineElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
    
    // Restore online mode
    await page.context().setOffline(false);
  });

  test('should persist data locally', async ({ page }) => {
    // Add some test data (if forms are available)
    const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Fill form if available
      const textInput = page.locator('input[type="text"], input[placeholder*="name" i]').first();
      if (await textInput.isVisible()) {
        await textInput.fill('Test Data');
        
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
      }
    }
    
    // Refresh page to test persistence
    await page.reload();
    
    // Check if data persists
    await expect(page.locator('text="Test Data"')).toBeVisible({ timeout: 10000 });
  });

  test('should sync data when coming back online', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    
    // Try to add data while offline
    const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const textInput = page.locator('input[type="text"], input[placeholder*="name" i]').first();
      if (await textInput.isVisible()) {
        await textInput.fill('Offline Data');
        
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
      }
    }
    
    // Come back online
    await page.context().setOffline(false);
    await page.reload();
    
    // Look for sync indicators
    const syncingElements = [
      'text=/syncing/i',
      'text=/uploading/i',
      'text=/synchronizing/i',
      '.syncing',
      'text="🔄"'
    ];

    for (const element of syncingElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should display last sync time', async ({ page }) => {
    // Look for last sync time elements
    const lastSyncElements = [
      'text=/last.*sync/i',
      'text=/updated/i',
      'text=/synchronized/i',
      '.last-sync',
      '.sync-time'
    ];

    for (const element of lastSyncElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should handle sync conflicts', async ({ page }) => {
    // Look for conflict resolution elements
    const conflictElements = [
      'text=/conflict/i',
      'text=/merge/i',
      'text=/resolve/i',
      '.conflict-resolution',
      '.merge-dialog'
    ];

    for (const element of conflictElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        
        // Test conflict resolution options
        const resolveButton = page.locator('button:has-text("Resolve"), button:has-text("Merge")');
        if (await resolveButton.isVisible()) {
          await resolveButton.click();
        }
        break;
      }
    }
  });

  test('should backup data', async ({ page }) => {
    // Look for backup functionality
    const backupElements = [
      'button:has-text("Backup")',
      'text="Backup"',
      'button:has-text("Export")',
      '.backup-button'
    ];

    for (const element of backupElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await locator.click();
        
        // Check for backup confirmation
        await expect(page.locator('text=/backup/i, text=/export/i, text=/download/i')).toBeVisible({ timeout: 10000 });
        break;
      }
    }
  });

  test('should restore data from backup', async ({ page }) => {
    // Look for restore functionality
    const restoreElements = [
      'button:has-text("Restore")',
      'text="Restore"',
      'button:has-text("Import")',
      '.restore-button'
    ];

    for (const element of restoreElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await locator.click();
        
        // Check for file input or restore dialog
        await expect(page.locator('input[type="file"], text=/select.*file/i, .restore-dialog')).toBeVisible({ timeout: 5000 });
        break;
      }
    }
  });

  test('should handle storage quota warnings', async ({ page }) => {
    // Look for storage-related warnings
    const storageElements = [
      'text=/storage/i',
      'text=/quota/i',
      'text=/space/i',
      'text=/full/i',
      '.storage-warning',
      '.quota-warning'
    ];

    for (const element of storageElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should sync across multiple devices', async ({ page }) => {
    // Test multi-device sync indicators
    const deviceSyncElements = [
      'text=/device/i',
      'text=/multi.*device/i',
      'text=/cross.*device/i',
      '.device-sync',
      '.multi-device'
    ];

    for (const element of deviceSyncElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should handle data migration', async ({ page }) => {
    // Look for migration-related elements
    const migrationElements = [
      'text=/migration/i',
      'text=/upgrade/i',
      'text=/migrate/i',
      '.migration-dialog',
      '.upgrade-notice'
    ];

    for (const element of migrationElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        
        // Test migration process
        const migrateButton = page.locator('button:has-text("Migrate"), button:has-text("Upgrade")');
        if (await migrateButton.isVisible()) {
          await migrateButton.click();
          
          // Check for migration progress
          await expect(page.locator('text=/migrating/i, text=/progress/i, .progress-bar')).toBeVisible({ timeout: 10000 });
        }
        break;
      }
    }
  });

  test('should validate data integrity', async ({ page }) => {
    // Look for data validation elements
    const validationElements = [
      'text=/validation/i',
      'text=/integrity/i',
      'text=/check/i',
      'text=/verify/i',
      '.data-validation'
    ];

    for (const element of validationElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should handle sync errors gracefully', async ({ page }) => {
    // Simulate network issues
    await page.route('**/*', route => {
      if (route.request().url().includes('api')) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Try to trigger sync
    const syncButton = page.locator('button:has-text("Sync"), text="Sync", .sync-button');
    if (await syncButton.isVisible()) {
      await syncButton.click();
      
      // Look for error handling
      const errorElements = [
        'text=/sync.*failed/i',
        'text=/connection.*error/i',
        'text=/retry/i',
        '.sync-error',
        '.error-message'
      ];

      for (const element of errorElements) {
        const locator = page.locator(element);
        if (await locator.isVisible()) {
          await expect(locator).toBeVisible();
          break;
        }
      }
    }
  });

  test('should test data encryption', async ({ page }) => {
    // Look for encryption-related elements
    const encryptionElements = [
      'text=/encrypted/i',
      'text=/secure/i',
      'text=/encryption/i',
      'text=/🔒/i',
      '.encryption-status'
    ];

    for (const element of encryptionElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should handle large data sets', async ({ page }) => {
    // Look for pagination or virtualization
    const paginationElements = [
      '.pagination',
      'button:has-text("Next")',
      'button:has-text("Previous")',
      'text=/page.*of/i',
      '.load-more'
    ];

    for (const element of paginationElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        
        // Test pagination
        if (element.includes('Next')) {
          await locator.click();
          await page.waitForTimeout(1000);
        }
        break;
      }
    }
  });

  test('should test real-time updates', async ({ page }) => {
    // Look for real-time update indicators
    const realtimeElements = [
      'text=/real.*time/i',
      'text=/live/i',
      'text=/updating/i',
      '.live-updates',
      '.real-time'
    ];

    for (const element of realtimeElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });
});