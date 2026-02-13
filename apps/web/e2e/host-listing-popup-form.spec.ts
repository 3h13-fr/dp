import { test, expect } from '@playwright/test';
import { loginAsHost, waitForAppReady } from './helpers';
import type { Page } from '@playwright/test';

const LOCALE = 'en';

/** NewListingPopup renders two dialogs: mobile sheet (nth 0, md:hidden on desktop) and desktop modal (nth 1, hidden on mobile). */
function getNewListingPopup(page: Page) {
  const size = page.viewportSize();
  const isDesktop = size != null && size.width >= 768;
  return page.locator('[role="dialog"]').nth(isDesktop ? 1 : 0);
}

/**
 * Helper to complete wizard steps 1-4 inside the popup
 */
async function completeWizardInPopup(page: Page, popup: ReturnType<Page['locator']>) {
  // Step 1: Select vehicle
  const vehicleButton = popup.getByRole('button', { name: /Vehicle for rent|Véhicule à louer/i });
  await expect(vehicleButton).toBeVisible({ timeout: 10000 });
  await vehicleButton.click();
  await page.waitForTimeout(300);
  await popup.getByRole('button', { name: /Next|Suivant/i }).click();
  await page.waitForTimeout(500);

  // Step 2: Select vehicle mode
  await expect(popup.getByRole('heading', { name: /Rental or chauffeur|Location ou chauffeur/i })).toBeVisible({ timeout: 10000 });
  await popup.getByRole('button', { name: /Rental only|Location seule/i }).click();
  await page.waitForTimeout(300);
  await popup.getByRole('button', { name: /Next|Suivant/i }).click();
  await page.waitForTimeout(500);

  // Step 3: Identify vehicle
  await expect(popup.getByRole('heading', { name: /Identify your vehicle|Identifiez votre véhicule/i })).toBeVisible({ timeout: 10000 });
  await popup.getByRole('button', { name: /Enter manually|Saisie manuelle/i }).click();
  await page.waitForTimeout(500);

  // Fill manual entry
  const makeSelect = popup.getByLabel(/Make|Marque/i);
  await expect(makeSelect).toBeVisible({ timeout: 5000 });
  await makeSelect.selectOption({ index: 1 });
  await page.waitForTimeout(1000);
  
  const modelSelect = popup.getByLabel(/Model|Modèle/i);
  await expect(modelSelect).toBeVisible({ timeout: 5000 });
  await modelSelect.selectOption({ index: 1 });
  await page.waitForTimeout(300);
  
  await popup.getByLabel(/Year|Année/i).fill('2020');
  await page.waitForTimeout(300);
  
  const validateButton = popup.getByRole('button', { name: /Validate|Valider/i });
  await expect(validateButton).toBeEnabled({ timeout: 5000 });
  await validateButton.click();
  await page.waitForTimeout(1000);

  // Confirm specs
  await expect(popup.getByText(/Vehicle specs|Caractéristiques/i)).toBeVisible({ timeout: 10000 });
  await popup.getByLabel(/Seats|Places/i).fill('5');
  await popup.getByLabel(/Doors|Portes/i).fill('4');
  await popup.getByLabel(/Luggage|Coffre/i).fill('2');
  await page.waitForTimeout(300);
  await popup.getByRole('button', { name: /Next|Suivant/i }).click();
  await page.waitForTimeout(500);

  // Step 4: Equipment
  await expect(popup.getByRole('heading', { name: /Equipment|Équipements/i })).toBeVisible({ timeout: 10000 });
  await popup.getByRole('button', { name: /Next|Suivant/i }).click();
  await page.waitForTimeout(1000);
}

