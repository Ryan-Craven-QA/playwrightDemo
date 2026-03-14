/**
 * Authentication utilities
 *
 * Strategy:
 *   - One smoke test validates the real UI login path end-to-end.
 *   - All other suites use API-based or session-based authentication to
 *     reduce runtime and eliminate login-flow flakiness.
 *
 * The Internet Herokuapp credentials:
 *   username: admin
 *   password: admin
 */

import { APIRequestContext, Page, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

export const CREDENTIALS = {
  username: 'tomsmith',
  password: 'SuperSecretPassword!',
} as const;

export const URLS = {
  login: '/login',
  secureArea: '/secure',
  home: '/',
} as const;

/**
 * Log in through the UI.
 * Use this only in smoke tests and the single UI-login validation scenario.
 * For everything else, prefer apiLogin() or session reuse.
 */
export async function uiLogin(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);
  await expect(page).toHaveURL(/\/secure/);
}

/**
 * Log in via HTTP POST and return the session cookie string.
 *
 * By authenticating at the HTTP layer we avoid the browser overhead of
 * rendering and interacting with the login page for every test that needs
 * an authenticated session. This is faster, more stable, and keeps test
 * intent focused on the feature under test rather than the login flow.
 */
export async function apiLogin(request: APIRequestContext): Promise<string> {
  const response = await request.post('/authenticate', {
    form: {
      username: CREDENTIALS.username,
      password: CREDENTIALS.password,
    },
  });

  // The Herokuapp uses a redirect after successful login; a 200 on /secure
  // or a redirect (302) to /secure both indicate success.
  const validStatuses = [200, 302];
  if (!validStatuses.includes(response.status())) {
    throw new Error(
      `API login failed with status ${response.status()}: ${await response.text()}`
    );
  }

  const cookies = response.headers()['set-cookie'] ?? '';
  return cookies;
}

/**
 * Inject an already-obtained session cookie into a page context so that
 * the page starts in an authenticated state without going through the
 * login UI or an additional API call.
 */
export async function injectSession(page: Page, cookieHeader: string): Promise<void> {
  const [name, value] = cookieHeader.split(';')[0].split('=');
  await page.context().addCookies([
    {
      name: name.trim(),
      value: value.trim(),
      domain: 'the-internet.herokuapp.com',
      path: '/',
    },
  ]);
}
