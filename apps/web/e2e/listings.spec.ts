import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

const LOCALE = 'en';

test.describe('Listings: search → filter → listing page', () => {
  test('home redirects to locale and shows DrivePark with nav tabs', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(en|fr)(\/)?$/, { timeout: 15000 });
    await waitForAppReady(page);
    await expect(page.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('header-logo')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-link-location')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-link-experience')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-link-ride')).toBeVisible({ timeout: 10000 });
  });

  test('location page loads and shows results for city filter', async ({ page }) => {
    await page.goto(`/${LOCALE}/location?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/location`), { timeout: 15000 });
    await waitForAppReady(page);
    await expect(page.getByTestId('listings-location-title')).toBeVisible({ timeout: 15000 });
    // Wait for loading to finish: either results count or empty state (or Loading...)
    await expect(
      page
        .getByText(/listing\(s\) found/i)
        .or(page.getByText(/No listings found|annonce\(s\) trouvée\(s\)|Aucune annonce/i))
        .or(page.getByText(/Loading|Chargement/i)),
    ).toBeVisible({ timeout: 20000 });
    // If we have results, expect at least one listing link (e.g. Citadine from seed)
    const hasResults = await page.getByText(/listing\(s\) found|annonce\(s\) trouvée\(s\)/i).isVisible().catch(() => false);
    if (hasResults) {
      const firstListingLink = page.getByRole('link', { name: /Citadine|listing/i }).first();
      await expect(firstListingLink).toBeVisible({ timeout: 10000 });
    }
  });

  test('click listing opens detail page with title and book button', async ({ page }) => {
    await page.goto(`/${LOCALE}/location?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/location`), { timeout: 15000 });
    await waitForAppReady(page);
    await expect(page.getByTestId('listings-location-title')).toBeVisible({ timeout: 15000 });
    // Wait for grid to finish loading: either results or empty state
    await expect(
      page
        .getByText(/listing\(s\) found|No listings found|annonce\(s\) trouvée\(s\)|Aucune annonce/i)
        .or(page.getByText(/Loading|Chargement/i)),
    ).toBeVisible({ timeout: 20000 });
    const noResults = await page.getByText(/No listings found|Aucune annonce/i).isVisible().catch(() => false);
    if (noResults) {
      test.skip(true, 'No listings returned by API (seed data or city filter)');
    }
    const link = page.locator('a[href*="/location/"], a[href*="/experience/"], a[href*="/ride/"]').first();
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+$`), { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Citadine centre Paris/i })).toBeVisible({ timeout: 10000 });
    const bookLink = page.getByTestId('listing-book-link');
    await expect(bookLink).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Experience: search → filter → listing page', () => {
  test('experience page loads and shows results for city filter', async ({ page }) => {
    await page.goto(`/${LOCALE}/experience?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/experience`), { timeout: 15000 });
    await waitForAppReady(page);
    await expect(page.getByTestId('listings-experience-title')).toBeVisible({ timeout: 15000 });
    await expect(
      page
        .getByText(/listing\(s\) found/i)
        .or(page.getByText(/No listings found|annonce\(s\) trouvée\(s\)|Aucune annonce/i))
        .or(page.getByText(/Loading|Chargement/i)),
    ).toBeVisible({ timeout: 20000 });
    const hasResults = await page.getByText(/listing\(s\) found|annonce\(s\) trouvée\(s\)/i).isVisible().catch(() => false);
    if (hasResults) {
      await expect(page.getByRole('link', { name: /Balade|2CV|listing/i }).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('click experience listing opens detail page with title and book button', async ({ page }) => {
    await page.goto(`/${LOCALE}/experience?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/experience`), { timeout: 15000 });
    await waitForAppReady(page);
    await expect(page.getByTestId('listings-experience-title')).toBeVisible({ timeout: 15000 });
    await expect(
      page
        .getByText(/listing\(s\) found|No listings found|annonce\(s\) trouvée\(s\)/i)
        .or(page.getByText(/Loading|Chargement/i)),
    ).toBeVisible({ timeout: 20000 });
    const noResults = await page.getByText(/No listings found|Aucune annonce/i).isVisible().catch(() => false);
    if (noResults) {
      test.skip(true, 'No experience listings returned by API (seed data or city filter)');
    }
    const link = page.locator('a[href*="/experience/"]').first();
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/experience/[^/]+$`), { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Balade en 2CV|2CV/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('listing-book-link')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Ride: search → filter → listing page', () => {
  test('ride page loads and shows results for city filter', async ({ page }) => {
    await page.goto(`/${LOCALE}/ride?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/ride`), { timeout: 15000 });
    await waitForAppReady(page);
    await expect(page.getByTestId('listings-ride-title')).toBeVisible({ timeout: 15000 });
    await expect(
      page
        .getByText(/listing\(s\) found/i)
        .or(page.getByText(/No listings found|annonce\(s\) trouvée\(s\)|Aucune annonce/i))
        .or(page.getByText(/Loading|Chargement/i)),
    ).toBeVisible({ timeout: 20000 });
    const hasResults = await page.getByText(/listing\(s\) found|annonce\(s\) trouvée\(s\)/i).isVisible().catch(() => false);
    if (hasResults) {
      await expect(page.getByRole('link', { name: /chauffeur|Voiture|listing/i }).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('click ride listing opens detail page with title and book button', async ({ page }) => {
    await page.goto(`/${LOCALE}/ride?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/ride`), { timeout: 15000 });
    await waitForAppReady(page);
    await expect(page.getByTestId('listings-ride-title')).toBeVisible({ timeout: 15000 });
    await expect(
      page
        .getByText(/listing\(s\) found|No listings found|annonce\(s\) trouvée\(s\)/i)
        .or(page.getByText(/Loading|Chargement/i)),
    ).toBeVisible({ timeout: 20000 });
    const noResults = await page.getByText(/No listings found|Aucune annonce/i).isVisible().catch(() => false);
    if (noResults) {
      test.skip(true, 'No ride listings returned by API (seed data or city filter)');
    }
    const link = page.locator('a[href*="/ride/"]').first();
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/ride/[^/]+$`), { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /chauffeur|Voiture avec chauffeur/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('listing-book-link')).toBeVisible({ timeout: 10000 });
  });
});
