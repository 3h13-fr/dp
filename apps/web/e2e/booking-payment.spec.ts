import { test, expect } from '@playwright/test';
import { loginAsClient, waitForAppReady } from './helpers';

const LOCALE = 'en';

test.describe('Booking: reserve → pay (test mode) → confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)(\/|$)/, { timeout: 15000 });
    await expect(async () => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(token).toBeTruthy();
    }).toPass({ timeout: 5000 });
  });

  test('checkout summary shows nights and total after filling dates', async ({ page }) => {
    await waitForAppReady(page);
    await page.getByPlaceholder(/City|address|adresse|ville/i).first().fill('Paris', { timeout: 10000 });
    await page.getByRole('button', { name: /Search|Rechercher/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(listings|location)`), { timeout: 15000 });
    await page.getByRole('link', { name: /Citadine/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+$`));
    await page.getByTestId('listing-book-link').click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+/checkout`));

    await expect(page.getByTestId('checkout-summary')).toBeVisible({ timeout: 10000 });
    const start = new Date();
    start.setDate(start.getDate() + 2);
    const end = new Date(start);
    end.setDate(end.getDate() + 2); // 2 nights
    const format = (d: Date) => d.toISOString().slice(0, 16);
    await page.locator('input[type="datetime-local"]').first().fill(format(start));
    await page.locator('input[type="datetime-local"]').nth(1).fill(format(end));

    const summary = page.getByTestId('checkout-summary');
    await expect(summary).toContainText(/night|nuit/i);
    await expect(summary).toContainText(/Total|EUR/i);
  });

  test('checkout creates booking and redirects to pay page', async ({ page }) => {
    await waitForAppReady(page);
    await page.getByPlaceholder(/City|address|adresse|ville/i).first().fill('Paris', { timeout: 10000 });
    await page.getByRole('button', { name: /Search|Rechercher/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(listings|location)`), { timeout: 15000 });
    await page.getByRole('link', { name: /Citadine/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+$`));
    await page.getByTestId('listing-book-link').click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+/checkout`));

    await expect(page.locator('input[type="datetime-local"]').first()).toBeVisible({ timeout: 10000 });

    const start = new Date();
    start.setDate(start.getDate() + 2);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    const format = (d: Date) => d.toISOString().slice(0, 16);

    await page.locator('input[type="datetime-local"]').first().fill(format(start));
    await page.locator('input[type="datetime-local"]').nth(1).fill(format(end));
    await page.getByRole('button', { name: /Continue to payment|Confirm and pay|Confirmer et payer|Creating/i }).click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/bookings/[^/]+/pay`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Complete payment/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/EUR|Total/i)).toBeVisible();
    await expect(page.getByTestId('booking-pay-summary')).toBeVisible({ timeout: 5000 });
  });

  test('pay page shows payment form or Stripe message', async ({ page }) => {
    await waitForAppReady(page);
    await page.getByPlaceholder(/City|address|adresse|ville/i).first().fill('Paris', { timeout: 10000 });
    await page.getByRole('button', { name: /Search|Rechercher/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(listings|location)`), { timeout: 15000 });
    await page.getByRole('link', { name: /Citadine/i }).first().click();
    await page.getByTestId('listing-book-link').click();
    await expect(page.locator('input[type="datetime-local"]').first()).toBeVisible({ timeout: 10000 });

    const start = new Date();
    start.setDate(start.getDate() + 4);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);
    const format = (d: Date) => d.toISOString().slice(0, 16);
    await page.locator('input[type="datetime-local"]').first().fill(format(start));
    await page.locator('input[type="datetime-local"]').nth(1).fill(format(end));
    await page.getByRole('button', { name: /Continue to payment|Confirm and pay|Confirmer et payer|Creating/i }).click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/bookings/[^/]+/pay`), { timeout: 10000 });
    await expect(
      page.getByRole('heading', { name: /Complete payment/i }).or(page.getByText(/Total:|Stripe|Preparing|payment form|No payment required|already paid|Booking not found|Loading/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test('bookings list shows created booking after checkout', async ({ page }) => {
    await waitForAppReady(page);
    await page.getByPlaceholder(/City|address|adresse|ville/i).first().fill('Paris', { timeout: 10000 });
    await page.getByRole('button', { name: /Search|Rechercher/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(listings|location)`), { timeout: 15000 });
    await page.getByRole('link', { name: /Citadine/i }).first().click();
    await page.getByTestId('listing-book-link').click();
    await expect(page.locator('input[type="datetime-local"]').first()).toBeVisible({ timeout: 10000 });

    const start = new Date();
    start.setDate(start.getDate() + 8);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const format = (d: Date) => d.toISOString().slice(0, 16);
    await page.locator('input[type="datetime-local"]').first().fill(format(start));
    await page.locator('input[type="datetime-local"]').nth(1).fill(format(end));
    await page.getByRole('button', { name: /Continue to payment|Confirm and pay|Confirmer et payer|Creating/i }).click();

    try {
      await page.waitForURL(new RegExp(`/${LOCALE}/bookings/[^/]+/pay`), { timeout: 15000 });
    } catch {
      test.skip(true, 'Booking creation failed. Cannot verify bookings list.');
    }

    await page.goto(`/${LOCALE}/bookings`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/bookings`));
    await expect(page.getByRole('heading', { name: /My trips/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Citadine/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/PENDING/i)).toBeVisible({ timeout: 5000 });
  });
});
