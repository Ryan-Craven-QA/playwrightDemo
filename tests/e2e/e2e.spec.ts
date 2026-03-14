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
// E2 — Full transaction lifecycle with state integrity at every step
//
// The demo's core answer to: "How do you know it actually processed correctly?"
// Validates the complete add → verify → delete → verify → clean cycle,
// checking state after every single operation to catch silent failures.
// ---------------------------------------------------------------------------
test('E2: full transaction lifecycle — create, verify state integrity, remove all, verify clean', async ({ page }) => {
  const elementsPage = new AddRemoveElementsPage(page);

  await elementsPage.goto();
  await elementsPage.assertNoElements();

  // Add phase — verify state accumulates correctly, not resets or duplicates.
  await elementsPage.addElement();
  await elementsPage.assertElementCount(1);

  await elementsPage.addElement();
  await elementsPage.assertElementCount(2);

  await elementsPage.addElement();
  await elementsPage.assertElementCount(3);

  // Delete phase — verify each removal is precise.
  await elementsPage.deleteFirstElement();
  await elementsPage.assertElementCount(2);

  await elementsPage.deleteFirstElement();
  await elementsPage.assertElementCount(1);

  await elementsPage.deleteFirstElement();
  await elementsPage.assertNoElements();

  // System must remain functional after a full transaction cycle.
  await expect(page.getByRole('button', { name: 'Add Element' })).toBeEnabled();
});

// ---------------------------------------------------------------------------
// E3 — Unauthenticated access is enforced as a browser-level experience
//
// A3 validates this at the HTTP layer. This test validates it as a user
// experiences it: the browser is redirected, lands on the login page,
// and the form is actionable. A server redirect that breaks the browser
// experience would pass A3 but fail here.
// ---------------------------------------------------------------------------
test('E3: unauthenticated user is redirected to login and presented with actionable form', async ({ page }) => {
  await page.goto('/secure');

  await expect(page).toHaveURL(/\/login/);

  const loginPage = new LoginPage(page);
  await loginPage.assertLoginFormVisible();
});

// ---------------------------------------------------------------------------
// E4 — Error recovery: failed login attempt does not prevent subsequent success
//
// Validates the complete negative-then-positive path. I2 proves the server
// rejects invalid credentials. This test goes further: after rejection,
// the user can correct their credentials and successfully authenticate.
// A broken implementation might lock the form, corrupt state, or cache
// the error in a way that blocks a valid retry.
// ---------------------------------------------------------------------------
test('E4: user recovers from failed login and successfully authenticates on retry', async ({ page }) => {
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
