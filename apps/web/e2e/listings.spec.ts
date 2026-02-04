import { test, expect } from '@playwright/test';

const LOCALE = 'en';

test.describe('Listings: search → filter → listing page', () => {
  test('home redirects to locale and shows search', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(en|fr)(\/)?$/);
    await expect(page.getByRole('heading', { name: /Mobility Platform/i })).toBeVisible();
    await expect(page.getByPlaceholder(/City|address/i)).toBeVisible();
  });

  test('listings page loads and shows results for city filter', async ({ page }) => {
    await page.goto(`/${LOCALE}/listings?q=Paris`);
    await expect(page.getByRole('heading', { name: /Listings/i })).toBeVisible();
    await expect(page.getByText(/listing\(s\) found/i)).toBeVisible({ timeout: 10000 });
    const firstListingLink = page.getByRole('link', { name: /Citadine|listing/i }).first();
    await expect(firstListingLink).toBeVisible({ timeout: 5000 });
  });

  test('click listing opens detail page with title and book button', async ({ page }) => {
    await page.goto(`/${LOCALE}/listings?q=Paris`);
    await expect(page.getByRole('heading', { name: /Listings/i })).toBeVisible();
    const link = page.locator('a[href*="/listings/"]').first();
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/[^/]+$`));
    await expect(page.getByRole('heading', { name: /Citadine centre Paris/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /Book/i })).toBeVisible();
  });
});
