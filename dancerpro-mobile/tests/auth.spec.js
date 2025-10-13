const { test, expect } = require('@playwright/test');

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login screen on app load', async ({ page }) => {
    // Check if login elements are visible
    await expect(page.locator('text=Welcome to DancerPro')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder*="email" i], input[placeholder*="username" i]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[placeholder*="password" i]')).toBeVisible();
    await expect(page.locator('button:has-text("Login"), button:has-text("Sign In")')).toBeVisible();
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    // Try to submit empty login form
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
    await loginButton.click();
    
    // Check for validation messages
    await expect(page.locator('text=/email.*required/i, text=/username.*required/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/password.*required/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[placeholder*="email" i], input[placeholder*="username" i]', 'invalid@test.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'wrongpassword');
    
    // Submit login form
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
    await loginButton.click();
    
    // Check for error message
    await expect(page.locator('text=/invalid.*credentials/i, text=/login.*failed/i, text=/incorrect/i')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to signup screen', async ({ page }) => {
    // Look for signup link or button
    const signupLink = page.locator('text="Sign Up", text="Register", text="Create Account", button:has-text("Sign Up")').first();
    await signupLink.click();
    
    // Check if signup form is visible
    await expect(page.locator('text=/create.*account/i, text=/sign.*up/i, text=/register/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder*="email" i]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[placeholder*="password" i]')).toBeVisible();
  });

  test('should show validation errors for empty signup form', async ({ page }) => {
    // Navigate to signup
    const signupLink = page.locator('text="Sign Up", text="Register", text="Create Account", button:has-text("Sign Up")').first();
    await signupLink.click();
    
    // Try to submit empty signup form
    const signupButton = page.locator('button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")').first();
    await signupButton.click();
    
    // Check for validation messages
    await expect(page.locator('text=/email.*required/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/password.*required/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate email format in signup', async ({ page }) => {
    // Navigate to signup
    const signupLink = page.locator('text="Sign Up", text="Register", text="Create Account", button:has-text("Sign Up")').first();
    await signupLink.click();
    
    // Fill invalid email
    await page.fill('input[placeholder*="email" i]', 'invalid-email');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'password123');
    
    // Submit form
    const signupButton = page.locator('button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")').first();
    await signupButton.click();
    
    // Check for email validation error
    await expect(page.locator('text=/invalid.*email/i, text=/email.*format/i')).toBeVisible({ timeout: 5000 });
  });

  test('should test password strength validation', async ({ page }) => {
    // Navigate to signup
    const signupLink = page.locator('text="Sign Up", text="Register", text="Create Account", button:has-text("Sign Up")').first();
    await signupLink.click();
    
    // Fill weak password
    await page.fill('input[placeholder*="email" i]', 'test@example.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', '123');
    
    // Submit form
    const signupButton = page.locator('button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")').first();
    await signupButton.click();
    
    // Check for password strength error
    await expect(page.locator('text=/password.*weak/i, text=/password.*short/i, text=/password.*requirements/i')).toBeVisible({ timeout: 5000 });
  });

  test('should handle successful signup flow', async ({ page }) => {
    // Navigate to signup
    const signupLink = page.locator('text="Sign Up", text="Register", text="Create Account", button:has-text("Sign Up")').first();
    await signupLink.click();
    
    // Fill valid signup data
    const timestamp = Date.now();
    await page.fill('input[placeholder*="email" i]', `test${timestamp}@example.com`);
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'SecurePassword123!');
    
    // Fill additional fields if present
    const nameField = page.locator('input[placeholder*="name" i], input[placeholder*="full name" i]');
    if (await nameField.isVisible()) {
      await nameField.fill('Test User');
    }
    
    // Submit form
    const signupButton = page.locator('button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")').first();
    await signupButton.click();
    
    // Check for success message or redirect to dashboard
    await expect(page.locator('text=/success/i, text=/welcome/i, text=/dashboard/i, text=/account.*created/i')).toBeVisible({ timeout: 15000 });
  });

  test('should handle biometric authentication if available', async ({ page }) => {
    // Check if biometric option is available
    const biometricButton = page.locator('button:has-text("Face ID"), button:has-text("Touch ID"), button:has-text("Biometric"), text="Use Biometric"');
    
    if (await biometricButton.isVisible()) {
      await biometricButton.click();
      // Note: Actual biometric testing would require device-specific setup
      // This test just verifies the UI element exists
      await expect(biometricButton).toBeVisible();
    }
  });

  test('should test forgot password functionality', async ({ page }) => {
    // Look for forgot password link
    const forgotPasswordLink = page.locator('text="Forgot Password", text="Reset Password", a:has-text("Forgot")');
    
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      
      // Check if password reset form appears
      await expect(page.locator('input[placeholder*="email" i]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('button:has-text("Reset"), button:has-text("Send")')).toBeVisible();
      
      // Test email submission
      await page.fill('input[placeholder*="email" i]', 'test@example.com');
      await page.click('button:has-text("Reset"), button:has-text("Send")');
      
      // Check for confirmation message
      await expect(page.locator('text=/email.*sent/i, text=/check.*email/i, text=/reset.*link/i')).toBeVisible({ timeout: 10000 });
    }
  });
});