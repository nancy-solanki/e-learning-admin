import { Given, When, Then, expect } from '../fixtures/test';
import { sessionAs } from '../support/session';

Given('I am signed in as {word}', async ({ page }, role: string) => {
  await sessionAs(page, role);
});
Given('I am anonymous', async ({ page }) => {
  await sessionAs(page, 'anonymous');
});
When('I open {string}', async ({ page }, path: string) => {
  await page.goto(path);
});
When('I reload the page', async ({ page }) => {
  await page.reload();
});
When('I press Escape', async ({ page }) => {
  await page.keyboard.press('Escape');
});
When(
  'I choose {string} from {string}',
  async ({ controls }, option: string, label: string) => {
    await controls.choose(label, option);
  },
);
When(
  'I search {string} for {string}',
  async ({ page }, kind: string, query: string) => {
    await page.getByLabel(`Search ${kind}`).fill(query);
  },
);
When('I clear the filters', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear filters' }).click();
});
Then('the URL is {string}', async ({ page }, path: string) => {
  await expect(page).toHaveURL(path);
});
Then('I see the heading {string}', async ({ page }, heading: string) => {
  await expect(
    page.getByRole('heading', { name: heading, exact: true }),
  ).toBeVisible();
});
Then('I see {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
});
Then('the dialog is closed', async ({ page }) => {
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
Then('the page fits the viewport', async ({ controls }) => {
  await controls.expectResponsive();
});
Then(
  'I see {int} of {int} {word}',
  async ({ page }, shown: number, total: number, kind: string) => {
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: `Showing ${shown} of ${total} ${kind}` }),
    ).toBeVisible();
  },
);

Then('the dialog shows {string}', async ({ page }, text: string) => {
  await expect(
    page.getByRole('dialog').getByText(text, { exact: true }),
  ).toBeVisible();
});

When(
  'I choose {string} from {string} in the dialog',
  async ({ page, controls }, option: string, label: string) => {
    await controls.choose(label, option, page.getByRole('dialog'));
  },
);

When('I follow the link {string}', async ({ page }, name: string) => {
  await page.getByRole('link', { name, exact: true }).click();
});
