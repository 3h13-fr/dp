import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const DEFAULT_LOCALE = 'en';

export async function waitForAppReady(page: Page) {
  // Wait for the intl-ready marker
  await page.getByTestId('intl-ready').waitFor({ state: 'visible', timeout: 20000 });
  
  // Also wait for the page to be in a stable state (no pending network requests)
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {
    // Ignore if networkidle times out, continue anyway
  }
  
  // Wait a small amount for any React rendering to complete
  await page.waitForTimeout(200);
}

export function getLoginDemoUrl(locale = DEFAULT_LOCALE) {
  return `/${locale}/login?demo=1`;
}

export async function loginAsClient(page: Page, locale = DEFAULT_LOCALE) {
  await page.goto(getLoginDemoUrl(locale));
  await waitForAppReady(page);
  const demoSection = page.getByTestId('demo-login-section');
  await demoSection.getByPlaceholder('Email').fill('client@example.com', { timeout: 10000 });
  await demoSection.getByPlaceholder('Password').fill('demodemo', { timeout: 10000 });
  await demoSection.getByRole('button', { name: /Sign in/i }).click({ timeout: 10000 });
}

export async function loginAsHost(page: Page, locale = DEFAULT_LOCALE) {
  await page.goto(getLoginDemoUrl(locale));
  await waitForAppReady(page);
  const demoSection = page.getByTestId('demo-login-section');
  await demoSection.getByPlaceholder('Email').fill('host@example.com', { timeout: 10000 });
  await demoSection.getByPlaceholder('Password').fill('demodemo', { timeout: 10000 });
  await demoSection.getByRole('button', { name: /Sign in/i }).click({ timeout: 10000 });
  // Wait for redirect after login
  await expect(page).toHaveURL(/\/(en|fr)\/host/, { timeout: 15000 });
  await waitForAppReady(page);
}

export async function loginAsAdmin(page: Page, locale = DEFAULT_LOCALE) {
  await page.goto(getLoginDemoUrl(locale));
  await waitForAppReady(page);
  const demoSection = page.getByTestId('demo-login-section');
  await demoSection.getByPlaceholder('Email').fill('mohamedsakho@drivepark.net', { timeout: 10000 });
  await demoSection.getByPlaceholder('Password').fill('demodemo', { timeout: 10000 });
  await demoSection.getByRole('button', { name: /Sign in/i }).click({ timeout: 10000 });
}

/**
 * Navigate to the new listing creation page
 * Uses direct navigation instead of clicking menu links for better reliability
 */
