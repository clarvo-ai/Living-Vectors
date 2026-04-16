import { expect, test } from '@playwright/test';

const TEST_SESSION_TOKEN = process.env.TEST_SESSION_TOKEN || 'lv-e2e-session-token';

test.describe('User Profile Management', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: TEST_SESSION_TOKEN,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard/profile');

    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#phone')).toBeVisible({ timeout: 5000 });
  });

  test('should persist data after page refresh', async ({ page }) => {
    const testFirstName = `A`;
    const testLastName = `B`;
    const testName = `C`;
    const testPhone = `+358676767`;
    const testBio = `Test bio`;

    await test.step('User modifies and saves first name, last name, display name, phone number, and bio', async () => {
      const displayName = page.locator('#name');
      const firstName = page.locator('#first_name');
      const lastName = page.locator('#last_name');
      const phone = page.locator('#phone');
      const bio = page.locator('#bio');

      await firstName.fill(testFirstName);
      await lastName.fill(testLastName);
      await displayName.fill(testName);
      await phone.fill(testPhone);
      await bio.fill(testBio);

      await page.getByRole('button', { name: 'Save Changes' }).click();
      await page.waitForTimeout(500);
      await page.reload({ waitUntil: 'networkidle' });
    });

    await test.step('Saved values persist after refresh', async () => {
      await page.waitForTimeout(500);
      await expect(page.locator('#first_name')).toHaveValue(testFirstName);
      await expect(page.locator('#last_name')).toHaveValue(testLastName);
      await expect(page.locator('#name')).toHaveValue(testName);
      await expect(page.locator('#phone')).toHaveValue(testPhone);
      await expect(page.locator('#bio')).toHaveValue(testBio);
    });
  });
});
