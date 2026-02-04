import { test, expect } from '@playwright/test';

const LOCALE = 'en';

// Requires API running (e.g. pnpm dev from repo root) and seeded users: client@example.com, mohamedsakho@drivepark.net (admin), host@example.com with password "demo"
// Uses ?demo=1 to show the demo login form (email + password) for E2E.
const LOGIN_DEMO = `/${LOCALE}/login?demo=1`;

test.describe('Auth (Signup / Login)', () => {
  test('client can log in and is redirected to home', async ({ page }) => {
    await page.goto(LOGIN_DEMO);
    await expect(page.getByTestId('login-title')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('demo-login-section')).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder('Email').fill('client@example.com');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/\/(en|fr)\/?($|\?)/, { timeout: 10000 });
    await expect(page.getByTestId('header-logo')).toBeVisible({ timeout: 5000 });
  });

  test('admin can log in and reach dashboard', async ({ page }) => {
    await page.goto(LOGIN_DEMO);
    await expect(page.getByTestId('login-title')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('demo-login-section')).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder('Email').fill('mohamedsakho@drivepark.net');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/\/(en|fr)\/admin(\/.*)?/, { timeout: 10000 });
    await expect(page.getByText(/Admin|Dashboard|Users|Listings|Audit/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('host can log in and reach host dashboard', async ({ page }) => {
    await page.goto(LOGIN_DEMO);
    await expect(page.getByTestId('login-title')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('demo-login-section')).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder('Email').fill('host@example.com');
    await page.getByPlaceholder('Password').fill('demo');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await expect(page).toHaveURL(/\/(en|fr)\/host(\/.*)?/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Partner dashboard|Tableau de bord partenaire/i })).toBeVisible({ timeout: 5000 });
  });
});