export async function navigateToNewListing(page: Page, locale = DEFAULT_LOCALE) {
  // Wait for the page to be ready after login
  await waitForAppReady(page);
  
  // Check current URL - if already on listings/new page, skip navigation
  const currentUrl = page.url();
  if (currentUrl.includes(`/${locale}/host/listings/new`)) {
    // Already on the new listing page
    await waitForAppReady(page);
    // Wait a bit more for the page to fully render
    await page.waitForTimeout(1000);
    return;
  }
  
  // Navigate directly to listings page (more reliable than clicking menu links)
  if (!currentUrl.includes(`/${locale}/host/listings`)) {
    await page.goto(`/${locale}/host/listings`, { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    await expect(page).toHaveURL(new RegExp(`/${locale}/host/listings`), { timeout: 15000 });
  }
  
  // Now navigate to new listing page
  await waitForAppReady(page);
  await page.waitForTimeout(500); // Wait for any animations
  
  const addListingLink = page.getByRole('link', { name: /Add listing|Ajouter une annonce/i });
  await expect(addListingLink).toBeVisible({ timeout: 15000 });
  await addListingLink.click();
  
  // Wait for navigation to complete
  await expect(page).toHaveURL(new RegExp(`/${locale}/host/listings/new`), { timeout: 15000 });
  await waitForAppReady(page);
  
  // Wait a bit more for the page content to render
  await page.waitForTimeout(1000);
  
  // Check for any error messages or KYC requirements
  // The KYC reminder appears when kycStatus !== 'APPROVED'
  // Check for the heading "Action required" / "Action requise" or the text about identity verification
  const kycReminderHeading = page.getByRole('heading', { level: 1 }).filter({ 
    hasText: /Action required|Action requise/i 
  });
  const kycText = page.getByText(/verify your identity|vérifier votre identité|must verify|devez vérifier/i);
  const kycButton = page.getByRole('button', { name: /goToKyc|KYC|verification|vérification/i });
  
  // Check if any KYC-related element is visible
  const kycElements = [
    kycReminderHeading.isVisible({ timeout: 2000 }),
    kycText.isVisible({ timeout: 2000 }),
    kycButton.isVisible({ timeout: 2000 }),
  ];
  
  const kycResults = await Promise.allSettled(kycElements);
  const isKycRequired = kycResults.some(result => result.status === 'fulfilled' && result.value === true);
  
  if (isKycRequired) {
    const kycMessage = await Promise.race([
      kycText.first().textContent().catch(() => null),
      kycReminderHeading.first().textContent().catch(() => null),
    ]).catch(() => null);
    throw new Error(
      `KYC verification is required before creating listings.\n` +
      `The host user (host@example.com) must have APPROVED KYC status.\n` +
      `Message on page: ${kycMessage || 'KYC not approved'}\n` +
      `Please ensure the test host has approved KYC before running tests.`
    );
  }
  
  const errorText = await page.getByText(/error|Error|erreur/i).isVisible({ timeout: 1000 }).catch(() => false);
  if (errorText) {
    const errorMessage = await page.getByText(/error|Error|erreur/i).first().textContent().catch(() => 'Unknown error');
    throw new Error(`Error on listing creation page: ${errorMessage}`);
  }
  
  // Wait for popup to appear (the form is now in a popup/sheet)
  // Give it some time to render
  await page.waitForTimeout(1000);
  
  const popup = page.locator('[role="dialog"]');
  let popupVisible = false;
  
  try {
    await expect(popup.first()).toBeVisible({ timeout: 15000 });
    popupVisible = true;
  } catch (popupError) {
    // Popup not found, might be a different structure or error
    // Continue to check for content on page directly
  }
  
  // Wait for loading to complete - the form shows "Loading..." while checking KYC
  // Wait for wizard step 1 content (either in popup or on page) or KYC message
  const container = popupVisible ? popup.first() : page;
  
  // Try multiple selectors to find the step 1 content
  const step1Heading = container.getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i })
    .or(container.locator('h2').filter({ hasText: /What do you want to offer|Que souhaitez-vous proposer/i }));
  const vehicleButton = container.getByRole('button', { name: /Vehicle for rent|Véhicule à louer/i });
  
  // Wait for any of these to appear
  let foundContent = false;
  try {
    await Promise.race([
      expect(step1Heading.first()).toBeVisible({ timeout: 15000 }),
      expect(vehicleButton.first()).toBeVisible({ timeout: 15000 }),
      expect(kycText.first()).toBeVisible({ timeout: 15000 }),
    ]);
    foundContent = true;
  } catch (error) {
    // None found, will throw error below
  }
  
  if (!foundContent) {
    // If neither found, get diagnostic information
    const pageTitle = await page.title().catch(() => 'Could not get page title');
    const currentUrl = page.url();
    const isLoading = await page.getByText(/Loading|Chargement/i).isVisible({ timeout: 1000 }).catch(() => false);
    const errorMessages = await page.locator('body').textContent().catch(() => 'Could not get body text');
    const popupCount = await popup.count();
    
    throw new Error(
      `Step 1 content not found after navigation to ${currentUrl}.\n` +
      `Page title: ${pageTitle}\n` +
      `Loading state: ${isLoading}\n` +
      `Popup found: ${popupVisible} (count: ${popupCount})\n` +
      `Page contains: ${errorMessages?.substring(0, 500)}...\n` +
      `This usually means:\n` +
      `1. KYC is not approved for the host user\n` +
      `2. The page failed to load\n` +
      `3. There's a JavaScript error preventing render\n` +
      `4. The popup did not appear or content is not visible`
    );
  }
  
  // Additional wait to ensure everything is stable
  await page.waitForTimeout(300);
}

/**
 * Complete steps 1-4 of listing creation (Offer type → Vehicle mode → Vehicle identify → Equipment)
 * This function works with both the old full-page form and the new popup form
 */
