/**
 * SMOKE SUITE
 * ===========
 * Purpose: Fast deployment gate. Proves the application is alive and the
 *          single most critical user path still works after a deployment.
 *
 * Rules:
 *   - 3 tests only — each covers a distinct concern
 *   - Must complete in under 30 seconds
 *   - No overlap between tests
 *
 * Authentication note:
 *   S2 is the ONE test in the entire suite that validates real UI login.
 *   All other suites authenticate via API to avoid repeating this overhead.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SecureAreaPage } from '../../pages/SecureAreaPage';
import { CREDENTIALS } from '../../utils/auth';

// ---------------------------------------------------------------------------
// S1 — Application health check
// Confirms the server is up, routing works, and the homepage renders.
// This is the most basic gate: if this fails, nothing else is worth running.
// ---------------------------------------------------------------------------
test('S1: application is reachable and homepage renders correctly', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/The Internet/);
  await expect(page.getByRole('heading', { name: 'Welcome to the-internet' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// S2 — UI login (the ONE real browser login validation in the entire suite)
//
// Proves the full user entry path in a single test:
//   form is present → credentials accepted → redirect → confirmation visible
//   → secure content served → session active (logout link present)
//
// Splitting this into "form loads" + "login works" + "area accessible" is
// redundant — a successful login proves all three simultaneously.
// ---------------------------------------------------------------------------
test('S2: UI login succeeds and delivers authenticated user to secure area', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);

  await loginPage.goto();
  await loginPage.assertLoginFormVisible();
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);

  await secureAreaPage.assertLoaded();
  await secureAreaPage.assertWelcomeMessage();
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// S3 — Critical transaction path is operational
//
// Confirms the core feature is reachable AND processes an action correctly.
// Checking "button is visible" without also verifying it produces a result
// gives false confidence — a disabled or broken button can still be visible.
// ---------------------------------------------------------------------------
test('S3: transactional feature accepts input and produces correct state change', async ({ page }) => {
  await page.goto('/add_remove_elements/');

  const addButton = page.getByRole('button', { name: 'Add Element' });
  await expect(addButton).toBeVisible();
  await expect(addButton).toBeEnabled();

  await addButton.click();

  // Verify the action produced a record — not just that a button appeared,
  // but that exactly one record was created.
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(1);
});
