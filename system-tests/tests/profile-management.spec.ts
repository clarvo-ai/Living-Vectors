import { expect, test } from '@playwright/test';
import { PROFILE_DATA } from './data/test-data';

const TEST_SESSION_TOKEN = process.env.TEST_SESSION_TOKEN || 'lv-e2e-session-token';

test.describe('User Profile Management', () => {
  test.beforeEach(async ({ page, context }) => {
    // Add test session cookie
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: TEST_SESSION_TOKEN,
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Navigate to profile page
    await page.goto('/dashboard/profile');

    // Wait for profile route shell to load.
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({
      timeout: 5000,
    });

    // Wait for form to be ready
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#phone')).toBeVisible({ timeout: 5000 });
  });

  test('should update profile fields', async ({ page }) => {
    await test.step('User fills in profile form', async () => {
      const { name, phoneNumber } = PROFILE_DATA.validUpdate;

      const displayName = page.locator('#name');
      const phone = page.locator('#phone');

      await displayName.fill(name);
      await phone.fill(phoneNumber);

      await expect(displayName).toHaveValue(name);
      await expect(phone).toHaveValue(phoneNumber);
    });

    await test.step('User submits profile changes', async () => {
      const saveButton = page.getByRole('button', { name: 'Save Changes' });
      await saveButton.click();

      // App redirects to dashboard on successful save.
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await expect(page).not.toHaveURL('**/login');
    });
  });

  test('should persist data after page refresh', async ({ page }, testInfo) => {
    const testValue = `Persistence ${testInfo.project.name} ${Date.now()}`;

    await test.step('User modifies and saves display name', async () => {
      const displayName = page.locator('#name');
      await displayName.fill(testValue);

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/api/profile') &&
            response.request().method() === 'PUT' &&
            response.status() === 200
        ),
        page.getByRole('button', { name: 'Save Changes' }).click(),
      ]);

      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    });

    await test.step('Saved value persists in profile API response', async () => {
      const response = await page.request.get('/api/profile');
      expect(response.ok()).toBeTruthy();

      const payload = await response.json();
      expect(payload?.body?.name).toBe(testValue);
    });
  });
});
