import { test, expect } from '@playwright/test';

const LOCALE = 'en';

test.describe('Navigation routes', () => {
  test('home redirects to locale and shows title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(en|fr)(\/)?$/);
    await expect(page.getByRole('heading', { name: /Mobility Platform/i })).toBeVisible();
  });

  test('/en loads home with search', async ({ page }) => {
    await page.goto(`/${LOCALE}`);
    await expect(page.getByRole('heading', { name: /Mobility Platform/i })).toBeVisible();
    await expect(page.getByPlaceholder(/City|address/i)).toBeVisible();
  });

  test('/en/listings loads', async ({ page }) => {
    await page.goto(`/${LOCALE}/listings`);
    await expect(page.getByRole('heading', { name: /Listings/i })).toBeVisible();
  });

  test('/en/login loads', async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);
    await expect(page.getByRole('heading', { name: /Log in/i })).toBeVisible();
  });

  test('/en/messages loads (no 404)', async ({ page }) => {
    await page.goto(`/${LOCALE}/messages`);
    await expect(page).toHaveURL(/\/(en|fr)\/(messages|login)/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Messages|Log in/i })).toBeVisible({ timeout: 10000 });
  });

  test('/en/bookings loads', async ({ page }) => {
    await page.goto(`/${LOCALE}/bookings`);
    await expect(page).toHaveURL(/\/(en|fr)\/(bookings|login)/, { timeout: 10000 });
    await expect(
      page.getByRole('heading', { name: /My trips|Log in/i }).or(page.getByText(/Loading/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test('/en/admin redirects or shows admin content', async ({ page }) => {
    await page.goto(`/${LOCALE}/admin`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/admin`));
    await expect(page.getByText(/Admin|Dashboard|Users|Loading/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('header links navigate to correct pages', async ({ page }) => {
    await page.goto(`/${LOCALE}`);
    await page.getByRole('link', { name: /Listings/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings`));
    await page.getByRole('link', { name: /Account/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/login`));
  });
});

// Admin login is covered in e2e/auth.spec.ts
