import { test, expect } from '@playwright/test';
import { loginAsClient, loginAsHost, loginAsAdmin, waitForAppReady } from './helpers';

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

test.describe('Auth (protected routes)', () => {
  test('unauthenticated user visiting /bookings is redirected to login with redirect param', async ({ page }) => {
    await page.goto(`/${LOCALE}/bookings`);
    await waitForAppReady(page);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/login\\?redirect=`), { timeout: 10000 });
    const redirect = page.url();
    expect(redirect).toContain('redirect=');
    expect(decodeURIComponent(redirect.split('redirect=')[1] || '')).toMatch(/\/bookings/);
  });
});

test.describe('Auth (change password)', () => {
  test('logged-in user can change password from profile and sees success', async ({ page }) => {
    await loginAsClient(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/?($|\?)/, { timeout: 10000 });

    await page.goto(`/${LOCALE}/profil/parametres`);
    await waitForAppReady(page);
    await expect(
      page.getByRole('heading', { name: /Account settings|Paramètres du compte|Profile|Profil|Settings|Paramètres/i }),
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /Login and security|Connexion et sécurité/i }).click();
    await expect(
      page.getByRole('heading', { name: /Login and security|Connexion et sécurité/i }),
    ).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder(/Current password|Mot de passe actuel/i).fill('demodemo');
    await page.getByPlaceholder(/New password.*min 8|Nouveau mot de passe.*min 8/i).first().fill('newpass123');
    await page.getByPlaceholder(/Confirm new password|Confirmer le nouveau mot de passe/i).fill('newpass123');
    await page.getByRole('button', { name: /Update password|Mettre à jour le mot de passe/i }).click();

    await expect(page.getByText(/Your password has been updated|Votre mot de passe a été mis à jour/i)).toBeVisible({ timeout: 10000 });

    // Restore password so seed user remains usable for other tests (must be 8+ chars)
    await page.goto(`/${LOCALE}/profil/parametres`);
    await waitForAppReady(page);
    await page.getByRole('button', { name: /Login and security|Connexion et sécurité/i }).click();
    await expect(
      page.getByRole('heading', { name: /Login and security|Connexion et sécurité/i }),
    ).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder(/Current password|Mot de passe actuel/i).fill('newpass123');
    await page.getByPlaceholder(/New password.*min 8|Nouveau mot de passe.*min 8/i).first().fill('demodemo');
    await page.getByPlaceholder(/Confirm new password|Confirmer le nouveau mot de passe/i).fill('demodemo');
    await page.getByRole('button', { name: /Update password|Mettre à jour le mot de passe/i }).click();
    await expect(page.getByText(/Your password has been updated|Votre mot de passe a été mis à jour/i)).toBeVisible({ timeout: 10000 });
  });
});
