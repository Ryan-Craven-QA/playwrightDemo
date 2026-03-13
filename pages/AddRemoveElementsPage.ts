/**
 * AddRemoveElementsPage — Page Object for /add_remove_elements
 *
 * Represents the "Add/Remove Elements" feature, used in this demo as a
 * proxy for a transactional operation: adding an element = submitting a
 * transaction record; removing it = reversing/deleting a record.
 *
 * This allows us to demonstrate data-state validation patterns without
 * requiring access to a real transactional backend.
 */

import { Page, expect, Locator } from '@playwright/test';

export class AddRemoveElementsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/add_remove_elements/');
  }

  async assertLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Add/Remove Elements' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Add Element' })).toBeVisible();
  }

  async addElement(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Element' }).click();
  }

  async addElements(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.addElement();
    }
  }

  getDeleteButtons(): Locator {
    return this.page.getByRole('button', { name: 'Delete' });
  }

  async deleteFirstElement(): Promise<void> {
    await this.getDeleteButtons().first().click();
  }

  async assertElementCount(expected: number): Promise<void> {
    await expect(this.getDeleteButtons()).toHaveCount(expected);
  }

  async assertNoElements(): Promise<void> {
    await expect(this.getDeleteButtons()).toHaveCount(0);
  }
}
