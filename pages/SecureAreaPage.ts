/**
 * SecureAreaPage — Page Object for /secure
 *
 * Represents the authenticated landing page — the equivalent of the
 * "main application" a user reaches after successful login.
 * This is the destination we validate after each authentication flow.
 */

import { Page, expect } from '@playwright/test';

export class SecureAreaPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/secure');
  }

  async assertLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/secure/);
    await expect(this.page.getByRole('heading', { name: 'Secure Area' })).toBeVisible();
  }

  async assertWelcomeMessage(): Promise<void> {
    await expect(this.page.locator('#flash')).toContainText('You logged into a secure area!');
  }

  async logout(): Promise<void> {
    await this.page.getByRole('link', { name: 'Logout' }).click();
  }

  async assertLogoutSuccessful(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.page.locator('#flash')).toContainText('You logged out of the secure area!');
  }
}
