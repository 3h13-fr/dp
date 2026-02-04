import { test, expect } from '@playwright/test';

test.describe('i18n: change language + fallback EN', () => {
  test('French locale shows French content on listings page', async ({ page }) => {
    await page.goto('/fr/listings');
    await expect(page).toHaveURL(/\/fr\/listings/);
    await expect(page.getByRole('heading', { name: /Annonces/i })).toBeVisible({ timeout: 5000 });
  });

  test('English locale shows English content on listings page', async ({ page }) => {
    await page.goto('/en/listings');
    await expect(page).toHaveURL(/\/en\/listings/);
    await expect(page.getByRole('heading', { name: /Listings/i })).toBeVisible({ timeout: 5000 });
  });

  test('French home shows French title', async ({ page }) => {
    await page.goto('/fr');
    await expect(page.getByRole('heading', { name: /Plateforme de mobilité/i })).toBeVisible({ timeout: 5000 });
  });

  test('English home shows English title', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { name: /Mobility Platform/i })).toBeVisible({ timeout: 5000 });
  });

  test('invalid locale falls back to 404 or default', async ({ page }) => {
    const res = await page.goto('/de/listings');
    const status = res?.status();
    const url = page.url();
    const is404 = status === 404 || url.includes('not-found') || await page.getByText(/not found|404/i).isVisible().catch(() => false);
    const isRedirectToEn = url.includes('/en/');
    expect(is404 || isRedirectToEn).toBeTruthy();
  });
});
