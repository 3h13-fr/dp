import { test, expect } from '@playwright/test';

const LOCALE = 'en';

test.describe('Booking: cancel → status + refund', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);
    await page.getByPlaceholder('Email').fill('client@example.com');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/(en|fr)(\/|$)/, { timeout: 10000 });
  });

  test('client can cancel a pending booking and status becomes CANCELLED', async ({ page }) => {
    await page.goto(`/${LOCALE}/listings?q=Paris`);
    await page.locator('a[href*="/listings/"]').first().click();
    await page.getByRole('link', { name: /Book/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/[^/]+/checkout`));
    const dateInputs = page.locator('input[type="datetime-local"]');
    await expect(dateInputs.first()).toBeVisible({ timeout: 15000 });
    await dateInputs.first().waitFor({ state: 'attached' });

    const start = new Date();
    start.setDate(start.getDate() + 5);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const format = (d: Date) => d.toISOString().slice(0, 16);
    await dateInputs.first().fill(format(start));
    await dateInputs.nth(1).fill(format(end));
    await page.getByRole('button', { name: /Continue to payment|Creating/i }).click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/bookings/([^/]+)/pay`), { timeout: 10000 });
    const bookingUrl = page.url();
    const bookingId = bookingUrl.split('/bookings/')[1]?.split('/')[0];
    expect(bookingId).toBeTruthy();

    await page.goto(`/${LOCALE}/bookings/${bookingId}`);
    await expect(page.getByText(/Status|Statut/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/PENDING/i)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Cancel booking|Annuler la réservation/i }).click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/bookings`), { timeout: 10000 });
    await page.goto(`/${LOCALE}/bookings/${bookingId}`);
    await expect(page.getByText(/CANCELLED/i)).toBeVisible({ timeout: 5000 });
  });
});
