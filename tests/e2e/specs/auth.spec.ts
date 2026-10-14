import { mockSignIn } from '../support/auth-api';
import { test, expect } from '../fixtures/test';
import { admin } from '../fixtures/users';

test('sign-in success, home navigation, and failed server logout', async ({
  controls,
  page,
}) => {
  await mockSignIn(page);
  await page.route('**/api/v1/auth/sign-out/', (route) =>
    route.fulfill({ status: 500, json: {} }),
  );
  await page.goto('/auth/sign-in');
  await controls.signIn(admin.email, 'password');
  await expect(
    page.getByRole('heading', { name: 'Welcome to your dashboard' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Profile', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await controls.openNavigation();
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(
    page.getByText('Unable to log out. Please try again.'),
  ).toBeVisible();
  await page.route('**/api/v1/auth/sign-out/', (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/auth\/sign-in/);
  expect(
    await page.evaluate(() => localStorage.getItem('learninfy.auth')),
  ).toBeNull();
});

test('invalid credentials and failed profile fetch leave no session', async ({
  controls,
  page,
}) => {
  await page.route('**/api/v1/auth/staff/sign-in/', (route) =>
    route.fulfill({ status: 401, json: { detail: 'Invalid credentials' } }),
  );
  await page.goto('/auth/sign-in');
  await controls.signIn(admin.email, 'password');
  await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
  await page.route('**/api/v1/auth/staff/sign-in/', (route) =>
    route.fulfill({ json: {} }),
  );
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ status: 500, json: { detail: 'Unavailable' } }),
  );
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Unavailable');
  expect(
    await page.evaluate(() => localStorage.getItem('learninfy.auth')),
  ).toBeNull();
});

test('sign-in toggles password visibility and submits short passwords unchanged', async ({
  page,
}) => {
  let submitted: unknown;
  await page.route('**/api/v1/auth/staff/sign-in/', (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({
      status: 401,
      json: { detail: 'Invalid credentials' },
    });
  });
  await page.goto('/auth/sign-in');
  await expect(page.locator('img[src="/icons/favicon.svg"]')).toBeVisible();
  await page.getByLabel('Email').fill(admin.email);
  const password = page.getByLabel('Password', { exact: true });
  await password.fill('x');
  await expect(password).toHaveAttribute('type', 'password');
  await page
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('x');
  expect(submitted).toBeUndefined();
  await page
    .getByRole('button', { name: 'Hide password', exact: true })
    .click();
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
  expect(submitted).toEqual({ email: admin.email, password: 'x' });
});
