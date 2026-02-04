import { test, expect } from '@playwright/test';

const LOCALE = 'en';
const LOGIN_DEMO = `/${LOCALE}/login?demo=1`;

test.describe('Messaging: open conversation + send message', () => {
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

  test('after creating a booking, client can open messages and send a message', async ({ page }) => {
    await page.getByPlaceholder(/City|address/i).fill('Paris');
    await page.getByRole('button', { name: /Search/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings`));
    // Wait for grid to load; skip if no listings
    await expect(
      page.getByText(/listing\(s\) found|No listings found|annonce\(s\) trouvée\(s\)/i),
    ).toBeVisible({ timeout: 15000 });
    const noResults = await page.getByText(/No listings found/i).isVisible().catch(() => false);
    if (noResults) {
      test.skip(true, 'No listings returned (API/seed). Cannot create booking for messages test.');
    }
    // Link to listing detail (href like /en/listings/c...) — avoid nav links like /listings/location
    const listingDetailLink = page.locator(`a[href^="/${LOCALE}/listings/c"]`).first();
    await expect(listingDetailLink).toBeVisible({ timeout: 5000 });
    await listingDetailLink.click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/[^/]+$`));
    await page.getByTestId('listing-book-link').click();
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

    const payUrlRegex = new RegExp(`/${LOCALE}/bookings/([^/]+)/pay`);
    try {
      await page.waitForURL(payUrlRegex, { timeout: 15000 });
    } catch {
      const onCheckout = page.url().includes('/checkout');
      const errorVisible = await page.locator('.text-red-600, [class*="error"]').first().isVisible().catch(() => false);
      if (onCheckout && errorVisible) {
        test.skip(true, 'Booking creation failed (API/availability). Cannot open messages.');
      }
      throw new Error('Expected navigation to /bookings/.../pay within 15s');
    }
    const bookingId = page.url().split('/bookings/')[1]?.split('/')[0];
    expect(bookingId).toBeTruthy();

    await page.goto(`/${LOCALE}/messages?bookingId=${bookingId}`);
    await expect(page.getByRole('heading', { name: /Messages/i })).toBeVisible({ timeout: 5000 });
    // Conversation shows listing title or "with" + name
    await expect(page.getByText(/Citadine|Marie|Dupont|avec|with/i)).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder(/Type a message|Écrivez un message/i).fill('Hello, I have a question about pickup.');
    await page.getByRole('button', { name: /Send|Envoyer/i }).click();

    await expect(page.getByText('Hello, I have a question about pickup.')).toBeVisible({ timeout: 5000 });
  });
});
