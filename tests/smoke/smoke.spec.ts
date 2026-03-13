/**
 * SMOKE SUITE
 * ===========
 * Purpose: Fast deployment gate. Proves the application is alive, reachable,
 *          and that the single most important user path still works.
 *
 * Characteristics:
 *   - Small number of tests (fewer than 10)
 *   - Fast execution — should complete in under 60 seconds
 *   - High-value flows only
 *   - Suitable for blocking a CI/CD pipeline on failure
 *   - Minimal brittleness — no complex multi-step orchestration
 *
 * Authentication strategy note:
 *   This suite contains the ONE test that validates the real UI login path.
 *   All other suites use API-based or session-based authentication because:
 *     - It is faster
 *     - It is less flaky
 *     - It keeps test intent focused on the feature, not the login form
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SecureAreaPage } from '../../pages/SecureAreaPage';
import { CREDENTIALS } from '../../utils/auth';

// ---------------------------------------------------------------------------
// S1 — Application reachability
// ---------------------------------------------------------------------------
test('S1: application loads and homepage is accessible', async ({ page }) => {
  const response = await page.goto('/');

  // HTTP 200 confirms the server is up and serving content.
  expect(response?.status()).toBe(200);

  // The page should have a meaningful title — not a blank screen or error page.
  await expect(page).toHaveTitle(/The Internet/);

  // The navigation heading should be visible so we know the layout rendered.
  await expect(page.getByRole('heading', { name: 'Welcome to the-internet' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// S2 — Login page availability
// The login screen is the entry point for all authenticated workflows.
// We verify it loads and presents the expected form before attempting auth.
// ---------------------------------------------------------------------------
test('S2: login page loads with username and password form', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // URL must resolve to the login path.
  await expect(page).toHaveURL(/\/login/);

  // The form fields and submit button must be present and interactable.
  await loginPage.assertLoginFormVisible();
});

// ---------------------------------------------------------------------------
// S3 — UI Login (the ONE real browser login validation in the entire suite)
//
// This is the critical smoke test that proves:
//   1. The login screen accepts input correctly
//   2. The credentials are authenticated successfully
//   3. The user is redirected to the secure area
//   4. A success confirmation is displayed
//
// After this test validates the UI path once, all other suites prefer
// API-based authentication to avoid repeating this overhead.
// ---------------------------------------------------------------------------
test('S3: UI login with valid credentials navigates to secure area', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);

  await loginPage.goto();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);

  // Validate destination: user must land on /secure, not be bounced back.
  await secureAreaPage.assertLoaded();

  // Validate confirmation signal: the success flash must appear.
  // NOTE: This is the presentation-layer signal. The integration and API
  // suites validate the deeper backend state beyond this flash message.
  await secureAreaPage.assertWelcomeMessage();
});

// ---------------------------------------------------------------------------
// S4 — Authenticated area is accessible after login
// Confirms the protected resource is reachable for an authenticated session.
// ---------------------------------------------------------------------------
test('S4: authenticated user can access the secure area', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);

  await loginPage.goto();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);
  await secureAreaPage.assertLoaded();

  // The heading confirms the correct page was served.
  await expect(page.getByRole('heading', { name: 'Secure Area' })).toBeVisible();

  // The logout link confirms the session is active.
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// S5 — Critical transaction path can be initiated
// Validates that the core "transactional" feature of the app is reachable
// and ready to accept user input after loading.
// ---------------------------------------------------------------------------
test('S5: transactional feature (add/remove elements) loads and is ready', async ({ page }) => {
  await page.goto('/add_remove_elements/');

  await expect(page.getByRole('heading', { name: 'Add/Remove Elements' })).toBeVisible();

  // The primary action control must be present and enabled.
  const addButton = page.getByRole('button', { name: 'Add Element' });
  await expect(addButton).toBeVisible();
  await expect(addButton).toBeEnabled();
});

// ---------------------------------------------------------------------------
// S6 — A transaction can be submitted and produces a visible confirmation
// The most minimal end-to-end signal: action → result visible in the UI.
// NOTE: The integration suite goes further and validates the actual state
// change, not just the appearance of the result element.
// ---------------------------------------------------------------------------
test('S6: adding an element produces a visible result in the UI', async ({ page }) => {
  await page.goto('/add_remove_elements/');

  await page.getByRole('button', { name: 'Add Element' }).click();

  // A "Delete" button appearing confirms the transaction produced a record.
  // This is the UI-layer confirmation — the equivalent of a success popup.
  const deleteButton = page.getByRole('button', { name: 'Delete' });
  await expect(deleteButton).toBeVisible();
  await expect(deleteButton).toHaveCount(1);
});
