import { Given, When, Then, expect } from '../fixtures/test';
import { mockProfile } from '../support/profile-api';
Given('a profile service that accepts changes', async ({ page, apiState }) => {
  apiState.profile = await mockProfile(page);
});
Then('the full name is {string}', async ({ page }, name: string) => {
  await expect(page.getByLabel('Full name')).toHaveValue(name);
});
When('I save the full name {string}', async ({ page }, name: string) => {
  await page.getByLabel('Full name').fill(name);
  await page.getByRole('button', { name: 'Save changes' }).click();
});
Then(
  'the profile service received the name {string}',
  async ({ apiState }, name: string) => {
    expect(apiState.profile?.saved.full_name).toBe(name);
  },
);
When('I disable email notifications', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Notifications', exact: true })
    .click();
  await page.getByRole('checkbox', { name: /Email notifications/ }).uncheck();
  await page.getByRole('button', { name: 'Save notifications' }).click();
});
Then(
  'the profile service received disabled email notifications',
  async ({ apiState }) => {
    expect(apiState.profile?.saved.email_notifications).toBe(false);
  },
);
When(
  'I submit a password change with confirmation {string}',
  async ({ page, controls }, confirmation: string) => {
    await page.getByRole('button', { name: 'Password & Security' }).click();
    await controls.fillPasswordChange('password', 'newpassword', confirmation);
    await page
      .getByRole('button', { name: 'Change password', exact: true })
      .click();
  },
);
