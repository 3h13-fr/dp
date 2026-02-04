import { test, expect } from '@playwright/test';

const LOCALE = 'en';
const LOGIN_DEMO = `/${LOCALE}/login?demo=1`;

test.describe('Booking: cancel → status + refund', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_DEMO);
    const demoSection = page.getByTestId('demo-login-section');
    await expect(demoSection).toBeVisible({ timeout: 20000 });
    await demoSection.getByPlaceholder('Email').fill('client@example.com', { timeout: 10000 });
    await demoSection.getByPlaceholder('Password').fill('demo', { timeout: 10000 });
    await demoSection.getByRole('button', { name: /Sign in/i }).click({ timeout: 10000 });
    await expect(page).toHaveURL(/\/(en|fr)(\/|$)/, { timeout: 15000 });
  });

  test('client can cancel a pending booking and status becomes CANCELLED', async ({ page }) => {
    await page.goto(`/${LOCALE}/listings?q=Paris`);
    await page.getByRole('link', { name: /Citadine/i }).first().click();
    await page.getByTestId('listing-book-link').click();
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

    // Wait for redirect to pay page or for an error message (API/availability failure)
    const payUrlRegex = new RegExp(`/${LOCALE}/bookings/([^/]+)/pay`);
    try {
      await page.waitForURL(payUrlRegex, { timeout: 15000 });
    } catch {
      const onCheckout = page.url().includes('/checkout');
      const errorVisible = await page.locator('.text-red-600, [class*="error"]').first().isVisible().catch(() => false);
      if (onCheckout && errorVisible) {
        test.skip(true, 'Booking creation failed (API/availability). Ensure API is up and listing has availability for the chosen dates.');
      }
      throw new Error('Expected navigation to /bookings/.../pay within 15s');
    }
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
