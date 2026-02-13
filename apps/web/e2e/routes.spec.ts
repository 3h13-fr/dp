import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

const LOCALE = 'en';

test.describe('Navigation routes', () => {
  test('home redirects to locale and shows DrivePark', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(en|fr)(\/)?$/, { timeout: 15000 });
    await waitForAppReady(page);
    await expect(page.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: 'DrivePark' }).or(page.getByTestId('header-logo'))).toBeVisible({ timeout: 10000 });
  });

  test('/en loads home with nav tabs', async ({ page }) => {
    await page.goto(`/${LOCALE}`);
    await waitForAppReady(page);
    await expect(page.getByTestId('app-header')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('header-logo')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-link-location')).toBeVisible({ timeout: 10000 });
  });

  test('/en/listings loads (redirects to location)', async ({ page }) => {
    await page.goto(`/${LOCALE}/listings`);
    await waitForAppReady(page);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/location`), { timeout: 15000 });
    await expect(
      page.getByText(/listing\(s\) found|No listings found|annonce\(s\) trouvée\(s\)|Aucune annonce|Loading|Chargement/i),
    ).toBeVisible({ timeout: 15000 });
  });

  test('/en/login loads', async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);
    await waitForAppReady(page);
    await expect(page.getByTestId('login-title').first()).toBeVisible({ timeout: 10000 });
  });

  test('/en/messages loads (no 404)', async ({ page }) => {
    await page.goto(`/${LOCALE}/messages`);
    await expect(page).toHaveURL(/\/(en|fr)\/(messages|login)/, { timeout: 15000 });
    await waitForAppReady(page);
    // When not logged in, messages page renders null then redirects to login; accept page content OR header as proof of no 404
    await expect(
      page
        .getByRole('heading', { name: /Messages|Log in|Connexion/i })
        .or(page.getByText(/Loading|Chargement/i))
        .or(page.getByTestId('header-logo')),
    ).toBeVisible({ timeout: 15000 });
  });

  test('/en/bookings loads', async ({ page }) => {
    await page.goto(`/${LOCALE}/bookings`);
    await expect(page).toHaveURL(/\/(en|fr)\/(bookings|login)/, { timeout: 10000 });
    await waitForAppReady(page);
    await expect(
      page.getByRole('heading', { name: /My trips|Log in/i }).or(page.getByText(/Loading/i)),
    ).toBeVisible({ timeout: 10000 });
  });

  test('/en/admin redirects or shows admin content', async ({ page }) => {
    await page.goto(`/${LOCALE}/admin`);
    await waitForAppReady(page);
    // Unauthenticated: layout redirects to login. Authenticated: admin UI (Admin/Dashboard/Users/Loading).
    await expect(
      page.getByText(/Admin|Dashboard|Users|Loading/i).or(page.getByText(/Log in|Connexion|Sign in/i)).first(),
    ).toBeVisible({ timeout: 15000 });
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(new RegExp(`/${LOCALE}/login`));
    }
  });

  test('header links navigate to correct pages', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/${LOCALE}`);
    await waitForAppReady(page);
    await page.getByTestId('nav-link-location').click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/location`));
    await page.goto(`/${LOCALE}`);
    await page.getByRole('button', { name: /Menu/i }).click();
    await page.getByRole('link', { name: /Account/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/login`));
  });
});

// Admin login is covered in e2e/auth.spec.ts
