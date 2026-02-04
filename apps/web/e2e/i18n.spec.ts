import { test, expect } from '@playwright/test';

test.describe('i18n: change language + fallback EN', () => {
  test('French locale shows French content on listings page', async ({ page }) => {
    await page.goto('/fr/listings');
    await expect(page).toHaveURL(/\/fr\/listings\/location/, { timeout: 10000 });
    await expect(page.getByTestId('listings-location-title')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Ville, aéroport ou adresse/i)).toBeVisible({ timeout: 5000 });
  });

  test('English locale shows English content on listings page', async ({ page }) => {
    await page.goto('/en/listings');
    await expect(page).toHaveURL(/\/en\/listings\/location/, { timeout: 10000 });
    await expect(page.getByTestId('listings-location-title')).toBeVisible({ timeout: 10000 });
  });

  test('French home shows French content', async ({ page }) => {
    await page.goto('/fr');
    await expect(page.getByTestId('header-logo')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /Véhicules/i })).toBeVisible({ timeout: 5000 });
  });

  test('English home shows English content', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByTestId('header-logo')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /Vehicles/i })).toBeVisible({ timeout: 5000 });
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
