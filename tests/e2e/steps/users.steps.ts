import { Given, When, Then, expect } from '../fixtures/test';
import { admin, learner } from '../fixtures/users';
Given('the directory contains an admin and a learner', async ({ page }) => {
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ json: [admin, learner] }),
  );
});
When('I filter users to {string}', async ({ page }, role: string) => {
  await page.getByRole('button', { name: role, exact: true }).click();
});
Then('the directory shows Ada Lovelace', async ({ page }) => {
  await expect(
    page.getByRole('cell').filter({ hasText: 'Ada Lovelace' }),
  ).toBeVisible();
});
When('I reset the user filters', async ({ page }) => {
  await page.getByRole('button', { name: 'Reset All Filters' }).click();
});
