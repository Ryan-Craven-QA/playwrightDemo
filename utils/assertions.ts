/**
 * Custom assertion helpers
 *
 * These wrappers encode the core quality principle of this demo:
 *   A confirmation popup is not enough.
 *   We must prove the action completed correctly in the system.
 *
 * Helpers here move validation beyond UI text and toward verifying
 * actual system state, API response contents, and data integrity.
 */

import { APIResponse, Page, expect } from '@playwright/test';

/**
 * Assert that a flash/alert message contains the expected text and that
 * it is the success variant (green), not an error variant.
 *
 * This validates the presentation layer signal — a necessary but not
 * sufficient condition for correctness.
 */
export async function assertSuccessFlash(page: Page, expectedText: string): Promise<void> {
  const flash = page.locator('#flash');
  await expect(flash).toBeVisible();
  await expect(flash).toContainText(expectedText);
  // The Herokuapp uses class "success" for green flash messages.
  await expect(flash).toHaveClass(/success/);
}

/**
 * Assert that a flash/alert message is the error variant.
 * Useful for negative-path validation.
 */
export async function assertErrorFlash(page: Page, expectedText: string): Promise<void> {
  const flash = page.locator('#flash');
  await expect(flash).toBeVisible();
  await expect(flash).toContainText(expectedText);
  await expect(flash).toHaveClass(/error/);
}

/**
 * Assert key fields in an API response body (JSON).
 *
 * This is the deeper validation layer — confirming that what the server
 * accepted and returned matches business expectations, not just that the
 * HTTP call succeeded.
 */
export async function assertApiResponseFields(
  response: APIResponse,
  expectedFields: Record<string, unknown>
): Promise<void> {
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  for (const [key, expectedValue] of Object.entries(expectedFields)) {
    expect(body).toHaveProperty(key, expectedValue);
  }
}

/**
 * Assert that an API response status is within the expected range and
 * that the body contains at minimum the given keys.
 */
export async function assertApiResponseStructure(
  response: APIResponse,
  expectedStatus: number,
  requiredKeys: string[]
): Promise<void> {
  expect(response.status()).toBe(expectedStatus);
  const body = await response.json();
  for (const key of requiredKeys) {
    expect(body).toHaveProperty(key);
  }
}

/**
 * Validate that a UI value displayed on the page matches a value
 * returned in a prior API response.
 *
 * This cross-layer assertion is the core of integration testing:
 * it proves the UI is rendering what the backend actually returned,
 * not just a hardcoded or cached value.
 */
export async function assertUiMatchesApiValue(
  page: Page,
  selector: string,
  apiValue: string
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  await expect(element).toContainText(apiValue);
}
