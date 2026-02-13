import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

const LOCALE = 'en';

test.describe('Admin: validate / moderate listing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, LOCALE);
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

    const acceptSuspensionPrompt = () => {
      page.once('dialog', (dialog) => dialog.accept('E2E test suspension reason'));
    };

    if (otherStatus === 'SUSPENDED') acceptSuspensionPrompt();
    await select.selectOption(otherStatus);
    await expect(select).toHaveValue(otherStatus, { timeout: 15000 });

    if (currentValue === 'SUSPENDED') acceptSuspensionPrompt();
    await select.selectOption(currentValue);
    await expect(select).toHaveValue(currentValue, { timeout: 15000 });
  });

  test('admin can reach users page', async ({ page }) => {
    await page.locator('a[href*="/admin/users"]').click();
    await expect(page).toHaveURL(/\/(en|fr)\/admin\/users/);
    await expect(page.getByRole('heading', { name: /Users/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/total/i)).toBeVisible({ timeout: 5000 });
  });

  test('admin can reach audit page', async ({ page }) => {
    await page.locator('a[href*="/admin/audit"]').click();
    await expect(page).toHaveURL(/\/(en|fr)\/admin\/audit/);
    await expect(page.getByRole('heading', { name: /Audit logs/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/entries/i)).toBeVisible({ timeout: 5000 });
  });
});
