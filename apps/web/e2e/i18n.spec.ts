import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('i18n: change language + fallback EN', () => {
  test('French locale shows French content on location page', async ({ page }) => {
    await page.goto('/fr/listings');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/fr\/location/, { timeout: 15000 });
    await expect(page.getByTestId('listings-location-title')).toBeVisible({ timeout: 15000 });
    // Location page shows ListingsGrid (no search bar): assert French grid copy
    await expect(
      page.getByText(/annonce\(s\) trouvée\(s\)|Aucune annonce|Chargement/i),
    ).toBeVisible({ timeout: 15000 });
  });

  test('English locale shows English content on location page', async ({ page }) => {
    await page.goto('/en/listings');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/en\/location/, { timeout: 15000 });
    await expect(page.getByTestId('listings-location-title')).toBeVisible({ timeout: 15000 });
  });

  test('French home shows French content', async ({ page }) => {
    await page.goto('/fr');
    await waitForAppReady(page);
    await expect(page.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('nav-link-location')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-link-location')).toHaveText(/Véhicules/i);
  });

  test('English home shows English content', async ({ page }) => {
    await page.goto('/en');
    await waitForAppReady(page);
    await expect(page.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('nav-link-location')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-link-location')).toHaveText(/Vehicles/i);
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
