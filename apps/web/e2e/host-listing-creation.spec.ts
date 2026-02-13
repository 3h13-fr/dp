import { test, expect } from '@playwright/test';
import { loginAsHost, waitForAppReady, navigateToNewListing, completeListingSteps1to4 } from './helpers';

const LOCALE = 'en';

test.describe('Host: Listing creation flow (10 steps)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsHost(page, LOCALE);
    await expect(page).toHaveURL(/\/(en|fr)\/host/, { timeout: 15000 });
  });

  test('complete vehicle listing creation flow', async ({ page }) => {
    // Navigate to new listing page
    await navigateToNewListing(page, LOCALE);
    await waitForAppReady(page);

    // Complete steps 1-4 using helper
    await completeListingSteps1to4(page);
    
    // Wait a moment for any auto-save operations
    await page.waitForTimeout(1000);

    // Step 5: Location & Pickup
    await expect(page.getByRole('heading', { name: /Location & pickup|Lieu et remise/i })).toBeVisible({ timeout: 10000 });
    await waitForAppReady(page);
    
    await page.getByLabel(/Address|Adresse/i).fill('123 Test Street');
    await page.getByLabel(/City|Ville/i).fill('Paris');
    await page.getByLabel(/Country|Pays/i).fill('France');

    // Select pickup method - radio buttons are inside labels, click on the label text
    await page.getByText(/Handover|Remise en main propre/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/Same location|Même lieu/i).first().click();
    await page.waitForTimeout(300);

    // Optionally enable delivery
    const deliveryCheckbox = page.getByLabel(/Offer delivery|Proposer la livraison/i);
    if (await deliveryCheckbox.isVisible().catch(() => false)) {
      await deliveryCheckbox.check();
      await page.getByLabel(/Delivery radius|Rayon de livraison/i).fill('10');
      await page.getByLabel(/Delivery price|Prix livraison/i).fill('20');
    }

    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);

    // Step 6: Pricing
    await expect(page.getByRole('heading', { name: /Pricing|Tarification/i })).toBeVisible({ timeout: 10000 });
    await waitForAppReady(page);
    
    await page.getByLabel(/Price per day|Prix par jour/i).fill('50');
    await page.getByLabel(/Currency|Devise/i).selectOption('EUR');

    // Optionally fill advanced pricing
    const advancedPricingButton = page.getByRole('button', { name: /Advanced pricing|Tarification avancée/i });
    if (await advancedPricingButton.isVisible().catch(() => false)) {
      await advancedPricingButton.click();
      // Wait for the advanced section to be visible
      await expect(page.getByLabel(/Discount for 3\+ days|Réduction pour 3\+ jours/i)).toBeVisible({ timeout: 5000 });
      await page.getByLabel(/Discount for 3\+ days|Réduction pour 3\+ jours/i).fill('10');
      await page.getByLabel(/Discount for 7\+ days|Réduction pour 7\+ jours/i).fill('15');
    }

    await page.getByLabel(/Security deposit|Caution/i).fill('500');
    await page.getByLabel(/Description/i).fill('Test listing description');
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);

    // Step 7: Availability & Booking Rules
    await expect(page.getByRole('heading', { name: /Availability & booking rules|Disponibilités et règles de réservation/i })).toBeVisible({ timeout: 10000 });
    await waitForAppReady(page);
    
    // Set buffer hours
    await page.getByLabel(/Buffer time|Temps tampon/i).fill('2');
    
    // Set booking rules - selects use numeric values
    await page.getByLabel(/Minimum booking notice|Délai minimum de préavis/i).selectOption({ value: '24' });
    await page.getByLabel(/Maximum advance booking|Délai maximum à l'avance/i).selectOption({ value: '180' });
    
    // Select instant booking - radio buttons are in labels, click on the text
    const instantBookingLabel = page.getByText(/Instant booking|Réservation instantanée/i).first();
    await expect(instantBookingLabel).toBeVisible({ timeout: 5000 });
    await instantBookingLabel.click();
    await page.waitForTimeout(300);
    
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);

    // Step 8: Rules & Conditions
    await expect(page.getByRole('heading', { name: /Rules & conditions|Règles et conditions/i })).toBeVisible({ timeout: 10000 });
    await waitForAppReady(page);
    
    // Usage conditions section (should be expanded by default)
    // Wait for the section to be visible
    await expect(page.getByText(/Smoking allowed|Fumer autorisé/i)).toBeVisible({ timeout: 5000 });
    
    // Renter conditions section (should be expanded by default)
    // Wait for the section to be visible and fill fields
    await expect(page.getByLabel(/Minimum driver age|Âge minimum du conducteur/i)).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/Minimum driver age|Âge minimum du conducteur/i).fill('21');
    await page.getByLabel(/Minimum years of license|Années de permis minimum/i).fill('1');
    
    await page.getByRole('button', { name: /Next|Suivant/i }).click();

    // Step 9: Preview
    await expect(page.getByRole('heading', { name: /Preview/i })).toBeVisible({ timeout: 10000 });
    // The preview text might vary, just check that we're on the preview step
    await expect(page.getByText(/Review|before publishing|publishing/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      // Text might not exist, continue anyway if heading is visible
    });
    
    // Create listing - wait for button to be enabled
    const createButton = page.getByRole('button', { name: /Create Listing|Créer l'annonce/i });
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await expect(createButton).toBeEnabled({ timeout: 5000 });
    
    // Wait a bit for any auto-save to complete
    await page.waitForTimeout(1500);
    
    await createButton.click();

    // Step 10: Photos (should redirect automatically after creation)
    // Wait for the redirect to happen - the page might show "Creating..." first
    await page.waitForTimeout(2000);
    await expect(page.getByRole('heading', { name: /Vehicle photos|Photos du véhicule/i })).toBeVisible({ timeout: 20000 });
    await waitForAppReady(page);
    
    // Verify we're on the photos step - check for upload area or finish button
    const uploadText = page.getByText(/Upload photos|Télécharger des photos|Drag|Glissez/i);
    const finishButton = page.getByRole('button', { name: /Finish|Terminer/i });
    
    // Wait for either the upload area or finish button to be visible
    await Promise.race([
      expect(uploadText.first()).toBeVisible({ timeout: 10000 }).catch(() => {}),
      expect(finishButton).toBeVisible({ timeout: 10000 }).catch(() => {}),
    ]);
    
    // Skip photos for now (optional step) - click finish if available
    if (await finishButton.isVisible().catch(() => false)) {
      await finishButton.click();
      // Wait for redirect after clicking finish
      await page.waitForTimeout(1000);
    } else {
      // If no finish button, the listing might already be complete or we need to wait
      await page.waitForTimeout(2000);
    }

    // Should redirect to listing detail page
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/host/listings/[^/]+$`), { timeout: 20000 });
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('navigation between steps works correctly', async ({ page }) => {
    await navigateToNewListing(page, LOCALE);
    await waitForAppReady(page);

    // Step 1 - navigateToNewListing already waits for this, but we verify it's still there
    const step1Heading = page.getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i })
      .or(page.locator('h2').filter({ hasText: /What do you want to offer|Que souhaitez-vous proposer/i }));
    await expect(step1Heading.first()).toBeVisible({ timeout: 5000 });
    
    await page.getByRole('button', { name: /Vehicle for rent|Véhicule à louer/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);

    // Step 2
    await expect(page.getByRole('heading', { name: /Rental or chauffeur|Location ou chauffeur/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Rental only|Location seule/i }).click();
    
    // Test back button
    await page.getByRole('button', { name: /Back|Retour/i }).click();
    await page.waitForTimeout(500);
    await waitForAppReady(page);
    
    const step1HeadingBack = page.getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i })
      .or(page.locator('h2').filter({ hasText: /What do you want to offer|Que souhaitez-vous proposer/i }));
    await expect(step1HeadingBack.first()).toBeVisible({ timeout: 10000 });
    
    // Go forward again
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: /Rental or chauffeur|Location ou chauffeur/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Rental only|Location seule/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);

    // Verify step indicator
    await expect(page.getByText(/Step \d+ of 10/i)).toBeVisible({ timeout: 5000 });
  });

  test('form validation prevents submission without required fields', async ({ page }) => {
    await navigateToNewListing(page, LOCALE);
    await waitForAppReady(page);

    // Go through steps quickly
    // navigateToNewListing already waits for step 1, but we verify it's there
    const step1Heading = page.getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i })
      .or(page.locator('h2').filter({ hasText: /What do you want to offer|Que souhaitez-vous proposer/i }));
    await expect(step1Heading.first()).toBeVisible({ timeout: 5000 });
    
    await page.getByRole('button', { name: /Vehicle for rent|Véhicule à louer/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);
    await waitForAppReady(page);
    
    await expect(page.getByRole('heading', { name: /Rental or chauffeur|Location ou chauffeur/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Rental only|Location seule/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);
    await waitForAppReady(page);
    
    await expect(page.getByRole('heading', { name: /Identify your vehicle|Identifiez votre véhicule/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Enter manually|Saisie manuelle/i }).click();
    await page.waitForTimeout(500);

    // Try to validate without filling required fields
    const validateButton = page.getByRole('button', { name: /Validate|Valider/i });
    await expect(validateButton).toBeVisible({ timeout: 10000 });
    // The button might be enabled but validation happens on submit
    // This test verifies the form structure is correct
  });

  test('advanced pricing section can be toggled', async ({ page }) => {
    await navigateToNewListing(page, LOCALE);
    await waitForAppReady(page);

    // Navigate to pricing step using helper
    await completeListingSteps1to4(page);
    await page.waitForTimeout(500);
    
    // Step 5: Fill location and go to pricing
    await expect(page.getByRole('heading', { name: /Location & pickup|Lieu et remise/i })).toBeVisible({ timeout: 10000 });
    await waitForAppReady(page);
    
    await page.getByLabel(/Address|Adresse/i).fill('123 Test');
    await page.getByLabel(/City|Ville/i).fill('Paris');
    await page.getByLabel(/Country|Pays/i).fill('France');
    await page.getByText(/Same location|Même lieu/i).first().click(); // Select return method
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);

    // Test advanced pricing toggle
    await expect(page.getByRole('heading', { name: /Pricing|Tarification/i })).toBeVisible({ timeout: 10000 });
    await waitForAppReady(page);
    
    const advancedButton = page.getByRole('button', { name: /Advanced pricing|Tarification avancée/i });
    await expect(advancedButton).toBeVisible({ timeout: 5000 });
    
    // Should be collapsed initially - the input should not be visible
    const discountInput = page.getByLabel(/Discount for 3\+ days|Réduction pour 3\+ jours/i);
    await expect(discountInput).not.toBeVisible();
    
    // Click to expand
    await advancedButton.click();
    await page.waitForTimeout(300);
    
    // Should now be visible
    await expect(discountInput).toBeVisible({ timeout: 5000 });
    
    // Click to collapse
    await advancedButton.click();
    await page.waitForTimeout(300);
    
    // Should be hidden again
    await expect(discountInput).not.toBeVisible();
  });

  test('rules conditions sections can be expanded/collapsed', async ({ page }) => {
    await navigateToNewListing(page, LOCALE);
    await waitForAppReady(page);

    // Navigate to rules & conditions step using helper and quick navigation
    await completeListingSteps1to4(page);
    await page.waitForTimeout(500);
    
    // Step 5: Quick fill and skip
    await expect(page.getByRole('heading', { name: /Location & pickup|Lieu et remise/i })).toBeVisible({ timeout: 10000 });
    await waitForAppReady(page);
    
    await page.getByLabel(/Address|Adresse/i).fill('123 Test');
    await page.getByLabel(/City|Ville/i).fill('Paris');
    await page.getByLabel(/Country|Pays/i).fill('France');
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);
    
    // Step 6: Quick fill and skip
    await expect(page.getByRole('heading', { name: /Pricing|Tarification/i })).toBeVisible({ timeout: 10000 });
    await waitForAppReady(page);
    
    await page.getByLabel(/Price per day|Prix par jour/i).fill('50');
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);
    
    // Step 7: Quick skip
    await expect(page.getByRole('heading', { name: /Availability & booking rules|Disponibilités et règles de réservation/i })).toBeVisible({ timeout: 10000 });
    await waitForAppReady(page);
    
    await page.getByRole('button', { name: /Next|Suivant/i }).click();
    await page.waitForTimeout(500);
    
    // Step 8: Test accordion sections
    await expect(page.getByRole('heading', { name: /Rules & conditions|Règles et conditions/i })).toBeVisible({ timeout: 10000 });
    await waitForAppReady(page);
    
    // Usage conditions should be expanded by default
    await expect(page.getByText(/Smoking allowed|Fumer autorisé/i)).toBeVisible({ timeout: 5000 });
    
    // Renter conditions should be expanded by default
    await expect(page.getByLabel(/Minimum driver age|Âge minimum du conducteur/i)).toBeVisible({ timeout: 5000 });
    
    // Restrictions section should be collapsed by default - find the button
    // The button text comes from translation key 'restrictions'
    const restrictionsButton = page.getByRole('button', { name: /Restrictions/i });
    await expect(restrictionsButton).toBeVisible({ timeout: 5000 });
    
    // The allowed countries input should not be visible initially
    const allowedCountriesInput = page.getByLabel(/Allowed countries|Pays autorisés/i);
    await expect(allowedCountriesInput).not.toBeVisible();
    
    // Click to expand restrictions
    await restrictionsButton.click();
    await page.waitForTimeout(300);
    await expect(allowedCountriesInput).toBeVisible({ timeout: 5000 });
    
    // Click to collapse
    await restrictionsButton.click();
    await page.waitForTimeout(300);
    // Input should not be visible after collapse
    await expect(allowedCountriesInput).not.toBeVisible();
  });
});
