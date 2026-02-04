import { test, expect } from '@playwright/test';

const LOCALE = 'en';

const LOGIN_DEMO = `/${LOCALE}/login?demo=1`;

test.describe('Admin: validate / moderate listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_DEMO);
    const demoSection = page.getByTestId('demo-login-section');
    await expect(demoSection).toBeVisible({ timeout: 20000 });
    await demoSection.getByPlaceholder('Email').fill('mohamedsakho@drivepark.net', { timeout: 10000 });
    await demoSection.getByPlaceholder('Password').fill('demo', { timeout: 10000 });
    await demoSection.getByRole('button', { name: /Sign in/i }).click({ timeout: 10000 });
    await expect(page).toHaveURL(/\/(en|fr)\/admin/, { timeout: 15000 });
  });

  test('admin sees listings moderation page', async ({ page }) => {
    await page.locator('a[href*="/admin/listings"]').click();
    await expect(page).toHaveURL(/\/(en|fr)\/admin\/listings/);
    await expect(page.getByRole('heading', { name: /Listings \(moderation\)/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/total/i)).toBeVisible();
  });

  test('admin can change listing status (e.g. ACTIVE → SUSPENDED and back)', async ({ page }) => {
    await page.goto(`/${LOCALE}/admin/listings`);
    await expect(page.getByRole('heading', { name: /Listings \(moderation\)/i })).toBeVisible({ timeout: 10000 });

    const row = page.locator('div.rounded-lg.border.p-4').filter({ has: page.locator('select') }).first();
    await expect(row).toBeVisible({ timeout: 5000 });
    const select = row.locator('select');
    await expect(select).toBeVisible();
    const currentValue = await select.inputValue();
    const otherStatus = currentValue === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await select.selectOption(otherStatus);
    await expect(select).toHaveValue(otherStatus);
    await select.selectOption(currentValue);
    await expect(select).toHaveValue(currentValue);
  });
});
