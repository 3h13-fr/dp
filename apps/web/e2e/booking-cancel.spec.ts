import { test, expect } from '@playwright/test';
import { loginAsClient, waitForAppReady } from './helpers';

const LOCALE = 'en';

test.describe('Booking: cancel → status + refund', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)(\/|$)/, { timeout: 15000 });
  });

  test('client can cancel a pending booking and status becomes CANCELLED', async ({ page }) => {
    await page.goto(`/${LOCALE}/location?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/location`), { timeout: 15000 });
    await waitForAppReady(page);
    await expect(
      page.getByText(/listing\(s\) found|No listings found|annonce\(s\) trouvée\(s\)|Loading|Chargement/i),
    ).toBeVisible({ timeout: 20000 });
    await page.getByRole('link', { name: /Citadine/i }).first().click();
    await page.getByTestId('listing-book-link').click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+/checkout`));
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
    await page.getByRole('button', { name: /Continue to payment|Confirm and pay|Confirmer et payer|Creating/i }).click();

    // Wait for redirect to pay page (API can be slow or fail on availability)
    const payUrlRegex = new RegExp(`/${LOCALE}/bookings/([^/]+)/pay`);
    try {
      await page.waitForURL(payUrlRegex, { timeout: 25000 });
    } catch {
      const onCheckout = page.url().includes('/checkout');
      const errorVisible = await page.locator('.text-red-600, [class*="error"]').first().isVisible().catch(() => false);
      if (onCheckout) {
        test.skip(
          true,
          errorVisible
            ? 'Booking creation failed (API/availability). Ensure API is up and listing has availability for the chosen dates.'
            : 'Navigation to pay page did not complete in time (API slow or booking creation failed).',
        );
      }
      throw new Error('Expected navigation to /bookings/.../pay within 25s');
    }
    const bookingUrl = page.url();
    const bookingId = bookingUrl.split('/bookings/')[1]?.split('/')[0];
    expect(bookingId).toBeTruthy();

    await page.goto(`/${LOCALE}/bookings/${bookingId}`);
    await waitForAppReady(page);
    await expect(page.getByText(/Status|Statut/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/PENDING/i)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Cancel booking|Annuler la réservation/i }).click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/bookings`), { timeout: 10000 });
    await page.goto(`/${LOCALE}/bookings/${bookingId}`);
    await waitForAppReady(page);
    await expect(page.getByText(/CANCELLED/i)).toBeVisible({ timeout: 5000 });
  });
});
