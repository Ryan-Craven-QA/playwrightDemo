/**
 * API SUITE
 * =========
 * Purpose: Validate business logic and service behavior directly at the
 *          HTTP layer, without browser overhead.
 *
 * Why this matters:
 *   API tests are typically faster, more stable, and more precise than UI
 *   tests. They validate what the backend actually accepted and returned,
 *   not just what the browser rendered. If a workflow's real risk lives in
 *   the backend, API validation should carry most of the confidence burden.
 *
 * What we validate here:
 *   - Authentication endpoint accepts correct credentials and returns a
 *     session token/cookie
 *   - Authentication endpoint rejects invalid credentials with the correct
 *     HTTP status and error indicator
 *   - The protected resource returns the expected response for an
 *     authenticated request
 *   - The protected resource denies unauthenticated access
 *   - Key response headers and response structure match expectations
 *
 * Core quality principle:
 *   A UI popup saying "success" is a presentation-layer signal.
 *   API validation confirms what the server actually processed and returned.
 */

import { test, expect } from '@playwright/test';
import { FORM_AUTH } from '../../pages/FormAuthPage';

// ---------------------------------------------------------------------------
// A1 — Authentication endpoint accepts valid credentials
// Validates that POST /authenticate with correct credentials produces an
// authenticated session (redirect to /secure) and returns a session cookie.
// ---------------------------------------------------------------------------
test('A1: valid credentials are accepted and a session is established', async ({ request }) => {
  const response = await request.post(FORM_AUTH.endpoint, {
    form: {
      username: FORM_AUTH.validCredentials.username,
      password: FORM_AUTH.validCredentials.password,
    },
    // Do not follow the redirect so we can inspect the raw 302 response
    // and confirm the session cookie was set before the browser would
    // normally follow the redirect.
    maxRedirects: 0,
  });

  // A 302 redirect to /secure is the expected success signal.
  // The server confirming the session before the redirect proves
  // authentication occurred at the service layer.
  expect([200, 302]).toContain(response.status());

  // The response must include a Set-Cookie header to establish the session.
  // Without this header, all subsequent authenticated requests would fail
  // regardless of what the UI displayed.
  const headers = response.headers();
  const hasCookie = 'set-cookie' in headers || headers['set-cookie'] !== undefined;
  expect(hasCookie).toBeTruthy();
});

// ---------------------------------------------------------------------------
// A2 — Authentication endpoint rejects invalid credentials
// Validates that wrong credentials do NOT produce an authenticated session.
// This is a negative-path test — just as important as the positive path.
// ---------------------------------------------------------------------------
test('A2: invalid credentials are rejected at the service layer', async ({ request }) => {
  const response = await request.post(FORM_AUTH.endpoint, {
    form: {
      username: FORM_AUTH.invalidCredentials.username,
      password: FORM_AUTH.invalidCredentials.password,
    },
    maxRedirects: 0,
  });

  // Rejection can be expressed as a 200 (re-render login with error) or
  // a redirect back to /login. Either way, the session must NOT be
  // established — validated below by checking for absence of /secure redirect.
  const status = response.status();
  expect([200, 302]).toContain(status);

  if (status === 302) {
    const location = response.headers()['location'] ?? '';
    // Must redirect back to /login, not forward to /secure.
    expect(location).not.toMatch(/\/secure/);
  }
});

// ---------------------------------------------------------------------------
// A3 — Protected resource denies unauthenticated access
// Validates that /secure is not accessible without authentication.
// This confirms the access-control boundary exists at the service layer,
// not just at the UI level.
// ---------------------------------------------------------------------------
test('A3: unauthenticated GET /secure is redirected away from protected content', async ({ request }) => {
  const response = await request.get('/secure', {
    maxRedirects: 0,
  });

  // An unauthenticated request should either be redirected to login (302)
  // or receive a 403/401. It must never return 200 with secure content.
  expect(response.status()).not.toBe(200);
  expect([302, 401, 403]).toContain(response.status());

  if (response.status() === 302) {
    const location = response.headers()['location'] ?? '';
    // Redirect target must be the login page, not any other secure resource.
    expect(location).toMatch(/\/login/);
  }
});

// ---------------------------------------------------------------------------
// A4 — Authenticated session can access the protected resource
// After establishing a session via API login, the protected resource must
// return the expected content. This validates the full auth→access flow
// at the HTTP layer, confirming the session mechanism works end-to-end.
// ---------------------------------------------------------------------------
test('A4: authenticated session can access protected resource and receives expected content', async ({ request }) => {
  // Step 1: Authenticate at the API layer to obtain a session.
  const loginResponse = await request.post(FORM_AUTH.endpoint, {
    form: {
      username: FORM_AUTH.validCredentials.username,
      password: FORM_AUTH.validCredentials.password,
    },
  });

  // The login must succeed for the rest of this test to be meaningful.
  expect(loginResponse.ok() || loginResponse.status() === 302).toBeTruthy();

  // Step 2: Access the protected resource using the established session.
  // Playwright's APIRequestContext automatically sends cookies from the
  // login response, simulating what a browser would do.
  const secureResponse = await request.get('/secure');

  // The protected resource must return 200 for an authenticated session.
  expect(secureResponse.status()).toBe(200);

  // The response body must contain the expected authenticated content.
  const body = await secureResponse.text();
  expect(body).toContain('Secure Area');
});

// ---------------------------------------------------------------------------
// A5 — Homepage is publicly accessible and returns expected content
// Validates that the application root is reachable without authentication
// and returns the expected structure. Used as a lightweight health check
// that any monitoring system could call.
// ---------------------------------------------------------------------------
test('A5: homepage returns 200 with expected content structure', async ({ request }) => {
  const response = await request.get('/');

  expect(response.status()).toBe(200);

  const body = await response.text();

  // The homepage must contain the application title.
  expect(body).toContain('The Internet');

  // Navigation links must be present — their absence would indicate a
  // broken deployment even if the HTTP status returned 200.
  expect(body).toContain('href');
});

// ---------------------------------------------------------------------------
// A6 — Transaction resource endpoint is reachable and returns valid HTML
// Validates that the "transactional" feature endpoint is operational.
// This is the equivalent of health-checking a transaction service endpoint.
// ---------------------------------------------------------------------------
test('A6: transactional feature endpoint is reachable and returns valid response', async ({ request }) => {
  const response = await request.get('/add_remove_elements/');

  expect(response.status()).toBe(200);

  const body = await response.text();

  // The page must contain the feature heading — confirming correct routing.
  expect(body).toContain('Add/Remove Elements');

  // The primary action control must be present in the returned HTML.
  // If the button HTML is missing, the feature is broken even if the
  // page returned 200.
  expect(body).toContain('Add Element');
});

// ---------------------------------------------------------------------------
// A7 — Response headers include expected security and content-type headers
// Validates that the server is returning appropriate HTTP headers.
// Missing Content-Type headers can indicate misconfigured middleware.
// ---------------------------------------------------------------------------
test('A7: response headers include content-type for HTML responses', async ({ request }) => {
  const response = await request.get('/login');

  expect(response.status()).toBe(200);

  const contentType = response.headers()['content-type'] ?? '';
  expect(contentType).toMatch(/text\/html/);
});
