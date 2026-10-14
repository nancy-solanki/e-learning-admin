import { Given, When, Then, expect } from '../fixtures/test';
import { mockLocalizations } from '../support/localizations-api';
Given('an empty localization service', async ({ page }) => {
  await mockLocalizations(page);
});
Then('the record filter shows all records', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: 'Filter by record status' }),
  ).toHaveText('All records');
});
When('I create the English localization for India', async ({ page }) => {
  await page.getByRole('button', { name: '+ Create localization' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Language name').fill('  English  ');
  await editor.getByLabel('Country').fill('  India  ');
  await editor.getByRole('button', { name: 'Create localization' }).click();
});
When(
  'I filter localizations by country {string}',
  async ({ page }, country: string) => {
    await page.getByLabel('Filter by country').fill(country);
  },
);
When(
  'I change the English localization country to United Kingdom',
  async ({ page }) => {
    await page.getByRole('button', { name: 'Edit English — India' }).click();
    const editor = page.getByRole('dialog');
    await expect(editor.getByLabel('Country')).toHaveValue('India');
    await editor.getByLabel('Country').fill('United Kingdom');
    await editor.getByRole('button', { name: 'Save changes' }).click();
  },
);
When('I delete the English localization', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Delete English — United Kingdom' })
    .click();
  await page
    .getByRole('button', { name: 'Delete localization', exact: true })
    .click();
});
Then(
  'the English localization has no delete or restore actions',
  async ({ page }) => {
    for (const action of ['Delete', 'Restore']) {
      await expect(
        page.getByRole('button', {
          name: `${action} English — United Kingdom`,
        }),
      ).toHaveCount(0);
    }
  },
);
Then('the localization table shows a deleted record', async ({ page }) => {
  await expect(
    page.getByRole('table').getByText('Deleted', { exact: true }),
  ).toBeVisible();
});
