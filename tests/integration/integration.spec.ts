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
 *   - A button click → verify the resulting DOM state change
 *
 * What does NOT belong here:
 *   - Pure API validation (that's the API suite)
 *   - Full user journeys or session lifecycle tests (that's E2E)
 *   - Full add-then-delete cycles (that's E2E)
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { AddRemoveElementsPage } from '../../pages/AddRemoveElementsPage';
import { CREDENTIALS } from '../../utils/auth';

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
// the UI must render the error response with the correct `error` CSS class,
// not a success state.
// ---------------------------------------------------------------------------
test('I2: invalid credentials produce server rejection reflected correctly in UI', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginWith('invaliduser', 'wrongpassword');

  await expect(page).toHaveURL(/\/login/);
  await loginPage.assertFailureMessage();
});

// ---------------------------------------------------------------------------
// I3 — Add element: UI action produces correct DOM state change
//
// Validates the seam between the button click and the resulting DOM update.
// After one click the DOM must contain exactly 1 Delete button — no more,
// no less. This is a layer-boundary check: the click was received, the
// server processed it, and the UI reflects the resulting state precisely.
// ---------------------------------------------------------------------------
test('I3: adding one element produces exactly 1 Delete button in the DOM', async ({ page }) => {
  const elementsPage = new AddRemoveElementsPage(page);
  await elementsPage.goto();

  await elementsPage.addElement();

  await elementsPage.assertElementCount(1);
});
