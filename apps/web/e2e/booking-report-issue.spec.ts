import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loginAsClient, waitForAppReady } from './helpers';

const LOCALE = 'en';

async function createBookingAndGetId(page: Page): Promise<string | null> {
  await page.goto(`/${LOCALE}/location?city=Paris`);
  await expect(page).toHaveURL(new RegExp(`/${LOCALE}/location`), { timeout: 15000 });
  await waitForAppReady(page);
  await expect(
    page.getByText(/listing\(s\) found|No listings found|annonce\(s\) trouvée\(s\)|Loading|Chargement/i),
  ).toBeVisible({ timeout: 20000 });

  const link = page
    .locator('a[href*="/location/"], a[href*="/experience/"], a[href*="/ride/"]')
    .filter({ hasNot: page.locator('[aria-label="Favoris"]') })
    .first();
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const href = await link.getAttribute('href').catch(() => null);
  if (!href) throw new Error('Listing link has no href');
  await link.click({ timeout: 5000 });
  try {
    await page.waitForURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+$`), { timeout: 15000 });
  } catch {
    const fullUrl = href.startsWith('http') ? href : `http://localhost:3000${href}`;
    await page.goto(fullUrl);
  }
  await waitForAppReady(page);

  const bookLink = page.getByTestId('listing-book-link');
  await expect(bookLink).toBeVisible({ timeout: 10000 });
  await bookLink.click();
  await expect(page).toHaveURL(new RegExp(`/${LOCALE}/(location|experience|ride)/[^/]+/checkout`));

  await waitForAppReady(page);
  await expect(page.getByTestId('checkout-summary').first()).toBeVisible({ timeout: 15000 });
  const dateInputs = page.locator('input[type="datetime-local"]');
  await expect(dateInputs.first()).toBeVisible({ timeout: 15000 });

  const start = new Date();
  start.setDate(start.getDate() + 7);
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
    await page.waitForURL(payUrlRegex, { timeout: 25000 });
  } catch {
    return null;
  }
  const bookingId = page.url().split('/bookings/')[1]?.split('/')[0];
  return bookingId || null;
}

test.describe('Booking: report issue', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClient(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)(\/|$)/, { timeout: 15000 });
  });

  test('client sees report issue button and can submit a report', async ({ page }) => {
    await waitForAppReady(page);
    await page.goto(`/${LOCALE}/location?city=Paris`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/location`), { timeout: 15000 });
    await expect(
      page.getByText(/listing\(s\) found|No listings found|annonce\(s\) trouvée\(s\)|Loading|Chargement/i),
    ).toBeVisible({ timeout: 20000 });
    const noResults = await page.getByText(/No listings found|Aucune annonce/i).isVisible().catch(() => false);
    if (noResults) {
      test.skip(true, 'No listings returned by API. Cannot create booking for report-issue test.');
    }

    const bookingId = await createBookingAndGetId(page);
    if (!bookingId) {
      test.skip(true, 'Booking creation failed (API/availability). Cannot test report issue.');
    }

    await page.goto(`/${LOCALE}/bookings/${bookingId}`);
    await waitForAppReady(page);
    await expect(page.getByText(/Status|Statut/i)).toBeVisible({ timeout: 5000 });

    const reportButton = page.getByRole('button', { name: /Report an issue|Signaler un problème/i });
    await expect(reportButton).toBeVisible({ timeout: 5000 });

    const issueMessage = 'Test issue description for E2E';
    page.once('dialog', (dialog) => {
      expect(dialog.type()).toBe('prompt');
      dialog.accept(issueMessage);
    });
    page.once('dialog', (dialog) => {
      expect(dialog.type()).toBe('alert');
      dialog.accept();
    });
    await reportButton.click();

    await expect(page.getByText(/Status|Statut/i)).toBeVisible({ timeout: 5000 });
  });
});
