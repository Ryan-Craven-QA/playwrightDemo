/**
 * VISUAL REGRESSION SUITE
 * =======================
 * Purpose: Lightweight UI stability guardrail for screens that should
 *          not change during backend modernization.
 *
 * Why include visual tests:
 *   When the interface is expected to remain stable while the backend is
 *   being modernized, visual regression checks give us a low-cost way to
 *   detect unintended presentation changes. A backend refactor should not
 *   accidentally affect the login screen layout, a form's visual structure,
 *   or a confirmation page's appearance.
 *
 * Scope (deliberately limited):
 *   Visual testing is NOT applied everywhere — only to stable, high-value
 *   screens where unexpected visual change would signal a real problem.
 *   Broad visual coverage creates excessive false positives and maintenance
 *   burden without proportional confidence.
 *
 * Best candidates for visual regression:
 *   - Login screen (entry point — must stay consistent)
 *   - Key transaction/feature page (layout must not regress)
 *   - Confirmation/result areas (user-facing outcome display)
 *   - Structured output or summary screens
 *
 * How snapshots work:
 *   On first run (or when --update-snapshots is passed), Playwright captures
 *   baseline screenshots. On subsequent runs it compares against the baseline
 *   and fails if the diff exceeds the threshold.
 *
 *   To update baselines after an intentional UI change:
 *     npm run test:update-snapshots
 *
 * Threshold:
 *   maxDiffPixels is set conservatively to accommodate minor anti-aliasing
 *   and font-rendering differences across environments, while still catching
 *   real layout regressions.
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { CREDENTIALS } from '../../utils/auth';

// ---------------------------------------------------------------------------
// V1 — Login page visual snapshot
//
// The login page is the user-facing entry point. Its layout must remain
// stable. Any visual regression here (missing form fields, broken layout,
// shifted elements) would immediately affect all users.
// ---------------------------------------------------------------------------
test('V1: login page visual layout matches baseline snapshot', async ({ page }) => {
  await page.goto('/login');

  // Wait for the page to be fully settled before capturing.
  await page.waitForLoadState('networkidle');

  // Capture the full login form area for comparison.
  // We scope to the login container rather than the full page to reduce
  // noise from dynamic elements (ads, footers, etc.) that might change.
  await expect(page).toHaveScreenshot('login-page.png', {
    maxDiffPixels: 100,
    // Clip to the main content area to avoid irrelevant peripheral changes.
    clip: { x: 0, y: 0, width: 1280, height: 600 },
  });
});

// ---------------------------------------------------------------------------
// V2 — Login form component snapshot
//
// A targeted snapshot of just the login form component.
// This is more stable than a full-page snapshot because it is unaffected
// by header/footer changes or page chrome variations.
// ---------------------------------------------------------------------------
test('V2: login form component matches baseline snapshot', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const loginForm = page.locator('#login');
  await expect(loginForm).toBeVisible();

  // Component-level snapshot: only captures the form itself.
  // This is the most targeted and stable form of visual assertion.
  await expect(loginForm).toHaveScreenshot('login-form-component.png', {
    maxDiffPixels: 50,
  });
});

// ---------------------------------------------------------------------------
// V3 — Transactional feature page visual snapshot (initial state)
//
// Captures the Add/Remove Elements page before any interactions.
// This validates that the feature's initial presentation remains consistent
// across deployments — the "empty state" should always look the same.
// ---------------------------------------------------------------------------
test('V3: transactional feature page initial state matches baseline snapshot', async ({ page }) => {
  await page.goto('/add_remove_elements/');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('elements-page-initial.png', {
    maxDiffPixels: 100,
    clip: { x: 0, y: 0, width: 1280, height: 500 },
  });
});

// ---------------------------------------------------------------------------
// V4 — Transactional feature page post-action state snapshot
//
// Captures the state after a transaction has been submitted.
// Validates that the result presentation (the "Delete" button that represents
// a created record) renders correctly and consistently.
// ---------------------------------------------------------------------------
test('V4: transactional feature page post-submission state matches baseline snapshot', async ({ page }) => {
  await page.goto('/add_remove_elements/');
  await page.waitForLoadState('networkidle');

  // Submit a transaction to reach the post-action state.
  await page.getByRole('button', { name: 'Add Element' }).click();

  // Wait for the result to be fully rendered.
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();

  await expect(page).toHaveScreenshot('elements-page-with-record.png', {
    maxDiffPixels: 100,
    clip: { x: 0, y: 0, width: 1280, height: 500 },
  });
});

// ---------------------------------------------------------------------------
// V5 — Secure area page visual snapshot
//
// Captures the authenticated landing page.
// If the backend is refactored and it accidentally changes the secure area
// template (wrong partial rendered, missing welcome block, etc.), this
// snapshot will catch it without needing a deep functional test.
// ---------------------------------------------------------------------------
test('V5: secure area page matches baseline snapshot after successful login', async ({ page }) => {
  // Authenticate to reach the secure area.
  await page.goto('/login');
  await page.getByLabel('Username').fill(CREDENTIALS.username);
  await page.getByLabel('Password').fill(CREDENTIALS.password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for navigation and page settle.
  await expect(page).toHaveURL(/\/secure/);
  await page.waitForLoadState('networkidle');

  // Dismiss the flash message to get a stable baseline
  // (flash messages contain dynamic text that would cause snapshot noise).
  // We capture the main content area below the flash.
  const mainContent = page.locator('#content');
  await expect(mainContent).toBeVisible();

  await expect(mainContent).toHaveScreenshot('secure-area-content.png', {
    maxDiffPixels: 150,
  });
});

// ---------------------------------------------------------------------------
// V6 — Homepage visual snapshot
//
// The homepage is the public face of the application.
// This snapshot catches accidental template regressions that would be
// immediately visible to any visitor.
// ---------------------------------------------------------------------------
test('V6: homepage matches baseline snapshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixels: 200,
    clip: { x: 0, y: 0, width: 1280, height: 800 },
  });
});
