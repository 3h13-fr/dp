import { test, expect } from '@playwright/test';

const LOCALE = 'en';

test.describe('Messaging: open conversation + send message', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);
    await page.getByPlaceholder('Email').fill('client@example.com');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/(en|fr)(\/|$)/, { timeout: 10000 });
    await expect(async () => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(token).toBeTruthy();
    }).toPass({ timeout: 5000 });
  });

  test('after creating a booking, client can open messages and send a message', async ({ page }) => {
    await page.getByPlaceholder(/City|address/i).fill('Paris');
    await page.getByRole('button', { name: /Search/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings`));
    await page.locator('a[href*="/listings/"]').first().click();
    await page.getByRole('link', { name: /Book/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/[^/]+/checkout`));
    const dateInputs = page.locator('input[type="datetime-local"]');
    await expect(dateInputs.first()).toBeVisible({ timeout: 15000 });
    await dateInputs.first().waitFor({ state: 'attached' });

    const start = new Date();
    start.setDate(start.getDate() + 6);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const format = (d: Date) => d.toISOString().slice(0, 16);
    await dateInputs.first().fill(format(start));
    await dateInputs.nth(1).fill(format(end));
    await page.getByRole('button', { name: /Continue to payment|Creating/i }).click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/bookings/([^/]+)/pay`), { timeout: 10000 });
    const bookingId = page.url().split('/bookings/')[1]?.split('/')[0];
    expect(bookingId).toBeTruthy();

    await page.goto(`/${LOCALE}/messages?bookingId=${bookingId}`);
    await expect(page.getByRole('heading', { name: /Messages/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Citadine|Marie|Dupont/i)).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder(/Type a message|Écrivez un message/i).fill('Hello, I have a question about pickup.');
    await page.getByRole('button', { name: /Send|Envoyer/i }).click();

    await expect(page.getByText('Hello, I have a question about pickup.')).toBeVisible({ timeout: 5000 });
  });
});
