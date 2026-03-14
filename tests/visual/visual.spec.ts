/**
 * VISUAL REGRESSION SUITE
 * =======================
 * Purpose: Lightweight guardrail for stable screens during backend modernization.
 *
 * Scope rules:
 *   - Component-level snapshots preferred over full-page (less noise, more signal)
 *   - One snapshot per distinct screen state — not multiple angles of the same state
 *   - Only screens where unexpected visual change would indicate a real problem
 *
 * To update baselines after an intentional UI change:
 *   npm run test:update-snapshots
 */

import { test, expect } from '@playwright/test';
import { CREDENTIALS } from '../../utils/auth';

// ---------------------------------------------------------------------------
// V1 — Login form component
//
// Component-level snapshot of the form itself (#login). More stable than a
// full-page capture because it is unaffected by header/footer/chrome changes.
// Catches regressions to the one thing users actually interact with on this page.
// ---------------------------------------------------------------------------
test('V1: login form component matches baseline', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#login')).toHaveScreenshot('login-form.png', {
    maxDiffPixels: 50,
  });
});

// ---------------------------------------------------------------------------
// V2 — Transaction feature: initial (empty) state
//
// Captures the page before any interaction. If a deployment accidentally
// removes the Add Element button or breaks the initial layout, this fails
// immediately without needing to run any functional test.
// ---------------------------------------------------------------------------
test('V2: transaction feature initial state matches baseline', async ({ page }) => {
  await page.goto('/add_remove_elements/');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#content')).toHaveScreenshot('elements-initial.png', {
    maxDiffPixels: 50,
  });
});

// ---------------------------------------------------------------------------
// V3 — Transaction feature: post-submission state
//
// A distinct state from V2 — validates that the result of a transaction
// (the Delete button / created record) renders correctly and consistently.
// V2 and V3 together cover the before/after of the core user interaction.
// ---------------------------------------------------------------------------
test('V3: transaction feature post-submission state matches baseline', async ({ page }) => {
  await page.goto('/add_remove_elements/');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Add Element' }).click();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();

  await expect(page.locator('#content')).toHaveScreenshot('elements-with-record.png', {
    maxDiffPixels: 50,
  });
});

// ---------------------------------------------------------------------------
// V4 — Secure area content
//
// Captures the authenticated landing page content. A backend template change
// that accidentally renders the wrong partial or drops the welcome block
// will be caught here without needing a functional assertion to detect it.
// Flash message is excluded (dynamic text) — only stable content is captured.
// ---------------------------------------------------------------------------
test('V4: secure area content matches baseline after login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill(CREDENTIALS.username);
  await page.getByLabel('Password').fill(CREDENTIALS.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/secure/);
  await page.waitForLoadState('networkidle');

  // Scope to #content to exclude the flash message (dynamic, unstable).
  await expect(page.locator('#content')).toHaveScreenshot('secure-area.png', {
    maxDiffPixels: 100,
  });
});

// ---------------------------------------------------------------------------
// V5 — Homepage
//
// The most public-facing screen. Catches accidental layout or template
// regressions that would be immediately visible to every visitor.
// ---------------------------------------------------------------------------
test('V5: homepage matches baseline', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#content')).toHaveScreenshot('homepage.png', {
    maxDiffPixels: 100,
  });
});
