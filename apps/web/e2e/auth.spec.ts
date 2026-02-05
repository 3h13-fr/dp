import { test, expect } from '@playwright/test';
import { loginAsClient, loginAsHost, loginAsAdmin } from './helpers';

const LOCALE = 'en';

test.describe('Auth (Signup / Login)', () => {
  test('client can log in and is redirected to home', async ({ page }) => {
    await loginAsClient(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/?($|\?)/, { timeout: 10000 });
    await expect(page.getByTestId('header-logo')).toBeVisible({ timeout: 5000 });
  });

  test('admin can log in and reach dashboard', async ({ page }) => {
    await loginAsAdmin(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/admin(\/.*)?/, { timeout: 10000 });
    await expect(page.getByText(/Admin|Dashboard|Users|Listings|Audit/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('host can log in and reach host dashboard', async ({ page }) => {
    await loginAsHost(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/host(\/.*)?/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Partner dashboard|Tableau de bord partenaire/i })).toBeVisible({ timeout: 5000 });
  });
});
