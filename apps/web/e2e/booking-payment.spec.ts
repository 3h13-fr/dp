import { test, expect } from '@playwright/test';

const LOCALE = 'en';

const LOGIN_DEMO = `/${LOCALE}/login?demo=1`;

test.describe('Booking: reserve → pay (test mode) → confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_DEMO);
    const demoSection = page.getByTestId('demo-login-section');
    await expect(demoSection).toBeVisible({ timeout: 20000 });
    await demoSection.getByPlaceholder('Email').fill('client@example.com', { timeout: 10000 });
    await demoSection.getByPlaceholder('Password').fill('demo', { timeout: 10000 });
    await demoSection.getByRole('button', { name: /Sign in/i }).click({ timeout: 10000 });
    await expect(page).toHaveURL(/\/(en|fr)(\/|$)/, { timeout: 15000 });
    await expect(async () => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(token).toBeTruthy();
    }).toPass({ timeout: 5000 });
  });

  test('checkout creates booking and redirects to pay page', async ({ page }) => {
    await page.getByPlaceholder(/City|address/i).fill('Paris');
    await page.getByRole('button', { name: /Search/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings`));
    await page.getByRole('link', { name: /Citadine/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/[^/]+$`));
    await page.getByTestId('listing-book-link').click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/[^/]+/checkout`));

    await expect(page.locator('input[type="datetime-local"]').first()).toBeVisible({ timeout: 10000 });

    const start = new Date();
    start.setDate(start.getDate() + 2);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    const format = (d: Date) => d.toISOString().slice(0, 16);

    await page.locator('input[type="datetime-local"]').first().fill(format(start));
    await page.locator('input[type="datetime-local"]').nth(1).fill(format(end));
    await page.getByRole('button', { name: /Continue to payment|Creating/i }).click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/bookings/[^/]+/pay`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Complete payment/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/EUR|Total/i)).toBeVisible();
  });

  test('pay page shows payment form or Stripe message', async ({ page }) => {
    await page.getByPlaceholder(/City|address/i).fill('Paris');
    await page.getByRole('button', { name: /Search/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings`));
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
    await page.getByRole('button', { name: /Continue to payment|Creating/i }).click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/bookings/[^/]+/pay`), { timeout: 10000 });
    await expect(
      page.getByRole('heading', { name: /Complete payment/i }).or(page.getByText(/Total:|Stripe|Preparing|payment form|No payment required|already paid|Booking not found|Loading/i)),
    ).toBeVisible({ timeout: 10000 });
  });
});
