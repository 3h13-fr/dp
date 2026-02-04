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
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/messages`));
    await expect(page.getByRole('heading', { name: /Messages/i })).toBeVisible();
  });

  test('/en/bookings loads', async ({ page }) => {
    await page.goto(`/${LOCALE}/bookings`);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/bookings`));
    await expect(page.getByRole('heading', { name: /My trips|Loading/i })).toBeVisible();
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

test.describe('Admin login', () => {
  test('admin can log in and reach dashboard', async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: { url: string; status?: number }[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('requestfailed', (req) => {
      failedRequests.push({ url: req.url(), status: undefined });
    });
    page.on('response', (res) => {
      if (res.request().url().includes('/auth/') && !res.ok()) {
        failedRequests.push({ url: res.url(), status: res.status() });
      }
    });

    await page.goto(`/${LOCALE}/login`);
    await expect(page.getByRole('heading', { name: /Log in/i })).toBeVisible();

    await page.getByPlaceholder('Email').fill('admin@example.com');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/\/(en|fr)\/admin(\/.*)?/, { timeout: 10000 });
    await expect(page.getByText(/Admin|Dashboard|Users|Listings|Audit/i).first()).toBeVisible({ timeout: 5000 });

    if (consoleErrors.length) {
      console.log('Console errors during admin login:', consoleErrors);
    }
    if (failedRequests.length) {
      console.log('Failed or non-OK auth requests:', failedRequests);
    }
    expect(consoleErrors, 'No console errors during admin login').toHaveLength(0);
    expect(failedRequests, 'No failed auth requests').toHaveLength(0);
  });
});
