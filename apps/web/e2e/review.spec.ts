import { test, expect } from '@playwright/test';
import { loginAsClient, waitForAppReady } from './helpers';

const LOCALE = 'en';
const SEED_COMPLETED_BOOKING_ID = 'seed-booking-completed-review-e2e';

test.describe('Review: leave review after service', () => {
  test('guest can leave a review on completed booking and see it', async ({ page }) => {
    await loginAsClient(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)(\/|$)/, { timeout: 15000 });
    await waitForAppReady(page);

    await page.goto(`/${LOCALE}/bookings/${SEED_COMPLETED_BOOKING_ID}`);
    await expect(page.getByRole('heading', { name: /Leave a review|Laisser un avis/i })).toBeVisible({ timeout: 10000 });

    await page.getByTestId('review-rating-select').selectOption('5');
    await page.getByTestId('review-comment-input').fill('Great trip, everything was perfect.');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTestId('review-submit-button').click();

    await expect(page.getByRole('heading', { name: /Your review|Votre avis/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/5\/5/)).toBeVisible();
    await expect(page.getByText(/Great trip/)).toBeVisible();
  });
});
