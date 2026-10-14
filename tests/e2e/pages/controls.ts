import { expect, type Page, type Locator } from '@playwright/test';

/** Shared controls, used by both BDD steps and focused regression tests. */
export class Controls {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async choose(
    label: string,
    option: string,
    scope: Page | Locator = this.page,
  ) {
    await scope.getByRole('button', { name: label, exact: true }).click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async openNavigation() {
    const menu = this.page.getByRole('button', {
      name: 'Open menu',
      exact: true,
    });
    if (await menu.isVisible()) await menu.click();
  }

  async signIn(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password', { exact: true }).fill(password);
    await this.page
      .getByRole('button', { name: 'Sign in', exact: true })
      .click();
  }

  async fillPasswordChange(
    current: string,
    password: string,
    confirmation: string,
  ) {
    await this.page
      .getByLabel('Current password', { exact: true })
      .fill(current);
    await this.page.getByLabel('New password', { exact: true }).fill(password);
    await this.page
      .getByLabel('Confirm new password', { exact: true })
      .fill(confirmation);
  }

  async fillInvitation(email: string) {
    const dialog = this.page.getByRole('dialog', {
      name: 'Create user',
      exact: true,
    });
    await dialog.getByLabel('First name').fill('Grace');
    await dialog.getByLabel('Last name').fill('Hopper');
    await dialog.getByLabel('Username').fill('grace');
    await dialog.getByLabel('Email', { exact: true }).fill(email);
  }

  async dropFile(
    selector: string,
    name: string,
    mimeType: string,
    bytes: number[],
  ) {
    await this.page
      .getByRole('dialog')
      .locator(selector)
      .evaluate(
        (element, file) => {
          const transfer = new DataTransfer();
          transfer.items.add(
            new File([new Uint8Array(file.bytes)], file.name, {
              type: file.mimeType,
            }),
          );
          element.dispatchEvent(
            new DragEvent('drop', { bubbles: true, dataTransfer: transfer }),
          );
        },
        { name, mimeType, bytes },
      );
  }

  async expectResponsive() {
    expect(
      await this.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
}
