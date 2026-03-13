/**
 * LoginPage — Page Object for /login
 *
 * Encapsulates all interactions with the login form so that tests
 * remain readable and are isolated from selector changes.
 */

import { Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async fillUsername(username: string): Promise<void> {
    await this.page.getByLabel('Username').fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.page.getByLabel('Password').fill(password);
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: 'Login' }).click();
  }

  async loginWith(username: string, password: string): Promise<void> {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.submit();
  }

  async assertLoginFormVisible(): Promise<void> {
    await expect(this.page.getByLabel('Username')).toBeVisible();
    await expect(this.page.getByLabel('Password')).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Login' })).toBeVisible();
  }

  async assertSuccessMessage(): Promise<void> {
    const flash = this.page.locator('#flash');
    await expect(flash).toContainText('You logged into a secure area!');
    await expect(flash).toHaveClass(/success/);
  }

  async assertFailureMessage(): Promise<void> {
    const flash = this.page.locator('#flash');
    await expect(flash).toContainText('Your username is invalid!');
    await expect(flash).toHaveClass(/error/);
  }
}
