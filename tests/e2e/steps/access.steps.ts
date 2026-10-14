import { When, Then, expect } from '../fixtures/test';
import { sessionAs } from '../support/session';
When('the session changes to {word}', async ({ page }, role: string) => {
  await sessionAs(page, role);
});
Then('the sign-in form is available', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
});
