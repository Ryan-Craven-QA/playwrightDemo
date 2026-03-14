/**
 * FormAuthData — API contract constants for the /authenticate endpoint
 *
 * The Herokuapp's form authentication endpoint accepts POST requests
 * at /authenticate. This module documents the expected request/response
 * contract so API tests can validate it independently of the browser UI.
 *
 * Note: this is intentionally NOT a Page Object class — it has no Page
 * dependency and is used exclusively by the API suite. Browser-based
 * interactions with the login form belong to LoginPage.ts.
 */

export const FORM_AUTH = {
  endpoint: '/authenticate',
  successRedirect: '/secure',
  validCredentials: { username: 'tomsmith', password: 'SuperSecretPassword!' },
  invalidCredentials: { username: 'wrong', password: 'wrong' },
  expectedSuccessText: 'You logged into a secure area!',
  expectedFailureText: 'Your username is invalid!',
} as const;
