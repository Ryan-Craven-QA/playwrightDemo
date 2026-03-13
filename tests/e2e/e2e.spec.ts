/**
 * END-TO-END SUITE
 * ================
 * Purpose: Validate full business workflows across the entire application
 *          stack from the real user's perspective.
 *
 * Characteristics:
 *   - Fewer tests than lower-layer suites (quality over quantity)
 *   - Broader workflow coverage — each test exercises multiple features
 *   - Focused on critical user journeys only
 *   - Highest realism: tests follow the exact path a real user would take
 *   - Slower and more fragile than API or integration tests — used sparingly
 *
 * When to use E2E vs other layers:
 *   Use E2E when you need confidence that the ENTIRE transaction path
 *   works together end-to-end, not just individual layers in isolation.
 *   For validating a single API endpoint or a single UI component,
 *   use the API or integration suites instead.
 *
 * Authentication:
 *   E2E tests use real UI login for the login step itself (it is part of
 *   the workflow being validated). This is intentional — these tests
 *   represent real user journeys.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SecureAreaPage } from '../../pages/SecureAreaPage';
import { AddRemoveElementsPage } from '../../pages/AddRemoveElementsPage';
import { CREDENTIALS } from '../../utils/auth';

// ---------------------------------------------------------------------------
// E1 — Critical business workflow: full login → access → logout cycle
//
// This is the most fundamental user journey for any authenticated system.
// It validates the complete session lifecycle:
//   login → authenticated access → logout → session terminated
//
// A system that fails this workflow is not usable regardless of what
// individual components show in isolation.
// ---------------------------------------------------------------------------
test('E1: complete authentication lifecycle — login, access secure area, logout, session ended', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);

  // STEP 1: Navigate to login (user entry point)
  await loginPage.goto();
  await loginPage.assertLoginFormVisible();

  // STEP 2: Authenticate with valid credentials
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);

  // STEP 3: Verify successful authentication — destination and confirmation
  await secureAreaPage.assertLoaded();
  await secureAreaPage.assertWelcomeMessage();

  // STEP 4: Confirm the authenticated session provides access to secure content
  await expect(page.getByRole('heading', { name: 'Secure Area' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();

  // STEP 5: Logout to terminate the session
  await secureAreaPage.logout();

  // STEP 6: Verify session was fully terminated — back at login, confirmed
  await secureAreaPage.assertLogoutSuccessful();
  await expect(page).toHaveURL(/\/login/);

  // STEP 7: Confirm the session is truly gone — /secure should not be accessible
  await page.goto('/secure');
  await expect(page).not.toHaveURL(/\/secure$/);
});

// ---------------------------------------------------------------------------
// E2 — Full transactional workflow: create records, verify state, remove, verify clean
//
// This is the core business transaction scenario:
//   initiate → submit → verify created → remove → verify removed
//
// Each step validates not just UI feedback, but actual state integrity.
// This workflow is the demo's strongest answer to:
//   "How do you know the transaction actually processed correctly?"
// ---------------------------------------------------------------------------
test('E2: full transaction lifecycle — create records, verify state integrity, remove all, verify clean baseline', async ({ page }) => {
  const elementsPage = new AddRemoveElementsPage(page);

  // STEP 1: Navigate to the transactional feature
  await elementsPage.goto();
  await elementsPage.assertLoaded();

  // STEP 2: Verify clean initial state (no pre-existing records)
  await elementsPage.assertNoElements();

  // STEP 3: Submit first transaction
  await elementsPage.addElement();

  // STEP 4: Verify first transaction was recorded — state changed correctly
  await elementsPage.assertElementCount(1);

  // STEP 5: Submit second transaction
  await elementsPage.addElement();

  // STEP 6: Verify state accumulated correctly (not reset, not duplicated)
  await elementsPage.assertElementCount(2);

  // STEP 7: Submit third transaction
  await elementsPage.addElement();
  await elementsPage.assertElementCount(3);

  // STEP 8: Reverse (delete) first transaction — verify precision of removal
  await elementsPage.deleteFirstElement();
  await elementsPage.assertElementCount(2);

  // STEP 9: Reverse second transaction
  await elementsPage.deleteFirstElement();
  await elementsPage.assertElementCount(1);

  // STEP 10: Reverse final transaction — verify system returns to clean baseline
  await elementsPage.deleteFirstElement();
  await elementsPage.assertNoElements();

  // STEP 11: Confirm the page is still functional after all operations
  // (no broken state from the transaction cycle)
  await expect(page.getByRole('button', { name: 'Add Element' })).toBeEnabled();
});

// ---------------------------------------------------------------------------
// E3 — Security boundary workflow: unauthenticated access is blocked at service layer
//
// Validates that the authentication boundary is enforced as a user would
// experience it: attempting to access protected content without login
// results in being redirected to the login screen.
//
// This is not just a UI check — it validates the security contract of the
// entire application stack.
// ---------------------------------------------------------------------------
test('E3: unauthenticated user is redirected to login when accessing protected content', async ({ page }) => {
  // STEP 1: Attempt to access protected resource without authentication
  await page.goto('/secure');

  // STEP 2: Verify the system enforced the security boundary
  // The user should be redirected — not served the protected content.
  await expect(page).not.toHaveURL(/\/secure$/);

  // STEP 3: Verify the user lands on the correct recovery path (login page)
  // A proper system guides the user to authenticate, not just shows an error.
  await expect(page).toHaveURL(/\/login/);

  // STEP 4: Confirm the login form is presented and actionable
  const loginPage = new LoginPage(page);
  await loginPage.assertLoginFormVisible();
});

// ---------------------------------------------------------------------------
// E4 — Error handling workflow: incorrect credentials are handled gracefully
//
// Validates the complete negative-path user experience:
//   wrong credentials → error feedback → retry → success
//
// A robust system gives clear, accurate error feedback and allows the user
// to recover. This test validates the full recovery flow.
// ---------------------------------------------------------------------------
test('E4: user recovers from incorrect login attempt and successfully authenticates on retry', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const secureAreaPage = new SecureAreaPage(page);

  // STEP 1: Navigate to login
  await loginPage.goto();

  // STEP 2: Attempt login with wrong credentials
  await loginPage.loginWith('wronguser', 'wrongpassword');

  // STEP 3: Verify system provides correct error feedback
  await loginPage.assertFailureMessage();

  // STEP 4: Confirm user is still on login page (not bounced to error page)
  await expect(page).toHaveURL(/\/login/);

  // STEP 5: Confirm form is still usable for retry
  await loginPage.assertLoginFormVisible();

  // STEP 6: Retry with correct credentials (recovery path)
  await loginPage.loginWith(CREDENTIALS.username, CREDENTIALS.password);

  // STEP 7: Verify recovery was successful
  await secureAreaPage.assertLoaded();
  await secureAreaPage.assertWelcomeMessage();
});

// ---------------------------------------------------------------------------
// E5 — Multi-transaction workflow with state validation at each step
//
// Validates that the system correctly handles multiple sequential
// transactions and that the state is accurate at every checkpoint.
//
// This is the strongest demonstration of the "validate actual system state"
// principle — we check after every single state-changing operation.
// ---------------------------------------------------------------------------
test('E5: sequential transactions each produce correct incremental state — no silent failures', async ({ page }) => {
  const elementsPage = new AddRemoveElementsPage(page);
  await elementsPage.goto();

  // Validate state at each step to detect any silent failures.
  // A silent failure is when the UI appears to accept the transaction
  // but the state does not change correctly.
  const transactionCount = 5;

  for (let i = 1; i <= transactionCount; i++) {
    await elementsPage.addElement();

    // Each transaction must produce exactly the expected count.
    // This catches off-by-one errors, dropped transactions, or
    // duplicated records — all of which would be silent failures
    // if we only checked the final count.
    await elementsPage.assertElementCount(i);
  }

  // Final state validation: all 5 transactions are present.
  await elementsPage.assertElementCount(transactionCount);
});