export async function completeListingSteps1to4(page: Page) {
  // Step 1: Select offer type (Vehicle)
  // Wait for the page to be fully loaded and check for KYC requirement
  await waitForAppReady(page);
  
  // Check if KYC is required (page shows KYC reminder)
  const kycReminderHeading = page.getByRole('heading', { level: 1 }).filter({ 
    hasText: /Action required|Action requise/i 
  });
  const kycText = page.getByText(/verify your identity|vérifier votre identité|must verify|devez vérifier/i);
  const kycButton = page.getByRole('button', { name: /goToKyc|KYC|verification|vérification/i });
  
  // Check if any KYC-related element is visible
  const kycElements = [
    kycReminderHeading.isVisible({ timeout: 2000 }),
    kycText.isVisible({ timeout: 2000 }),
    kycButton.isVisible({ timeout: 2000 }),
  ];
  
  const kycResults = await Promise.allSettled(kycElements);
  const isKycRequired = kycResults.some(result => result.status === 'fulfilled' && result.value === true);
  
  if (isKycRequired) {
    const kycMessage = await Promise.race([
      kycText.first().textContent().catch(() => null),
      kycReminderHeading.first().textContent().catch(() => null),
    ]).catch(() => null);
    throw new Error(
      `KYC verification is required before creating listings.\n` +
      `The host user (host@example.com) must have APPROVED KYC status.\n` +
      `Message on page: ${kycMessage || 'KYC not approved'}\n` +
      `Please ensure the test host has approved KYC before running tests.`
    );
  }
  
  // Check if we're in popup mode (new form) or full-page mode (old form)
  const popup = page.locator('[role="dialog"]');
  const popupExists = await popup.first().isVisible({ timeout: 2000 }).catch(() => false);
  const container = popupExists ? popup.first() : page;
  
  // Wait for the step 1 heading to be visible (using h2 with text or heading role)
  const step1Heading = container.getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i })
    .or(container.locator('h2').filter({ hasText: /What do you want to offer|Que souhaitez-vous proposer/i }));
  
  const vehicleButton = container.getByRole('button', { name: /Vehicle for rent|Véhicule à louer/i });
  
  // Try to find the heading first
  try {
    await expect(step1Heading.first()).toBeVisible({ timeout: 15000 });
  } catch (headingError) {
    // If heading not found, try the button
    try {
      await expect(vehicleButton.first()).toBeVisible({ timeout: 5000 });
    } catch (buttonError) {
      // Both failed - get diagnostic information
      const pageTitle = await page.title().catch(() => 'Could not get page title');
      const currentUrl = page.url();
      
      // Check for loading state
      const isLoading = await page.getByText(/Loading|Chargement/i).isVisible({ timeout: 1000 }).catch(() => false);
      
      // Check for any error messages
      const errorMessages = await page.locator('body').textContent().catch(() => 'Could not get body text');
      
      throw new Error(
        `Step 1 content not found in completeListingSteps1to4 at ${currentUrl}.\n` +
        `Page title: ${pageTitle}\n` +
        `Loading state: ${isLoading}\n` +
        `Popup mode: ${popupExists}\n` +
        `Page contains: ${errorMessages?.substring(0, 500)}...\n` +
        `This usually means:\n` +
        `1. KYC is not approved for the host user\n` +
        `2. The page failed to load\n` +
        `3. There's a JavaScript error preventing render\n` +
        `4. navigateToNewListing was not called before completeListingSteps1to4`
      );
    }
  }
  
  await waitForAppReady(page);
  
  // Wait a bit more for any animations or transitions
  await page.waitForTimeout(500);
  
  await container.getByRole('button', { name: /Vehicle for rent|Véhicule à louer/i }).click();
  await page.waitForTimeout(300);
  await container.getByRole('button', { name: /Next|Suivant/i }).click();
  await page.waitForTimeout(500);

  // Step 2: Select vehicle mode (Rental only)
  await expect(container.getByRole('heading', { name: /Rental or chauffeur|Location ou chauffeur/i })).toBeVisible({ timeout: 10000 });
  await waitForAppReady(page);
  await container.getByRole('button', { name: /Rental only|Location seule/i }).click();
  await page.waitForTimeout(300);
  await container.getByRole('button', { name: /Next|Suivant/i }).click();
  await page.waitForTimeout(500);

  // Step 3: Identify vehicle (Manual entry)
  await expect(container.getByRole('heading', { name: /Identify your vehicle|Identifiez votre véhicule/i })).toBeVisible({ timeout: 10000 });
  await waitForAppReady(page);
  await container.getByRole('button', { name: /Enter manually|Saisie manuelle/i }).click();
  await page.waitForTimeout(500);

  // Fill manual entry form
  const makeSelect = container.getByLabel(/Make|Marque/i);
  await expect(makeSelect).toBeVisible({ timeout: 5000 });
  await makeSelect.selectOption({ index: 1 }); // Select first make
  await page.waitForTimeout(1000); // Wait for models to load
  
  const modelSelect = container.getByLabel(/Model|Modèle/i);
  await expect(modelSelect).toBeVisible({ timeout: 5000 });
  await modelSelect.selectOption({ index: 1 }); // Select first model
  await page.waitForTimeout(300);
  
  await container.getByLabel(/Year|Année/i).fill('2020');
  await page.waitForTimeout(300);
  
  const validateButton = container.getByRole('button', { name: /Validate|Valider/i });
  await expect(validateButton).toBeEnabled({ timeout: 5000 });
  await validateButton.click();
  await page.waitForTimeout(1000);

  // Confirm vehicle specs
  await expect(container.getByText(/Vehicle specs|Caractéristiques du véhicule/i)).toBeVisible({ timeout: 10000 });
  await waitForAppReady(page);
  
  await container.getByLabel(/Seats|Places/i).fill('5');
  await container.getByLabel(/Doors|Portes/i).fill('4');
  await container.getByLabel(/Luggage|Coffre/i).fill('2');
  await page.waitForTimeout(300);
  await container.getByRole('button', { name: /Next|Suivant/i }).click();
  await page.waitForTimeout(500);

  // Step 4: Equipment (skip - optional)
  await expect(container.getByRole('heading', { name: /Equipment|Équipements/i })).toBeVisible({ timeout: 10000 });
  await waitForAppReady(page);
  await container.getByRole('button', { name: /Next|Suivant/i }).click();
  await page.waitForTimeout(500);
}
