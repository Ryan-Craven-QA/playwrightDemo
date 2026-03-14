/**
 * INTEGRATION SUITE
 * =================
 * Purpose: Validate that layers work correctly together.
 *          The question each test answers: is there a gap between
 *          "the screen said success" and "the system actually processed it"?
 *
 * What belongs here:
 *   - UI action → correct HTTP exchange (request interception)
 *   - Server response → correctly reflected in UI
 *   - State changes that are precise and accumulate correctly
 *   - Session lifecycle: creation and termination
 *
 * What does NOT belong here:
 *   - Pure API validation (that's the API suite)
 *   - Full user journeys (that's E2E)
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SecureAreaPage } from '../../pages/SecureAreaPage';
import { AddRemoveElementsPage } from '../../pages/AddRemoveElementsPage';
import { CREDENTIALS, URLS } from '../../utils/auth';

// ---------------------------------------------------------------------------
// I1 — UI login triggers the correct HTTP exchange
//
// Intercepts the network request to prove the browser sent the right method,
// content-type, and credentials to the authentication endpoint.
// A mismatch here (wrong content-type, missing field, wrong endpoint) would
// break authentication even if the UI appeared to submit correctly.
// ---------------------------------------------------------------------------
test('I1: UI login sends correctly-structured POST with valid credentials to auth endpoint', async ({ page }) => {
  let capturedRequest: { method: string; contentType: string; body: string } | null = null;

  page.on('request', (req) => {
    if (req.url().includes('/authenticate') && req.method() === 'POST') {
      capturedRequest = {
        method: req.method(),
        contentType: req.headers()['content-type'] ?? '',
        body: req.postData() ?? '',
      };
    }
  });

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);

  await expect(page).toHaveURL(/\/secure/);

  expect(capturedRequest).not.toBeNull();
  expect(capturedRequest!.method).toBe('POST');
  // Form-encoded is required — sending JSON would cause the server to
  // reject valid credentials without any obvious UI error.
  expect(capturedRequest!.contentType).toMatch(/application\/x-www-form-urlencoded/);
  // Parse to avoid URL-encoding discrepancies (e.g. ! → %21).
  const params = new URLSearchParams(capturedRequest!.body);
  expect(params.get('username')).toBe(CREDENTIALS.username);
  expect(params.get('password')).toBe(CREDENTIALS.password);
});

// ---------------------------------------------------------------------------
// I2 — Invalid credentials: server rejection is correctly reflected in the UI
//
// Validates cross-layer consistency on the failure path.
// The server rejects the request → the browser must not reach /secure →
// the UI must render the error response, not a success state.
// ---------------------------------------------------------------------------
test('I2: invalid credentials produce server rejection reflected correctly in UI', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginWith('invaliduser', 'wrongpassword');

  await expect(page).toHaveURL(/\/login/);
  await loginPage.assertFailureMessage();
});

// ---------------------------------------------------------------------------
// I3 — Add and delete operations maintain precise state at every step
//
// Validates both operations together because delete's correctness depends
// on add working first. Checking count at each step catches the failure
// modes that only checking the final count would miss: reset on second add,
// delete-all instead of delete-one, off-by-one in either direction.
// ---------------------------------------------------------------------------
test('I3: add and delete operations produce exact state changes at each step', async ({ page }) => {
  const elementsPage = new AddRemoveElementsPage(page);
  await elementsPage.goto();

  await elementsPage.assertNoElements();

  await elementsPage.addElement();
  await elementsPage.assertElementCount(1);

  await elementsPage.addElement();
  await elementsPage.assertElementCount(2);

  await elementsPage.addElement();
  await elementsPage.assertElementCount(3);

  // Delete one — must remove exactly one, not all, not none.
  await elementsPage.deleteFirstElement();
  await elementsPage.assertElementCount(2);
});

// ---------------------------------------------------------------------------
// I4 — Full reversal returns the system to a clean initial state
//
// Validates that the system can be fully unwound with no orphaned records.
// This is distinct from I3: I3 validates precision per-operation;
// I4 validates that the end state after complete reversal is truly empty.
// ---------------------------------------------------------------------------
test('I4: removing all records returns system to clean initial state', async ({ page }) => {
  const elementsPage = new AddRemoveElementsPage(page);
  await elementsPage.goto();

  await elementsPage.addElements(3);
  await elementsPage.assertElementCount(3);

  await elementsPage.deleteFirstElement();
  await elementsPage.deleteFirstElement();
  await elementsPage.deleteFirstElement();

  await elementsPage.assertNoElements();
  // Page must remain functional — no broken state after full reversal.
  await expect(page.getByRole('button', { name: 'Add Element' })).toBeEnabled();
});

// ---------------------------------------------------------------------------
// I5 — Logout terminates the session at the service layer
//
// Validates that logout is not just a UI state change. After logout,
// navigating directly to /secure must redirect away — proving the server
// invalidated the session, not just that the browser cleared a local flag.
// ---------------------------------------------------------------------------
test('I5: logout invalidates the server session and blocks subsequent access to protected resource', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);

  await loginPage.goto();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);
  await secureAreaPage.assertLoaded();

  await secureAreaPage.logout();
  await secureAreaPage.assertLogoutSuccessful();

  // Direct navigation after logout must not succeed.
  await page.goto(URLS.secureArea);
  await expect(page).not.toHaveURL(/\/secure$/);
});
