import { test, expect } from '@playwright/test';

const LOCALE = 'en';

test.describe('Host: dashboard and listings', () => {
  test('host sees dashboard and at least one listing (seed)', async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);
    await page.getByPlaceholder('Email').fill('host@example.com');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/\/(en|fr)\/host/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Host dashboard/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Citadine centre Paris')).toBeVisible({ timeout: 5000 });
  });

  test('host can open a listing from dashboard', async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);
    await page.getByPlaceholder('Email').fill('host@example.com');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page.getByRole('heading', { name: /Host dashboard/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('link', { name: /View/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/`));
    await expect(page.getByRole('heading', { name: /Citadine centre Paris/i })).toBeVisible({ timeout: 5000 });
  });
});
