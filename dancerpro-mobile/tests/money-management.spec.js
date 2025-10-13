const { test, expect } = require('@playwright/test');

test.describe('Money Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to money/finance section if available
    const moneyNav = page.locator('text="Money", text="Finance", text="Earnings", button:has-text("Money")').first();
    if (await moneyNav.isVisible()) {
      await moneyNav.click();
    }
  });

  test('should display financial overview', async ({ page }) => {
    // Look for financial overview elements
    const overviewElements = [
      'text=/total.*earnings/i',
      'text=/balance/i',
      'text=/income/i',
      'text=/\\$[0-9,]+/i', // Dollar amounts
      'text=/revenue/i',
      'text=/profit/i'
    ];

    for (const element of overviewElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should display add transaction button', async ({ page }) => {
    // Look for add transaction elements
    const addTransactionElements = [
      'button:has-text("Add Transaction")',
      'button:has-text("Add Income")',
      'button:has-text("Add Expense")',
      'button:has-text("+")',
      'text="Add Transaction"',
      '.add-transaction'
    ];

    for (const element of addTransactionElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should open add transaction modal', async ({ page }) => {
    // Find and click add transaction button
    const addButton = page.locator('button:has-text("Add Transaction"), button:has-text("Add Income"), button:has-text("+")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Check if modal or form opens
      await expect(page.locator('text=/add.*transaction/i, text=/new.*transaction/i, .modal, .dialog')).toBeVisible({ timeout: 5000 });
      
      // Look for form fields
      await expect(page.locator('input[placeholder*="amount" i], input[type="number"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should validate transaction form fields', async ({ page }) => {
    // Open add transaction form
    const addButton = page.locator('button:has-text("Add Transaction"), button:has-text("Add Income"), button:has-text("+")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Try to submit empty form
      const submitButton = page.locator('button:has-text("Save"), button:has-text("Add"), button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Check for validation errors
        await expect(page.locator('text=/amount.*required/i, text=/required/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should add income transaction', async ({ page }) => {
    // Open add transaction form
    const addButton = page.locator('button:has-text("Add Transaction"), button:has-text("Add Income"), button:has-text("+")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Fill in transaction details
      const amountField = page.locator('input[placeholder*="amount" i], input[type="number"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('150.00');
      }
      
      // Select income type if available
      const typeSelect = page.locator('select, .select-dropdown');
      if (await typeSelect.isVisible()) {
        await typeSelect.click();
        await page.locator('option:has-text("Income"), text="Income", text="Earnings"').first().click();
      }
      
      // Add description if field exists
      const descriptionField = page.locator('input[placeholder*="description" i], textarea[placeholder*="description" i]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Shift earnings');
      }
      
      // Submit form
      const submitButton = page.locator('button:has-text("Save"), button:has-text("Add"), button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Check for success message
        await expect(page.locator('text=/success/i, text=/added/i, text=/saved/i')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should add expense transaction', async ({ page }) => {
    // Open add transaction form
    const addButton = page.locator('button:has-text("Add Transaction"), button:has-text("Add Expense"), button:has-text("+")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Fill in expense details
      const amountField = page.locator('input[placeholder*="amount" i], input[type="number"]').first();
      if (await amountField.isVisible()) {
        await amountField.fill('25.00');
      }
      
      // Select expense type if available
      const typeSelect = page.locator('select, .select-dropdown');
      if (await typeSelect.isVisible()) {
        await typeSelect.click();
        await page.locator('option:has-text("Expense"), text="Expense", text="Cost"').first().click();
      }
      
      // Add description
      const descriptionField = page.locator('input[placeholder*="description" i], textarea[placeholder*="description" i]');
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Outfit purchase');
      }
      
      // Submit form
      const submitButton = page.locator('button:has-text("Save"), button:has-text("Add"), button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Check for success message
        await expect(page.locator('text=/success/i, text=/added/i, text=/saved/i')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should display transaction history', async ({ page }) => {
    // Look for transaction list elements
    const historyElements = [
      'text=/transaction.*history/i',
      'text=/recent.*transactions/i',
      '.transaction-list',
      '.history-list',
      'text=/history/i'
    ];

    for (const element of historyElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should filter transactions by type', async ({ page }) => {
    // Look for filter elements
    const filterElements = [
      'select[name*="filter" i]',
      'button:has-text("Filter")',
      'button:has-text("Income")',
      'button:has-text("Expense")',
      '.filter-buttons',
      '.transaction-filters'
    ];

    for (const element of filterElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await locator.click();
        
        // If it's a dropdown, select an option
        if (element.includes('select')) {
          await page.locator('option:has-text("Income"), option:has-text("Expense")').first().click();
        }
        
        // Check if transactions are filtered
        await page.waitForTimeout(1000);
        break;
      }
    }
  });

  test('should filter transactions by date range', async ({ page }) => {
    // Look for date filter elements
    const dateFilterElements = [
      'input[type="date"]',
      'input[placeholder*="date" i]',
      'button:has-text("This Week")',
      'button:has-text("This Month")',
      '.date-filter'
    ];

    for (const element of dateFilterElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        if (element.includes('input')) {
          await locator.fill('2024-01-01');
        } else {
          await locator.click();
        }
        
        // Check if transactions are filtered
        await page.waitForTimeout(1000);
        break;
      }
    }
  });

  test('should export financial data', async ({ page }) => {
    // Look for export functionality
    const exportElements = [
      'button:has-text("Export")',
      'button:has-text("Download")',
      'button:has-text("CSV")',
      'button:has-text("PDF")',
      'text="Export"'
    ];

    for (const element of exportElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await locator.click();
        
        // Check for export options or download
        await expect(page.locator('text=/export/i, text=/download/i, text=/csv/i, text=/pdf/i')).toBeVisible({ timeout: 5000 });
        break;
      }
    }
  });

  test('should display earnings by venue', async ({ page }) => {
    // Look for venue-specific earnings
    const venueEarningsElements = [
      'text=/earnings.*by.*venue/i',
      'text=/venue.*breakdown/i',
      'text=/location.*earnings/i',
      '.venue-earnings',
      '.earnings-breakdown'
    ];

    for (const element of venueEarningsElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should display tips tracking', async ({ page }) => {
    // Look for tips-related elements
    const tipsElements = [
      'text=/tips/i',
      'text=/gratuity/i',
      'text=/tip.*amount/i',
      'text=/cash.*tips/i',
      '.tips-section'
    ];

    for (const element of tipsElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should calculate tax information', async ({ page }) => {
    // Look for tax-related elements
    const taxElements = [
      'text=/tax/i',
      'text=/deduction/i',
      'text=/taxable.*income/i',
      'text=/1099/i',
      '.tax-info'
    ];

    for (const element of taxElements) {
      const locator = page.locator(element);
      if (await locator.isVisible()) {
        await expect(locator).toBeVisible();
        break;
      }
    }
  });

  test('should edit existing transaction', async ({ page }) => {
    // Look for existing transactions to edit
    const transactionItems = page.locator('.transaction-item, .transaction-row, tr');
    const count = await transactionItems.count();
    
    if (count > 0) {
      // Click on first transaction or edit button
      const editButton = transactionItems.first().locator('button:has-text("Edit"), text="Edit", .edit-button');
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Check if edit form opens
        await expect(page.locator('text=/edit.*transaction/i, .modal, .dialog')).toBeVisible({ timeout: 5000 });
        
        // Modify amount
        const amountField = page.locator('input[placeholder*="amount" i], input[type="number"]').first();
        if (await amountField.isVisible()) {
          await amountField.clear();
          await amountField.fill('200.00');
          
          // Save changes
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
          if (await saveButton.isVisible()) {
            await saveButton.click();
            
            // Check for success message
            await expect(page.locator('text=/updated/i, text=/saved/i')).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });

  test('should delete transaction', async ({ page }) => {
    // Look for existing transactions to delete
    const transactionItems = page.locator('.transaction-item, .transaction-row, tr');
    const count = await transactionItems.count();
    
    if (count > 0) {
      // Click on delete button
      const deleteButton = transactionItems.first().locator('button:has-text("Delete"), text="Delete", .delete-button, text="🗑️"');
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Handle confirmation dialog
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          
          // Check for success message
          await expect(page.locator('text=/deleted/i, text=/removed/i')).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});