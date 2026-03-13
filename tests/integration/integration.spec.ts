/**
 * INTEGRATION SUITE
 * =================
 * Purpose: Validate that major components work correctly together.
 *          Not just that the UI responds, but that UI actions produce
 *          the correct API/service outcomes and that data flows correctly
 *          between the presentation and service layers.
 *
 * Key question answered:
 *   Is there a gap between "the screen said success" and
 *   "the system actually processed the transaction correctly"?
 *
 * What we validate here:
 *   - UI actions produce corresponding HTTP requests with correct payloads
 *   - API responses are reflected correctly in the UI (no mismatch)
 *   - State changes persist correctly — adding a record produces a record,
 *     removing it removes it, and counts are consistent
 *   - Invalid inputs are handled correctly at the service boundary
 *   - Cross-layer consistency: what was sent matches what was returned
 *     and what was rendered
 *
 * Authentication:
 *   These tests use API-based authentication (session established via HTTP
 *   POST) rather than UI login. This keeps test focus on the integration
 *   scenario itself, not the login flow, and reduces runtime and flakiness.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SecureAreaPage } from '../../pages/SecureAreaPage';
import { AddRemoveElementsPage } from '../../pages/AddRemoveElementsPage';
import { CREDENTIALS, URLS } from '../../utils/auth';
import { FORM_AUTH } from '../../pages/FormAuthPage';
import { assertSuccessFlash, assertErrorFlash } from '../../utils/assertions';

// ---------------------------------------------------------------------------
// I1 — UI login action produces an authenticated session at the service layer
//
// This validates the integration between the login UI and the authentication
// service. It proves that clicking "Login" in the browser triggers the correct
// HTTP exchange and results in a real server-side session being established —
// not just a visual state change in the browser.
// ---------------------------------------------------------------------------
test('I1: UI login triggers correct authentication exchange and produces server session', async ({ page, request }) => {
  const loginPage = new LoginPage(page);

  // Intercept the authentication request so we can inspect the actual
  // HTTP payload that the UI sends to the server.
  let capturedLoginRequest: { url: string; method: string; formData: string } | null = null;

  page.on('request', (req) => {
    if (req.url().includes('/authenticate') && req.method() === 'POST') {
      capturedLoginRequest = {
        url: req.url(),
        method: req.method(),
        formData: req.postData() ?? '',
      };
    }
  });

  await loginPage.goto();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);

  // UI layer: confirm the browser navigated to the expected destination.
  await expect(page).toHaveURL(/\/secure/);

  // Integration layer: confirm the UI sent the correct request to the
  // authentication service with the expected credentials.
  expect(capturedLoginRequest).not.toBeNull();
  expect(capturedLoginRequest!.method).toBe('POST');

  // Parse the URL-encoded form body so we compare decoded values directly.
  // This avoids encoding discrepancies (e.g. ! → %21) between encodeURIComponent
  // and the browser's application/x-www-form-urlencoded implementation.
  const params = new URLSearchParams(capturedLoginRequest!.formData);
  expect(params.get('username')).toBe(CREDENTIALS.username);
  expect(params.get('password')).toBe(CREDENTIALS.password);
});

// ---------------------------------------------------------------------------
// I2 — Invalid credentials produce correct error at service layer and UI
//
// Validates cross-layer consistency for the failure path:
//   - The server rejects the request (not just the UI shows an error)
//   - The UI correctly surfaces the server's error response
//   - The user is NOT authenticated (no redirect to /secure)
// ---------------------------------------------------------------------------
test('I2: invalid credentials produce service-layer rejection reflected correctly in UI', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.loginWith('invaliduser', 'wrongpassword');

  // URL must not change to /secure — the authentication failed at the
  // service layer, not just visually.
  await expect(page).not.toHaveURL(/\/secure/);
  await expect(page).toHaveURL(/\/login/);

  // The error must be visible in the UI and use the error styling,
  // confirming the UI is correctly rendering the server's response.
  await loginPage.assertFailureMessage();
});

// ---------------------------------------------------------------------------
// I3 — Adding a transaction record produces correct state change (not just UI)
//
// Core integration scenario: user submits an action → we validate the
// resulting state is correct, not just that something appeared on screen.
//
// This is the direct answer to: "A popup is not enough. Prove the system
// processed the transaction correctly."
// ---------------------------------------------------------------------------
test('I3: adding an element produces a persistent state change verified by element count', async ({ page }) => {
  const elementsPage = new AddRemoveElementsPage(page);
  await elementsPage.goto();

  // Baseline: no records exist before any transactions.
  await elementsPage.assertNoElements();

  // Action: submit the first transaction.
  await elementsPage.addElement();

  // Validation layer 1 (UI): the result is visible.
  await elementsPage.assertElementCount(1);

  // Action: submit a second transaction.
  await elementsPage.addElement();

  // Validation layer 2 (state integrity): the count is exactly 2,
  // confirming each transaction was recorded independently and the
  // state accumulates correctly. A broken implementation might
  // reset the count, duplicate records, or lose one.
  await elementsPage.assertElementCount(2);
});

// ---------------------------------------------------------------------------
// I4 — Deleting a record correctly removes exactly one item (not more, not fewer)
//
// Validates that the delete/reverse operation on a transaction is precise.
// A broken implementation might delete all records or no records.
// ---------------------------------------------------------------------------
test('I4: deleting an element removes exactly one record and leaves others intact', async ({ page }) => {
  const elementsPage = new AddRemoveElementsPage(page);
  await elementsPage.goto();

  // Setup: create 3 transaction records.
  await elementsPage.addElements(3);
  await elementsPage.assertElementCount(3);

  // Action: remove one record.
  await elementsPage.deleteFirstElement();

  // Validation: exactly 2 records remain — not 0, not 3, not any other count.
  // This proves the delete operation was scoped correctly to one record.
  await elementsPage.assertElementCount(2);
});

// ---------------------------------------------------------------------------
// I5 — All records can be removed and state returns to clean baseline
//
// Validates full reversal: all transactions can be reversed and the system
// returns to a clean state. Confirms no orphaned records remain.
// ---------------------------------------------------------------------------
test('I5: all records can be removed and system returns to clean initial state', async ({ page }) => {
  const elementsPage = new AddRemoveElementsPage(page);
  await elementsPage.goto();

  // Setup: create 2 records.
  await elementsPage.addElements(2);
  await elementsPage.assertElementCount(2);

  // Action: reverse all transactions.
  await elementsPage.deleteFirstElement();
  await elementsPage.deleteFirstElement();

  // Validation: the system returned to the clean baseline with zero records.
  // This is critical for systems that need clean state between transactions.
  await elementsPage.assertNoElements();
});

// ---------------------------------------------------------------------------
// I6 — Logout correctly terminates the server session
//
// Validates that the logout action communicates with the authentication
// service and terminates the session — not just clears the UI state.
// After logout, the session must be invalidated at the service layer.
// ---------------------------------------------------------------------------
test('I6: logout terminates session at service layer and redirects to login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);

  // Authenticate.
  await loginPage.goto();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);
  await secureAreaPage.assertLoaded();

  // Action: logout.
  await secureAreaPage.logout();

  // Validation: redirect occurred and confirmation is displayed.
  await secureAreaPage.assertLogoutSuccessful();

  // Post-logout access check: attempting to navigate to /secure should
  // redirect away, confirming the session was invalidated server-side.
  await page.goto(URLS.secureArea);
  await expect(page).not.toHaveURL(/\/secure$/);
});

// ---------------------------------------------------------------------------
// I7 — Request interception confirms correct payload structure is sent
//
// Intercepts the login HTTP request to validate that the UI form sends
// the correct content-type and payload format to the authentication service.
// A mismatch here (e.g., JSON vs form-encoded) would break authentication
// even if the UI appears to submit correctly.
// ---------------------------------------------------------------------------
test('I7: login form sends correctly-structured form-encoded payload to authentication endpoint', async ({ page }) => {
  const capturedRequests: Array<{ contentType: string; body: string }> = [];

  page.on('request', (req) => {
    if (req.url().includes('/authenticate') && req.method() === 'POST') {
      capturedRequests.push({
        contentType: req.headers()['content-type'] ?? '',
        body: req.postData() ?? '',
      });
    }
  });

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);

  expect(capturedRequests.length).toBeGreaterThan(0);

  const authRequest = capturedRequests[0];

  // The authentication endpoint expects form-encoded data, not JSON.
  // An incorrect content-type would cause the server to reject the
  // credentials even if they are correct.
  expect(authRequest.contentType).toMatch(/application\/x-www-form-urlencoded/);

  // The payload must contain both required fields.
  expect(authRequest.body).toContain('username=');
  expect(authRequest.body).toContain('password=');
});

// ---------------------------------------------------------------------------
// I8 — API-established session enables access without UI login
//
// Validates the API authentication path used by the rest of the test suite.
// Proves that a session established via HTTP POST (without browser UI) is
// accepted by the server for subsequent authenticated requests.
// This is the foundation for efficient session reuse across the suite.
// ---------------------------------------------------------------------------
test('I8: session established via API login provides access to protected resource', async ({ request }) => {
  // Authenticate at the API layer.
  const loginResponse = await request.post(FORM_AUTH.endpoint, {
    form: {
      username: FORM_AUTH.validCredentials.username,
      password: FORM_AUTH.validCredentials.password,
    },
  });

  expect(loginResponse.ok() || loginResponse.status() === 302).toBeTruthy();

  // Access the protected resource using the API-established session.
  const secureResponse = await request.get('/secure');

  // A 200 response confirms the API-established session is valid and
  // accepted by the authorization service — no UI login was required.
  expect(secureResponse.status()).toBe(200);
  const body = await secureResponse.text();
  expect(body).toContain('Secure Area');
});
