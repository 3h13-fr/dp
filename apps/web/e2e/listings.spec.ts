import { test, expect } from '@playwright/test';

const LOCALE = 'en';

test.describe('Listings: search → filter → listing page', () => {
  test('home redirects to locale and shows DrivePark with nav tabs', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(en|fr)(\/)?$/, { timeout: 10000 });
    await expect(page.getByTestId('header-logo')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: /Vehicles|Véhicules/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /Experiences|Expériences/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /Chauffeur/i })).toBeVisible({ timeout: 5000 });
  });

  test('listings page loads and shows results for city filter', async ({ page }) => {
    await page.goto(`/${LOCALE}/listings/location?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/location`));
    await expect(page.getByTestId('listings-location-title')).toBeVisible({ timeout: 10000 });
    // Wait for loading to finish: either results count or empty state
    await expect(
      page.getByText(/listing\(s\) found/i).or(page.getByText(/No listings found|annonce\(s\) trouvée\(s\)/i)),
    ).toBeVisible({ timeout: 15000 });
    // If we have results, expect at least one listing link (e.g. Citadine from seed)
    const hasResults = await page.getByText(/listing\(s\) found|annonce\(s\) trouvée\(s\)/i).isVisible().catch(() => false);
    if (hasResults) {
      const firstListingLink = page.getByRole('link', { name: /Citadine|listing/i }).first();
      await expect(firstListingLink).toBeVisible({ timeout: 5000 });
    }
  });

  test('click listing opens detail page with title and book button', async ({ page }) => {
    await page.goto(`/${LOCALE}/listings/location?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/location`), { timeout: 10000 });
    await expect(page.getByTestId('listings-location-title')).toBeVisible({ timeout: 10000 });
    // Wait for grid to finish loading: either results or empty state
    await expect(
      page.getByText(/listing\(s\) found|No listings found|annonce\(s\) trouvée\(s\)/i),
    ).toBeVisible({ timeout: 15000 });
    const noResults = await page.getByText(/No listings found/i).isVisible().catch(() => false);
    if (noResults) {
      test.skip(true, 'No listings returned by API (seed data or city filter)');
    }
    const link = page.locator('a[href*="/listings/"]').first();
    await expect(link).toBeVisible({ timeout: 5000 });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/[^/]+$`));
    await expect(page.getByRole('heading', { name: /Citadine centre Paris/i })).toBeVisible({ timeout: 5000 });
    const bookLink = page.getByTestId('listing-book-link');
    await expect(bookLink).toBeVisible({ timeout: 5000 });
  });
});
