import type { Page } from '@playwright/test';

const DEFAULT_LOCALE = 'en';

export async function waitForAppReady(page: Page) {
  await page.getByTestId('intl-ready').waitFor({ state: 'visible', timeout: 20000 });
}

export function getLoginDemoUrl(locale = DEFAULT_LOCALE) {
  return `/${locale}/login?demo=1`;
}

export async function loginAsClient(page: Page, locale = DEFAULT_LOCALE) {
  await page.goto(getLoginDemoUrl(locale));
  await waitForAppReady(page);
  const demoSection = page.getByTestId('demo-login-section');
  await demoSection.getByPlaceholder('Email').fill('client@example.com', { timeout: 10000 });
  await demoSection.getByPlaceholder('Password').fill('demo', { timeout: 10000 });
  await demoSection.getByRole('button', { name: /Sign in/i }).click({ timeout: 10000 });
}

export async function loginAsHost(page: Page, locale = DEFAULT_LOCALE) {
  await page.goto(getLoginDemoUrl(locale));
  await waitForAppReady(page);
  const demoSection = page.getByTestId('demo-login-section');
  await demoSection.getByPlaceholder('Email').fill('host@example.com', { timeout: 10000 });
  await demoSection.getByPlaceholder('Password').fill('demo', { timeout: 10000 });
  await demoSection.getByRole('button', { name: /Sign in/i }).click({ timeout: 10000 });
}

export async function loginAsAdmin(page: Page, locale = DEFAULT_LOCALE) {
  await page.goto(getLoginDemoUrl(locale));
  await waitForAppReady(page);
  const demoSection = page.getByTestId('demo-login-section');
  await demoSection.getByPlaceholder('Email').fill('mohamedsakho@drivepark.net', { timeout: 10000 });
  await demoSection.getByPlaceholder('Password').fill('demo', { timeout: 10000 });
  await demoSection.getByRole('button', { name: /Sign in/i }).click({ timeout: 10000 });
}
