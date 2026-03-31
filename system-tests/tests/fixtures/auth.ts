import { test as base, Page } from '@playwright/test';

export type TestFixtures = {
  authenticatedPage: Page;
  testEmail: string;
  testPassword: string;
};

export const test = base.extend<TestFixtures>({
  testEmail: 'systest@livingvectors.test',
  testPassword: 'TestPassword123!',

  authenticatedPage: async ({ page, testEmail, testPassword }, use) => {
    // Navigate to login page
    await page.goto('/auth/login');

    // Fill in credentials
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    // Submit login form
    await page.click('button:has-text("Sign in")');

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Use the authenticated page
    await use(page);

    // Cleanup: logout
    await page.goto('/auth/logout');
  },
});

export { expect } from '@playwright/test';
