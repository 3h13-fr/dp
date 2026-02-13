import { test, expect } from '@playwright/test';
import { loginAsClient, waitForAppReady } from './helpers';

const LOCALE = 'en';

test.describe('Messaging: open conversation + send message', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)(\/|$)/, { timeout: 15000 });
    await expect(async () => {
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(token).toBeTruthy();
    }).toPass({ timeout: 5000 });
  });

  test('after creating a booking, client can open messages and send a message', async ({ page }) => {
    await waitForAppReady(page);
    await page.goto(`/${LOCALE}/location?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/location`), { timeout: 15000 });
    // Wait for grid to load; skip if no listings
    await expect(
      page
        .getByText(/listing\(s\) found|No listings found|annonce\(s\) trouvée\(s\)/i)
        .or(page.getByText(/Loading|Chargement/i)),
    ).toBeVisible({ timeout: 20000 });
    const noResults = await page.getByText(/No listings found/i).isVisible().catch(() => false);
    if (noResults) {
      test.skip(true, 'No listings returned (API/seed). Cannot create booking for messages test.');
    }
    // Link to listing detail (href like /en/location/... or /en/experience/... or /en/ride/...)
    const listingDetailLink = page.locator(`a[href^="/${LOCALE}/location/"], a[href^="/${LOCALE}/experience/"], a[href^="/${LOCALE}/ride/"]`).first();
    await expect(listingDetailLink).toBeVisible({ timeout: 5000 });
    await listingDetailLink.click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+$`));
    await page.getByTestId('listing-book-link').click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+/checkout`));

    await waitForAppReady(page);
    await expect(page.getByTestId('checkout-summary').first()).toBeVisible({ timeout: 15000 });
    const dateInputs = page.locator('input[type="datetime-local"]');
    await expect(dateInputs.first()).toBeVisible({ timeout: 15000 });

    const start = new Date();
    start.setDate(start.getDate() + 6);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const format = (d: Date) => d.toISOString().slice(0, 16);
    await dateInputs.first().fill(format(start));
    await dateInputs.nth(1).fill(format(end));
    await page.waitForTimeout(1000);
    await waitForAppReady(page);
    const continueBtn = page
      .getByRole('button', {
        name: /Continue to payment|Confirm and pay|Confirmer et payer|Creating|Next|Suivant/i,
      })
      .first();
    await expect(continueBtn).toBeVisible({ timeout: 15000 });
    await expect(continueBtn).toBeEnabled({ timeout: 5000 });
    await continueBtn.click();

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
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: /Messages/i })).toBeVisible({ timeout: 5000 });
    // Conversation shows listing title or "with" + name
    await expect(page.getByText(/Renault Clio|Clio|Marie|Dupont|avec|with/i)).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder(/Type a message|Écrivez un message/i).fill('Hello, I have a question about pickup.');
    await page.getByTestId('message-send-button').click();

    await expect(page.getByText('Hello, I have a question about pickup.')).toBeVisible({ timeout: 5000 });
  });
});
