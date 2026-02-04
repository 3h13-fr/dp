import { test, expect } from '@playwright/test';

const LOCALE = 'en';

test.describe('Auth (Signup / Login)', () => {
  test('client can log in and is redirected to home', async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);
    await expect(page.getByRole('heading', { name: /Log in/i })).toBeVisible();

    await page.getByPlaceholder('Email').fill('client@example.com');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/\/(en|fr)\/?($|\?)/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Mobility Platform/i })).toBeVisible({ timeout: 5000 });
  });

  test('admin can log in and reach dashboard', async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);
    await expect(page.getByRole('heading', { name: /Log in/i })).toBeVisible();

    await page.getByPlaceholder('Email').fill('admin@example.com');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/\/(en|fr)\/admin(\/.*)?/, { timeout: 10000 });
    await expect(page.getByText(/Admin|Dashboard|Users|Listings|Audit/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('host can log in and reach host dashboard', async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);
    await expect(page.getByRole('heading', { name: /Log in/i })).toBeVisible();

    await page.getByPlaceholder('Email').fill('host@example.com');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/\/(en|fr)\/host(\/.*)?/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Host dashboard/i })).toBeVisible({ timeout: 5000 });
  });
});
