/**
 * END-TO-END SUITE
 * ================
 * Purpose: Validate critical business workflows from the real user's perspective.
 *
 * Rules:
 *   - Reserved for journeys that span multiple features or lifecycle stages
 *   - Each test must cover something not already validated by a lower layer
 *   - Slower and more fragile than API/integration — use sparingly
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SecureAreaPage } from '../../pages/SecureAreaPage';
import { AddRemoveElementsPage } from '../../pages/AddRemoveElementsPage';
import { CREDENTIALS } from '../../utils/auth';

// ---------------------------------------------------------------------------
// E1 — Complete authentication lifecycle
//
// The most fundamental user journey: login → use the app → logout → gone.
// Lower-layer tests validate individual steps in isolation. This test proves
// the complete session lifecycle works as a connected sequence.
// ---------------------------------------------------------------------------
test('E1: complete session lifecycle — login, access secure content, logout, session terminated', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);

  await loginPage.goto();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);

  await secureAreaPage.assertLoaded();
  await secureAreaPage.assertWelcomeMessage();
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();

  await secureAreaPage.logout();
  await secureAreaPage.assertLogoutSuccessful();

  // Session must be gone — not just the UI cleared.
  await page.goto('/secure');
  await expect(page).not.toHaveURL(/\/secure$/);
});

// ---------------------------------------------------------------------------
// E2 — Error recovery: failed login attempt does not prevent subsequent success
//
// Validates the complete negative-then-positive path. I2 proves the server
// rejects invalid credentials. This test goes further: after rejection,
// the user can correct their credentials and successfully authenticate.
// A broken implementation might lock the form, corrupt state, or cache
// the error in a way that blocks a valid retry.
// ---------------------------------------------------------------------------
test('E2: user recovers from failed login and successfully authenticates on retry', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);

  await loginPage.goto();
  await loginPage.loginWith('wronguser', 'wrongpassword');

  await loginPage.assertFailureMessage();
  await expect(page).toHaveURL(/\/login/);
  await loginPage.assertLoginFormVisible();

  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);
  await secureAreaPage.assertLoaded();
  await secureAreaPage.assertWelcomeMessage();
});

// ---------------------------------------------------------------------------
// E3 — Full feature journey: auth + transaction feature + session cleanup
//
// Spans three concerns in one connected flow — authentication, the core
// transactional feature, and session termination — none of which can be
// validated in isolation at a lower layer. Validates state integrity at
// every step of both the add and delete phases before confirming the
// session is properly terminated at the end.
// ---------------------------------------------------------------------------
test('E3: full feature journey — login, add 3 elements, delete all 3, verify clean, logout', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);
  const elementsPage = new AddRemoveElementsPage(page);

  // Step 1: Authenticate.
  await loginPage.goto();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);
  await secureAreaPage.assertLoaded();

  // Step 2: Navigate to the transactional feature.
  await elementsPage.goto();

  // Step 3: Add phase — assert count accumulates correctly after each add.
  await elementsPage.addElement();
  await elementsPage.assertElementCount(1);

  await elementsPage.addElement();
  await elementsPage.assertElementCount(2);

  await elementsPage.addElement();
  await elementsPage.assertElementCount(3);

  // Step 4: Delete phase — assert count decrements precisely after each delete.
  await elementsPage.deleteFirstElement();
  await elementsPage.assertElementCount(2);

  await elementsPage.deleteFirstElement();
  await elementsPage.assertElementCount(1);

  await elementsPage.deleteFirstElement();
  await elementsPage.assertElementCount(0);

  // Step 5: Navigate back to secure area and log out.
  await secureAreaPage.goto();
  await secureAreaPage.logout();
  await secureAreaPage.assertLogoutSuccessful();
});
