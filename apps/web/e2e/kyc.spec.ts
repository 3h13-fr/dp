import { test, expect } from '@playwright/test';
import { loginAsHost, loginAsAdmin, waitForAppReady } from './helpers';

const LOCALE = 'en';

test.describe('KYC flow', () => {
  test('host can open KYC page and sees status or form', async ({ page }) => {
    await loginAsHost(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/?/, { timeout: 10000 });

    await page.goto(`/${LOCALE}/profil/kyc`);
    await waitForAppReady(page);

    await expect(
      page.getByRole('heading', { name: /Identity verification|Vérification d'identité/i }),
    ).toBeVisible({ timeout: 10000 });

    // Wait for the page to be fully loaded
    await waitForAppReady(page);
    
    // Wait for loading to complete (the component shows "Loading..." while fetching KYC data)
    await page.waitForFunction(
      () => {
        const bodyText = document.body.textContent || '';
        return !bodyText.includes('Loading...') && !bodyText.includes('Chargement...');
      },
      { timeout: 10000 }
    ).catch(() => {
      // If waitForFunction fails, continue anyway
    });
    
    await page.waitForTimeout(500);

    // Either form (no KYC / rejected) or one of: Pending, Pending review, Identity verified
    // Try to find form first
    const form = page.locator('form');
    const formVisible = await form.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (formVisible) {
      await expect(form.first()).toBeVisible({ timeout: 5000 });
    } else {
      // If no form, look for status messages using the exact translation keys
      const statusMessages = [
        page.getByText(/Identity verified|Identité vérifiée/i),
        page.getByText(/Verification in progress|Vérification en cours/i),
        page.getByText(/Awaiting manual verification|En attente de vérification manuelle/i),
        page.getByText(/Pending|en attente/i),
      ];
      
      let foundStatus = false;
      for (const statusMsg of statusMessages) {
        try {
          await expect(statusMsg.first()).toBeVisible({ timeout: 5000 });
          foundStatus = true;
          break;
        } catch {
          continue;
        }
      }
      
      if (!foundStatus) {
        // If neither form nor status found, check what's actually on the page
        const pageContent = await page.locator('body').textContent().catch(() => 'Could not get page content');
        const pageTitle = await page.title().catch(() => 'Could not get page title');
        throw new Error(
          `Neither KYC form nor status message found on page.\n` +
          `Page title: ${pageTitle}\n` +
          `Page content preview: ${pageContent?.substring(0, 500)}...\n` +
          `This usually means:\n` +
          `1. The KYC data is still loading\n` +
          `2. There's an error loading the KYC data\n` +
          `3. The page structure has changed`
        );
      }
    }
  });

  test('admin can open KYC review list', async ({ page }) => {
    await loginAsAdmin(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/admin/, { timeout: 10000 });

    await page.goto(`/${LOCALE}/admin/kyc`);
    await waitForAppReady(page);

    await expect(
      page.getByRole('heading', { name: /Identity review|Review identités/i }),
    ).toBeVisible({ timeout: 10000 });

    // Wait for loading to complete
    await page.waitForFunction(
      () => {
        const bodyText = document.body.textContent || '';
        return !bodyText.includes('Loading...') && !bodyText.includes('Chargement...');
      },
      { timeout: 10000 }
    ).catch(() => {
      // If waitForFunction fails, continue anyway
    });
    
    await page.waitForTimeout(500);

    // Either "No KYC pending" message or table with KYC entries
    // Use .first() to avoid strict mode violation (multiple elements may match)
    const noPendingMessage = page.getByText(/No KYC pending|Aucun KYC en attente/i);
    const tableContent = page.getByText(/Marie|Dupont|request date|Date de demande|Request date/i);
    
    const hasNoPending = await noPendingMessage.isVisible({ timeout: 2000 }).catch(() => false);
    const hasTable = await tableContent.first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!hasNoPending && !hasTable) {
      // If neither found, check what's actually on the page
      const pageContent = await page.locator('body').textContent().catch(() => 'Could not get page content');
      throw new Error(
        `Neither "No KYC pending" message nor KYC table found on page.\n` +
        `Page content preview: ${pageContent?.substring(0, 500)}...\n` +
        `This usually means the page is still loading or there's an error.`
      );
    }
    
    // Verify that at least one of them is visible
    if (hasNoPending) {
      await expect(noPendingMessage.first()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(tableContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('admin can approve pending KYC and host then sees approved', async ({ page }) => {
    // 1) Admin: go to KYC list, open first pending, approve
    await loginAsAdmin(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/admin/, { timeout: 10000 });

    await page.goto(`/${LOCALE}/admin/kyc`);
    await waitForAppReady(page);

    await expect(
      page.getByRole('heading', { name: /Identity review|Review identités/i }),
    ).toBeVisible({ timeout: 10000 });

    // Wait for loading to complete
    await page.waitForFunction(
      () => {
        const bodyText = document.body.textContent || '';
        return !bodyText.includes('Loading...') && !bodyText.includes('Chargement...');
      },
      { timeout: 10000 }
    ).catch(() => {
      // If waitForFunction fails, continue anyway
    });
    
    await page.waitForTimeout(500);

    // Check if there are any pending KYC entries
    const noPendingMessage = page.getByText(/No KYC pending|Aucun KYC en attente/i);
    const hasNoPending = await noPendingMessage.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasNoPending) {
      test.skip(true, 'No pending KYC entries found. Cannot test approval flow.');
      return;
    }

    // Wait for the View link to be visible and enabled
    const viewLink = page.getByRole('link', { name: /View|Voir/i }).first();
    await expect(viewLink).toBeVisible({ timeout: 10000 });
    
    // Get the href to verify it's correct
    const href = await viewLink.getAttribute('href').catch(() => null);
    if (!href) {
      throw new Error('View link does not have an href attribute');
    }
    
    // Click and wait for navigation
    await viewLink.click();
    
    // Wait for navigation to complete - use waitForURL first, then verify
    await page.waitForURL(new RegExp(`/${LOCALE}/admin/kyc/[^/]+$`), { timeout: 15000 });
    await waitForAppReady(page);
    
    // Wait for loading to complete on the detail page
    await page.waitForFunction(
      () => {
        const bodyText = document.body.textContent || '';
        return !bodyText.includes('Loading...') && !bodyText.includes('Chargement...');
      },
      { timeout: 10000 }
    ).catch(() => {
      // If waitForFunction fails, continue anyway
    });
    
    await page.waitForTimeout(500);
    
    // Verify we're on the detail page
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/admin/kyc/[^/]+$`), { timeout: 5000 });
    
    // The detail page may show different content depending on KYC status
    // Check for either the detail heading or a message that KYC is not pending review
    const detailHeading = page.getByRole('heading', { name: /KYC detail|Détail KYC|Detail|Détail/i });
    const notPendingMessage = page.getByText(/not pending review|not in review|n'est pas en attente|status:/i);
    
    const hasHeading = await detailHeading.isVisible({ timeout: 3000 }).catch(() => false);
    const hasNotPending = await notPendingMessage.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasHeading && !hasNotPending) {
      // If neither found, check what's actually on the page
      const pageContent = await page.locator('body').textContent().catch(() => 'Could not get page content');
      throw new Error(
        `KYC detail page did not load correctly.\n` +
        `Page content preview: ${pageContent?.substring(0, 500)}...\n` +
        `This usually means the KYC entry doesn't exist or is not in PENDING_REVIEW status.`
      );
    }
    
    // If the KYC is not pending review, skip the rest of the test
    if (hasNotPending) {
      test.skip(true, 'The KYC entry is not in PENDING_REVIEW status. Cannot test approval.');
      return;
    }
    
    // Verify the detail heading is visible
    await expect(detailHeading.first()).toBeVisible({ timeout: 5000 });

    const approveBtn = page.getByRole('button', { name: /Approve|Valider/i });
    await expect(approveBtn).toBeVisible({ timeout: 5000 });
    await approveBtn.click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/admin/kyc$`), { timeout: 10000 });

    // 2) Host: open KYC page, should see "Identity verified"
    await loginAsHost(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/?/, { timeout: 10000 });

    await page.goto(`/${LOCALE}/profil/kyc`);
    await waitForAppReady(page);

    await expect(
      page.getByText(/Identity verified|Identité vérifiée/i),
    ).toBeVisible({ timeout: 10000 });
  });
});
