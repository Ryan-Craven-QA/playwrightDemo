/**
 * Authentication utilities
 *
 * Strategy:
 *   - One smoke test validates the real UI login path end-to-end.
 *   - All other suites authenticate by calling LoginPage.loginWith(CREDENTIALS)
 *     directly, keeping test intent focused on the feature under test.
 *
 * The Internet Herokuapp credentials:
 *   username: tomsmith
 *   password: SuperSecretPassword!
 */

export const CREDENTIALS = {
  username: 'tomsmith',
  password: 'SuperSecretPassword!',
} as const;

export const URLS = {
  login: '/login',
  secureArea: '/secure',
  home: '/',
} as const;

/*
 * Removed exports — dead code per developer checklist (no test file imported them):
 *
 *   uiLogin(page)
 *     Wrapped LoginPage.goto() + loginWith() + expect(url). Tests that need UI
 *     login call those LoginPage methods directly with CREDENTIALS, which is
 *     clearer and keeps the page object as the single interaction point.
 *
 *   apiLogin(request)
 *     Posted credentials via HTTP and returned the Set-Cookie header string.
 *     No test used it. Reintroduce at the point a test actually needs it.
 *
 *   injectSession(page, cookieHeader)
 *     Parsed and injected a raw Set-Cookie string into the browser context.
 *     No test used it. Reintroduce together with apiLogin when needed.
 */
