import { Given, When, Then, expect } from '../fixtures/test';
import { admin } from '../fixtures/users';
import { mockAuthResponse, mockSignIn } from '../support/auth-api';

Given('sign-in will establish an admin session', async ({ page }) => {
  await mockSignIn(page);
});
When('I submit the empty sign-in form', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
});
When('I sign in with the admin credentials', async ({ controls }) => {
  await controls.signIn(admin.email, 'password');
});
Then('the profile form is visible', async ({ page }) => {
  await expect(page.getByLabel('Full name')).toBeVisible();
});
Given('account activation will succeed', async ({ page }) => {
  await mockAuthResponse(page, 'activate-account/uid/token', {
    message: 'Account activated',
  });
});
When('I activate my account', async ({ page, authRequests }) => {
  const request = page.waitForRequest(
    '**/api/v1/auth/activate-account/uid/token/',
  );
  await page.getByRole('button', { name: 'Activate account' }).click();
  authRequests.activation = (await request).postDataJSON();
});
Then(
  'activation was requested without a password',
  async ({ authRequests }) => {
    expect(authRequests.activation).toEqual({});
  },
);
Then('the alert says {string}', async ({ page }, message: string) => {
  await expect(page.getByRole('alert')).toHaveText(message);
});
Given('password reset will succeed', async ({ page }) => {
  await mockAuthResponse(page, 'reset-password/token/uid', {
    message: 'Password reset',
  });
});
Given('the password reset link has expired', async ({ page }) => {
  await mockAuthResponse(
    page,
    'reset-password/token/uid',
    { detail: 'This link is invalid or expired.' },
    400,
  );
});
When('I submit a new password', async ({ page }) => {
  await page.getByLabel('New password', { exact: true }).fill('newpassword');
  await page
    .getByRole('button', { name: 'Reset password', exact: true })
    .click();
});
Given('the reset email service will succeed', async ({ page }) => {
  await mockAuthResponse(page, 'send-reset-password-email', {
    message: 'Check your email',
  });
});
Given('the reset email service rejects the email address', async ({ page }) => {
  await mockAuthResponse(
    page,
    'send-reset-password-email',
    { email: ['Email is invalid'] },
    400,
  );
});
When('I request a password reset email', async ({ page }) => {
  await page.getByLabel('Email').fill(admin.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
});
