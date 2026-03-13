/**
 * FormAuthPage — Page Object for /login (alias for API-context usage)
 *
 * The Herokuapp's form authentication endpoint accepts POST requests
 * at /authenticate. This module documents the expected request/response
 * contract so API tests can validate it independently of the browser UI.
 */

export const FORM_AUTH = {
  endpoint: '/authenticate',
  successRedirect: '/secure',
  validCredentials: { username: 'admin', password: 'admin' },
  invalidCredentials: { username: 'wrong', password: 'wrong' },
  expectedSuccessText: 'You logged into a secure area!',
  expectedFailureText: 'Your username is invalid!',
} as const;
