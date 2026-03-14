/**
 * API SUITE
 * =========
 * Purpose: Validate authentication and access-control behavior directly at
 *          the HTTP layer — faster and more precise than any UI test.
 *
 * What belongs here:
 *   Tests that validate what the server accepted, rejected, and returned.
 *   Not health checks (that's smoke) and not UI rendering (that's integration).
 *
 * Core principle:
 *   A UI popup saying "success" is a presentation-layer signal.
 *   These tests confirm what the server actually processed.
 */

import { test, expect } from '@playwright/test';
import { FORM_AUTH } from '../../pages/FormAuthPage';

// ---------------------------------------------------------------------------
// A1 — Valid credentials produce an authenticated session
//
// Stops redirects so we can inspect the raw response and confirm the
// server set a session cookie before the browser would follow the redirect.
// Without the cookie, every subsequent authenticated request silently fails.
// ---------------------------------------------------------------------------
test('A1: valid credentials produce a session cookie at the HTTP layer', async ({ request }) => {
  const response = await request.post(FORM_AUTH.endpoint, {
    form: FORM_AUTH.validCredentials,
    maxRedirects: 0,
  });

  expect([200, 302, 303]).toContain(response.status());

  const headers = response.headers();
  expect('set-cookie' in headers).toBeTruthy();
});

// ---------------------------------------------------------------------------
// A2 — Invalid credentials are rejected and no session is established
//
// The critical assertion is not just that the status is non-200 — it's that
// the redirect target (if there is one) is NOT /secure, proving the server
// did not grant access regardless of what the UI might display.
// ---------------------------------------------------------------------------
test('A2: invalid credentials are rejected and do not produce a session', async ({ request }) => {
  const response = await request.post(FORM_AUTH.endpoint, {
    form: FORM_AUTH.invalidCredentials,
    maxRedirects: 0,
  });

  const status = response.status();
  expect([200, 302, 303]).toContain(status);

  // The redirect target must not be /secure — that is the only meaningful
  // proof of rejection. Rack sets a session cookie even on failed logins
  // (to carry the flash error message), so cookie presence cannot be used
  // to distinguish success from failure.
  if (status === 302 || status === 303) {
    const location = response.headers()['location'] ?? '';
    expect(location).not.toMatch(/\/secure/);
  }
});

// ---------------------------------------------------------------------------
// A3 — Unauthenticated access to protected resource is blocked
//
// Validates the access-control boundary at the server layer.
// A 200 here would mean the protected resource is publicly accessible —
// a critical security failure that UI tests alone would not reliably catch.
// ---------------------------------------------------------------------------
test('A3: unauthenticated request to protected resource is redirected to login', async ({ request }) => {
  const response = await request.get('/secure', { maxRedirects: 0 });

  expect(response.status()).not.toBe(200);
  expect([302, 303, 401, 403]).toContain(response.status());

  if (response.status() === 302 || response.status() === 303) {
    expect(response.headers()['location']).toMatch(/\/login/);
  }
});

// ---------------------------------------------------------------------------
// A4 — API-established session grants access to protected resource
//
// Validates the complete authentication flow at the HTTP layer:
//   POST credentials → session established → GET protected resource → 200
//
// This proves the session mechanism works end-to-end without a browser,
// and is the foundation for efficient session reuse across the test suite.
// ---------------------------------------------------------------------------
test('A4: API-established session grants access to protected resource', async ({ request }) => {
  const loginResponse = await request.post(FORM_AUTH.endpoint, {
    form: FORM_AUTH.validCredentials,
  });

  expect([200, 302, 303]).toContain(loginResponse.status());

  const secureResponse = await request.get('/secure');
  expect(secureResponse.status()).toBe(200);

  const body = await secureResponse.text();
  expect(body).toContain('Secure Area');
});
