import { test, expect } from '@playwright/test';
import { loginAsHost } from './helpers';

const LOCALE = 'en';

test.describe('Host: dashboard and listings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsHost(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/host/, { timeout: 15000 });
  });

  test('host sees dashboard and at least one listing (seed)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Partner dashboard|Tableau de bord partenaire/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Citadine centre Paris')).toBeVisible({ timeout: 5000 });
  });

  test('host can open a listing from dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Partner dashboard|Tableau de bord partenaire/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('link', { name: /View|Voir/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('listing-book-link')).toBeVisible({ timeout: 5000 });
  });

  test('host can open bookings page', async ({ page }) => {
    await page.locator('a[href*="/host/bookings"]').click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/host/bookings`));
    await expect(
      page.getByRole('heading', { name: /Incoming bookings|Réservations reçues/i }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/booking\(s\)|réservation\(s\)|No bookings yet|Aucune réservation/i),
    ).toBeVisible({ timeout: 5000 });
  });
});
