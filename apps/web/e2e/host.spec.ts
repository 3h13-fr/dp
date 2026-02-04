import { test, expect } from '@playwright/test';

const LOCALE = 'en';
const LOGIN_DEMO = `/${LOCALE}/login?demo=1`;

test.describe('Host: dashboard and listings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_DEMO);
    const demoSection = page.getByTestId('demo-login-section');
    await expect(demoSection).toBeVisible({ timeout: 20000 });
    await demoSection.getByPlaceholder('Email').fill('host@example.com', { timeout: 10000 });
    await demoSection.getByPlaceholder('Password').fill('demo', { timeout: 10000 });
    await demoSection.getByRole('button', { name: /Sign in/i }).click({ timeout: 10000 });
    await expect(page).toHaveURL(/\/(en|fr)\/host/, { timeout: 15000 });
  });

  test('host sees dashboard and at least one listing (seed)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Partner dashboard|Tableau de bord partenaire/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Citadine centre Paris')).toBeVisible({ timeout: 5000 });
  });

  test('host can open a listing from dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Partner dashboard|Tableau de bord partenaire/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('link', { name: /View|Voir/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/listings/[^/]+$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('listing-book-link')).toBeVisible({ timeout: 5000 });
  });
});
