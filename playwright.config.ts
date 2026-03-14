import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Transaction System Quality Demo.
 *
 * Projects are separated by test layer type so each suite can be run
 * independently. This maps directly to the layered test pyramid strategy:
 *   - smoke:       fast deployment validation
 *   - api:         direct backend/service validation
 *   - integration: UI-to-API and cross-layer verification
 *   - e2e:         full critical business workflows
 *   - visual:      stable UI regression snapshots
 */
export default defineConfig({
  // Root directory for test discovery
  testDir: './tests',

  // Fail fast in CI to surface problems quickly
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: 'https://the-internet.herokuapp.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // -----------------------------------------------------------------------
    // SMOKE — fast deployment gate
    // Small, high-value tests that confirm the app is alive and usable.
    // These run first in CI and block the rest of the pipeline on failure.
    // -----------------------------------------------------------------------
    {
      name: 'smoke',
      testDir: './tests/smoke',
      use: { ...devices['Desktop Chrome'] },
    },

    // -----------------------------------------------------------------------
    // API — direct backend validation (no browser)
    // Faster and more stable than UI tests. Used for auth, data setup,
    // response verification, and business-logic assertions.
    // -----------------------------------------------------------------------
    {
      name: 'api',
      testDir: './tests/api',
      // API tests drive HTTP directly; no browser viewport needed.
    },

    // -----------------------------------------------------------------------
    // INTEGRATION — cross-layer validation
    // Confirms that UI actions produce correct API/service outcomes and that
    // data flows correctly between presentation and service layers.
    // -----------------------------------------------------------------------
    {
      name: 'integration',
      testDir: './tests/integration',
      use: { ...devices['Desktop Chrome'] },
    },

    // -----------------------------------------------------------------------
    // E2E — full business workflow coverage
    // Reserved for critical user journeys where end-to-end confidence matters.
    // Fewer tests, higher value, slower execution.
    // -----------------------------------------------------------------------
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },

    // -----------------------------------------------------------------------
    // VISUAL — stable UI regression snapshots
    // Lightweight guardrail for screens that should not visually change.
    // Run selectively, not on every commit.
    // -----------------------------------------------------------------------
    {
      name: 'visual',
      testDir: './tests/visual',
      // Always headless — headed mode renders fonts and pixels differently,
      // which causes false failures against headless-captured baselines.
      use: { ...devices['Desktop Chrome'], headless: true },
    },
  ],
});