test.describe('Host: New Listing Popup/Sheet Form', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    // Ensure mobile viewport: popup is a bottom sheet (md:hidden on desktop).
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsHost(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/host/, { timeout: 15000 });
  });

  test('popup opens when navigating to /listings/new', async ({ page }) => {
    // Navigate directly to new listing page
    await page.goto(`/${LOCALE}/host/listings/new`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);

    // Wait for popup to appear
    const popup = getNewListingPopup(page);
    await expect(popup).toBeVisible({ timeout: 15000 });
    
    // Wait for loading to complete - wait for wizard content or KYC message
    await Promise.race([
      expect(page.getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i }).or(
        page.getByRole('button', { name: /Vehicle for rent|Véhicule à louer/i })
      ).first()).toBeVisible({ timeout: 15000 }),
      expect(page.getByText(/verify your identity|vérifier votre identité/i)).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {});
    
    await page.waitForTimeout(1000);

    // Check for KYC requirement
    const kycText = page.getByText(/verify your identity|vérifier votre identité|must verify|devez vérifier/i);
    const kycVisible = await kycText.isVisible({ timeout: 2000 }).catch(() => false);
    if (kycVisible) {
      throw new Error('KYC verification is required. The host user must have APPROVED KYC status.');
    }

    // Check that wizard step 1 is shown (offer type selection) - it's inside the popup
    const container = popup;
    const step1Heading = container.getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i })
      .or(container.locator('h2').filter({ hasText: /What do you want to offer|Que souhaitez-vous proposer/i }));
    
    // Also check for the vehicle button as fallback
    const vehicleButton = container.getByRole('button', { name: /Vehicle for rent|Véhicule à louer/i });
    
    const foundHeading = await step1Heading.first().isVisible({ timeout: 5000 }).catch(() => false);
    const foundButton = await vehicleButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(foundHeading || foundButton).toBeTruthy();
  });

  test('wizard steps work correctly and show tabs after completion', async ({ page }) => {
    // Navigate directly to new listing page
    await page.goto(`/${LOCALE}/host/listings/new`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);

    // Wait for popup to appear
    const popupDialog = getNewListingPopup(page);
    await expect(popupDialog).toBeVisible({ timeout: 15000 });
    
    // Wait for loading to complete - the form shows "Loading..." while checking KYC
    // Wait until we see either the wizard content or KYC message
    await Promise.race([
      // Wait for wizard step 1 content
      expect(page.getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i }).or(
        page.getByRole('button', { name: /Vehicle for rent|Véhicule à louer/i })
      ).first()).toBeVisible({ timeout: 15000 }),
      // Or wait for KYC message
      expect(page.getByText(/verify your identity|vérifier votre identité|must verify|devez vérifier/i)).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {
      // If neither found, continue anyway - might be a timing issue
    });
    
    await page.waitForTimeout(1000);

    // Check for KYC requirement
    const kycText = page.getByText(/verify your identity|vérifier votre identité|must verify|devez vérifier/i);
    const kycVisible = await kycText.isVisible({ timeout: 2000 }).catch(() => false);
    if (kycVisible) {
      throw new Error('KYC verification is required. The host user must have APPROVED KYC status.');
    }

    // Use popup as container
    const container = popupDialog;

    // Complete wizard steps 1-4
    await completeWizardInPopup(page, container);

    // After step 4, tabs should be visible inside the popup
    const locationTab = container.getByRole('button', { name: /Localisation|Location/i });
    await expect(locationTab).toBeVisible({ timeout: 10000 });

    // Verify all tabs are present
    await expect(container.getByRole('button', { name: /Tarifs|Pricing/i })).toBeVisible({ timeout: 5000 });
    await expect(container.getByRole('button', { name: /Disponibilités|Availability/i })).toBeVisible({ timeout: 5000 });
    await expect(container.getByRole('button', { name: /Conditions|Rules/i })).toBeVisible({ timeout: 5000 });
    await expect(container.getByRole('button', { name: /Photos/i })).toBeVisible({ timeout: 5000 });
  });

  test('can fill location tab with all fields', async ({ page }) => {
    // Navigate directly to new listing page
    await page.goto(`/${LOCALE}/host/listings/new`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);

    // Wait for popup
    const popup = getNewListingPopup(page);
    await expect(popup).toBeVisible({ timeout: 15000 });
    
    // Wait for loading to complete
    await Promise.race([
      expect(page.getByRole('heading', { name: /What do you want to offer/i }).or(
        page.getByRole('button', { name: /Vehicle for rent/i })
      ).first()).toBeVisible({ timeout: 15000 }),
      expect(page.getByText(/verify your identity/i)).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {});
    
    await page.waitForTimeout(1000);

    // Complete wizard
    await completeWizardInPopup(page, popup);

    // Location tab should be active by default
    const locationTab = page.getByRole('button', { name: /Localisation|Location/i });
    await expect(locationTab).toBeVisible({ timeout: 10000 });

    // Fill address field (inside popup)
    const addressInput = popup.getByLabel(/Adresse|Address/i).first();
    await expect(addressInput).toBeVisible({ timeout: 5000 });
    await addressInput.fill('123 Test Street, Paris, France');
    await page.waitForTimeout(500);

    // Select pickup method
    const pickupMethod = popup.getByText(/Remise en main propre|Handover/i).first();
    await pickupMethod.click();
    await page.waitForTimeout(300);

    // Select return method
    const returnMethod = popup.getByText(/Même lieu|Same location/i).first();
    await returnMethod.click();
    await page.waitForTimeout(300);

    // Enable delivery
    const deliveryCheckbox = popup.getByLabel(/Service de livraison|Delivery service/i).first();
    if (await deliveryCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deliveryCheckbox.check();
      await page.waitForTimeout(300);

      // Fill delivery radius slider
      const deliveryRadius = popup.locator('input[type="range"]').first();
      if (await deliveryRadius.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deliveryRadius.fill('25');
      }

      // Fill delivery price
      const deliveryPrice = popup.getByLabel(/Prix de la livraison|Delivery price/i).first();
      if (await deliveryPrice.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deliveryPrice.fill('30');
      }
    }
  });

  test('can fill pricing tab with discounts', async ({ page }) => {
    // Navigate and complete wizard
    await page.goto(`/${LOCALE}/host/listings/new`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    const popup = getNewListingPopup(page);
    await expect(popup).toBeVisible({ timeout: 15000 });
    
    // Wait for loading to complete
    await Promise.race([
      expect(page.getByRole('heading', { name: /What do you want to offer/i }).or(
        page.getByRole('button', { name: /Vehicle for rent/i })
      ).first()).toBeVisible({ timeout: 15000 }),
      expect(page.getByText(/verify your identity/i)).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {});
    
    await page.waitForTimeout(1000);

    // Complete wizard
    await completeWizardInPopup(page, popup);

    // Click on pricing tab
    const pricingTab = popup.getByRole('button', { name: /Tarifs|Pricing/i });
    await pricingTab.click();
    await page.waitForTimeout(500);

    // Fill base price
    const priceInput = popup.getByLabel(/Tarif journalier|Price per day/i).first();
    await expect(priceInput).toBeVisible({ timeout: 5000 });
    await priceInput.fill('50');
    await page.waitForTimeout(300);

    // Enable discount 3 days
    const discount3DaysCheckbox = popup.locator('input[type="checkbox"]').filter({ 
      has: popup.getByText(/Remise à partir de 3 jours/i) 
    }).first();
    if (await discount3DaysCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await discount3DaysCheckbox.check();
      await page.waitForTimeout(300);

      // Fill discount percentage
      const discount3DaysInput = popup.locator('input[type="number"]').filter({ 
        has: popup.getByText(/Remise à partir de 3 jours/i) 
      }).first();
      if (await discount3DaysInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await discount3DaysInput.fill('10');
      }
    }

    // Expand additional options
    const additionalOptions = popup.getByRole('button', { name: /Options supplémentaires|Additional options/i });
    if (await additionalOptions.isVisible({ timeout: 2000 }).catch(() => false)) {
      await additionalOptions.click();
      await page.waitForTimeout(300);

      // Fill caution
      const cautionInput = popup.getByLabel(/Caution|Security deposit/i).first();
      if (await cautionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cautionInput.fill('500');
      }

      // Fill description
      const descriptionInput = popup.getByLabel(/Description/i).first();
      if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descriptionInput.fill('Test listing description');
      }
    }
  });

  test('can fill availability tab', async ({ page }) => {
    await page.goto(`/${LOCALE}/host/listings/new`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    const popup = getNewListingPopup(page);
    await expect(popup).toBeVisible({ timeout: 15000 });
    
    // Wait for loading to complete
    await Promise.race([
      expect(page.getByRole('heading', { name: /What do you want to offer/i }).or(
        page.getByRole('button', { name: /Vehicle for rent/i })
      ).first()).toBeVisible({ timeout: 15000 }),
      expect(page.getByText(/verify your identity/i)).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {});
    
    await page.waitForTimeout(1000);

    // Complete wizard
    await completeWizardInPopup(page, popup);

    // Click on availability tab
    const availabilityTab = popup.getByRole('button', { name: /Disponibilités|Availability/i });
    await availabilityTab.click();
    await page.waitForTimeout(500);

    // Fill booking constraints (inside popup)
    const minDuration = popup.getByLabel(/Durée minimum|Minimum duration/i).first();
    if (await minDuration.isVisible({ timeout: 2000 }).catch(() => false)) {
      await minDuration.fill('24');
    }

    const maxDuration = popup.getByLabel(/Durée maximum|Maximum duration/i).first();
    if (await maxDuration.isVisible({ timeout: 2000 }).catch(() => false)) {
      await maxDuration.fill('30');
    }

    const minNotice = popup.getByLabel(/Délai de réservation minimum|Minimum booking notice/i).first();
    if (await minNotice.isVisible({ timeout: 2000 }).catch(() => false)) {
      await minNotice.fill('24');
    }

    const maxAdvance = popup.getByLabel(/Réservation maximum|Maximum advance/i).first();
    if (await maxAdvance.isVisible({ timeout: 2000 }).catch(() => false)) {
      await maxAdvance.fill('180');
    }

    // Expand advanced options
    const advancedOptions = popup.getByRole('button', { name: /Options avancées|Advanced options/i });
    if (await advancedOptions.isVisible({ timeout: 2000 }).catch(() => false)) {
      await advancedOptions.click();
      await page.waitForTimeout(300);

      // Fill buffer hours
      const bufferHours = popup.getByLabel(/Heures de buffer|Buffer hours/i).first();
      if (await bufferHours.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bufferHours.fill('2');
      }
    }
  });

  test('can fill rules tab', async ({ page }) => {
    await page.goto(`/${LOCALE}/host/listings/new`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    const popup = getNewListingPopup(page);
    await expect(popup).toBeVisible({ timeout: 15000 });
    
    // Wait for loading to complete
    await Promise.race([
      expect(page.getByRole('heading', { name: /What do you want to offer/i }).or(
        page.getByRole('button', { name: /Vehicle for rent/i })
      ).first()).toBeVisible({ timeout: 15000 }),
      expect(page.getByText(/verify your identity/i)).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {});
    
    await page.waitForTimeout(1000);

    // Complete wizard
    await completeWizardInPopup(page, popup);

    // Click on rules tab
    const rulesTab = popup.getByRole('button', { name: /Conditions|Rules/i });
    await rulesTab.click();
    await page.waitForTimeout(500);

    // Fill usage rules (inside popup)
    const smokingCheckbox = popup.getByLabel(/Fumer autorisé|Smoking allowed/i).first();
    if (await smokingCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await smokingCheckbox.check();
    }

    const petsCheckbox = popup.getByLabel(/Animaux autorisés|Pets allowed/i).first();
    if (await petsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await petsCheckbox.check();
    }

    // Fill driver conditions
    const minAge = popup.getByLabel(/Âge minimum|Minimum age/i).first();
    if (await minAge.isVisible({ timeout: 2000 }).catch(() => false)) {
      await minAge.fill('21');
    }

    const minLicenseYears = popup.getByLabel(/Années de permis|License years/i).first();
    if (await minLicenseYears.isVisible({ timeout: 2000 }).catch(() => false)) {
      await minLicenseYears.fill('1');
    }

    // Fill return conditions
    const returnFuelLevel = popup.getByLabel(/Niveau de carburant|Fuel level/i).first();
    if (await returnFuelLevel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await returnFuelLevel.selectOption({ index: 0 });
    }
  });

  test('can create listing from popup form', async ({ page }) => {
    // Navigate and complete wizard
    await page.goto(`/${LOCALE}/host/listings/new`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    const popup = getNewListingPopup(page);
    await expect(popup).toBeVisible({ timeout: 15000 });
    
    // Wait for loading to complete
    await Promise.race([
      expect(page.getByRole('heading', { name: /What do you want to offer/i }).or(
        page.getByRole('button', { name: /Vehicle for rent/i })
      ).first()).toBeVisible({ timeout: 15000 }),
      expect(page.getByText(/verify your identity/i)).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {});
    
    await page.waitForTimeout(1000);

    // Complete wizard
    await completeWizardInPopup(page, popup);

    // Fill location tab
    const addressInput = popup.getByLabel(/Adresse|Address/i).first();
    await expect(addressInput).toBeVisible({ timeout: 5000 });
    await addressInput.fill('123 Test Street, Paris, France');
    await page.waitForTimeout(500);

    // Fill pricing tab
    const pricingTab = popup.getByRole('button', { name: /Tarifs|Pricing/i });
    await pricingTab.click();
    await page.waitForTimeout(500);

    const priceInput = popup.getByLabel(/Tarif journalier|Price per day/i).first();
    await expect(priceInput).toBeVisible({ timeout: 5000 });
    await priceInput.fill('50');
    await page.waitForTimeout(500);

    // Click create button (inside popup)
    const createButton = popup.getByRole('button', { name: /Créer l'annonce|Create listing/i });
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await expect(createButton).toBeEnabled({ timeout: 5000 });
    
    await createButton.click();

    // Should redirect to listing detail page
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/host/listings/[^/]+$`), { timeout: 20000 });
    await waitForAppReady(page);
  });

  test('can navigate between tabs', async ({ page }) => {
    // Navigate and complete wizard
    await page.goto(`/${LOCALE}/host/listings/new`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    const popup = getNewListingPopup(page);
    await expect(popup).toBeVisible({ timeout: 15000 });
    
    // Wait for loading to complete
    await Promise.race([
      expect(page.getByRole('heading', { name: /What do you want to offer/i }).or(
        page.getByRole('button', { name: /Vehicle for rent/i })
      ).first()).toBeVisible({ timeout: 15000 }),
      expect(page.getByText(/verify your identity/i)).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {});
    
    await page.waitForTimeout(1000);

    // Complete wizard
    await completeWizardInPopup(page, popup);

    // Navigate through all tabs (inside popup)
    const tabs = [
      /Localisation|Location/i,
      /Tarifs|Pricing/i,
      /Disponibilités|Availability/i,
      /Conditions|Rules/i,
      /Photos/i,
    ];

    for (const tabPattern of tabs) {
      const tab = popup.getByRole('button', { name: tabPattern });
      await expect(tab).toBeVisible({ timeout: 5000 });
      await tab.click();
      await page.waitForTimeout(300);
      
      // Verify tab is active (has different styling)
      await expect(tab).toHaveClass(/bg-neutral-200|bg-neutral-100/, { timeout: 2000 });
    }
  });

  test('popup can be closed', async ({ page }) => {
    await page.goto(`/${LOCALE}/host/listings/new`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);

    // Wait for popup
    const popup = getNewListingPopup(page);
    await expect(popup).toBeVisible({ timeout: 15000 });
    
    // Wait for loading to complete
    await Promise.race([
      expect(page.getByRole('heading', { name: /What do you want to offer/i }).or(
        page.getByRole('button', { name: /Vehicle for rent/i })
      ).first()).toBeVisible({ timeout: 15000 }),
      expect(page.getByText(/verify your identity/i)).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {});
    
    await page.waitForTimeout(1000);

    // Find close button (inside popup)
    const closeButton = popup.getByRole('button', { name: /Fermer|Close/i }).first();
    await expect(closeButton).toBeVisible({ timeout: 5000 });

    // Click close
    await closeButton.click();
    await page.waitForTimeout(1000);

    // Should redirect back to listings page
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/host/listings`), { timeout: 10000 });
  });

  test('experience flow works correctly', async ({ page }) => {
    await page.goto(`/${LOCALE}/host/listings/new`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);

    // Wait for popup
    const popup = getNewListingPopup(page);
    await expect(popup).toBeVisible({ timeout: 15000 });
    
    // Wait for loading to complete
    await Promise.race([
      expect(page.getByRole('heading', { name: /What do you want to offer/i }).or(
        page.getByRole('button', { name: /Vehicle for rent/i })
      ).first()).toBeVisible({ timeout: 15000 }),
      expect(page.getByText(/verify your identity/i)).toBeVisible({ timeout: 15000 }),
    ]).catch(() => {});
    
    await page.waitForTimeout(1000);

    // Select experience option (inside popup)
    const experienceButton = popup.getByRole('button', { name: /Experience|Expérience/i });
    await expect(experienceButton).toBeVisible({ timeout: 5000 });
    await experienceButton.click();
    await page.waitForTimeout(500);

    // Should show title field (inside popup)
    const titleInput = popup.getByLabel(/Titre de l'expérience|Experience title/i);
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill('Test Experience');
    await page.waitForTimeout(300);

    // Click next
    const nextButton = popup.getByRole('button', { name: /Next|Suivant/i });
    await expect(nextButton).toBeEnabled({ timeout: 5000 });
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Should show tabs (inside popup)
    const locationTab = popup.getByRole('button', { name: /Localisation|Location/i });
    await expect(locationTab).toBeVisible({ timeout: 10000 });
  });
});
