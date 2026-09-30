import { test, expect, type Page } from '@playwright/test';
const admin = {
  id: '1',
  email: 'ada@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  full_name: 'Ada Lovelace',
  username: 'ada',
  phone_number: '',
  bio: '',
  role: ['admin'],
  language: 'en',
  avatar: null,
  status: 'AC',
  email_notifications: true,
  public_profile: false,
  search_engine_visibility: false,
  share_learning_activity: false,
};
const learner = {
  ...admin,
  id: '2',
  email: 'grace@example.com',
  first_name: 'Grace',
  full_name: 'Grace Hopper',
  username: 'grace',
  role: ['learner'],
};
async function session(page: Page, user = admin) {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learninfy.auth',
      JSON.stringify({ access: 'access', refresh: 'refresh' }),
    ),
  );
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ json: user }),
  );
}
test('anonymous routes redirect and sign-in validates fields', async ({
  page,
}) => {
  await page.goto('/users');
  await expect(page).toHaveURL(/auth\/sign-in/);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Password is required.')).toBeVisible();
});
test('sign-in success, home navigation, and failed server logout', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/staff/sign-in/', (route) =>
    route.fulfill({ json: { access: 'access', refresh: 'refresh' } }),
  );
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ json: admin }),
  );
  await page.route('**/api/v1/auth/sign-out/', (route) =>
    route.fulfill({ status: 500, json: {} }),
  );
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(admin.email);
  await page.getByLabel('Password', { exact: true }).fill('password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Welcome to your dashboard' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Profile', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  if (
    await page
      .getByRole('button', { name: 'Open menu', exact: true })
      .isVisible()
  )
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/auth\/sign-in/);
  expect(
    await page.evaluate(() => localStorage.getItem('learninfy.auth')),
  ).toBeNull();
});
test('invalid credentials and failed profile fetch leave no session', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/staff/sign-in/', (route) =>
    route.fulfill({ status: 401, json: { detail: 'Invalid credentials' } }),
  );
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(admin.email);
  await page.getByLabel('Password', { exact: true }).fill('password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
  await page.route('**/api/v1/auth/staff/sign-in/', (route) =>
    route.fulfill({ json: { access: 'a', refresh: 'r' } }),
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
test('activation sends a request without a password, including with a stored session', async ({
  page,
}) => {
  await session(page);
  let body: unknown;
  await page.route('**/api/v1/auth/activate-account/uid/token/', (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({ json: { message: 'Account activated' } });
  });
  await page.goto('/auth/activate-account/uid/token');
  await page.getByRole('button', { name: 'Activate account' }).click();
  await expect(page.getByRole('alert')).toHaveText('Account activated');
  expect(body).toEqual({});
});
test('reset password handles success and expired links', async ({ page }) => {
  await page.route('**/api/v1/auth/reset-password/token/uid/', (route) =>
    route.fulfill({ json: { message: 'Password reset' } }),
  );
  await page.goto('/auth/reset-password/uid/token');
  await page.getByLabel('New password', { exact: true }).fill('newpassword');
  await page
    .getByRole('button', { name: 'Reset password', exact: true })
    .click();
  await expect(page.getByRole('alert')).toHaveText('Password reset');
  await page.route('**/api/v1/auth/reset-password/token/uid/', (route) =>
    route.fulfill({
      status: 400,
      json: { detail: 'This link is invalid or expired.' },
    }),
  );
  await page
    .getByRole('button', { name: 'Reset password', exact: true })
    .click();
  await expect(page.getByRole('alert')).toHaveText(
    'This link is invalid or expired.',
  );
});
test('forgot password handles success and field errors', async ({ page }) => {
  await page.route('**/api/v1/auth/send-reset-password-email/', (route) =>
    route.fulfill({ json: { message: 'Check your email' } }),
  );
  await page.goto('/auth/forgot-password');
  await page.getByLabel('Email').fill(admin.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
  await page.route('**/api/v1/auth/send-reset-password-email/', (route) =>
    route.fulfill({ status: 400, json: { email: ['Email is invalid'] } }),
  );
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Email is invalid')).toBeVisible();
});
test('non-admin direct access never requests the user list', async ({
  page,
}) => {
  await session(page, learner);
  let requested = false;
  await page.route('**/api/v1/users/', (route) => {
    requested = true;
    return route.fulfill({ json: [] });
  });
  await page.goto('/users');
  await expect(
    page.getByRole('heading', { name: 'Welcome to your dashboard' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Users', exact: true }),
  ).toHaveCount(0);
  expect(requested).toBe(false);
});
test('expired session redirects immediately after refresh failure', async ({
  page,
}) => {
  await session(page);
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.route('**/api/v1/auth/refresh/', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto('/profile');
  await expect(page).toHaveURL(/auth\/sign-in/);
  expect(
    await page.evaluate(() => localStorage.getItem('learninfy.auth')),
  ).toBeNull();
});
test('user search, status and ordering are sent to the backend', async ({
  page,
}) => {
  await session(page);
  await page.route(/\/api\/v1\/users\/\?.*/, (route) => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({
      json: params.get('status') === 'suspended' ? [] : [learner],
    });
  });
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ json: [admin, learner] }),
  );
  await page.goto('/users');
  await expect(page.getByText('Showing 2 of 2 users')).toBeVisible();
  const searchRequest = page.waitForRequest(
    (request) => new URL(request.url()).searchParams.get('search') === 'Grace',
  );
  await page.getByLabel('Search users').fill('Grace');
  await searchRequest;
  await expect(page.getByText('Showing 1 of 1 users')).toBeVisible();
  const statusRequest = page.waitForRequest((request) => {
    const params = new URL(request.url()).searchParams;
    return (
      params.get('search') === 'Grace' && params.get('status') === 'suspended'
    );
  });
  await page
    .getByRole('button', { name: 'Filter by status', exact: true })
    .click();
  await page.getByRole('option', { name: 'Suspended', exact: true }).click();
  await statusRequest;
  await expect(page.getByText('No users match your filters.')).toBeVisible();
  const orderRequest = page.waitForRequest(
    (request) =>
      new URL(request.url()).searchParams.get('ordering') === '-created_at',
  );
  await page.getByRole('button', { name: 'Sort users', exact: true }).click();
  await page.getByRole('option', { name: 'Newest first', exact: true }).click();
  await orderRequest;
});
test('user edit, status, privilege changes and delete persist in the table', async ({
  page,
}) => {
  await session(page);
  let current = { ...learner };
  let deleted = false;
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ json: deleted ? [] : [current] }),
  );
  await page.route('**/api/v1/users/2/', (route) => {
    if (route.request().method() === 'DELETE') {
      deleted = true;
      return route.fulfill({ status: 204 });
    }
    current = { ...current, ...route.request().postDataJSON() };
    return route.fulfill({ json: current });
  });
  await page.route('**/api/v1/users/2/modify_user_status/', (route) => {
    expect(route.request().method()).toBe('PUT');
    current.status = route.request().postDataJSON().status;
    return route.fulfill({ json: current });
  });
  await page.route('**/api/v1/users/2/modify_admin_privileges/', (route) => {
    expect(route.request().method()).toBe('PUT');
    current.role = route.request().postDataJSON().is_admin
      ? ['admin']
      : ['learner'];
    return route.fulfill({ json: current });
  });
  await page.goto('/users');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('dialog').getByLabel('First name').fill('Updated');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByText('User details updated successfully.'),
  ).toBeVisible();
  expect(current.first_name).toBe('Updated');
  await page
    .getByRole('button', { name: 'Status for Grace Hopper', exact: true })
    .click();
  await page.getByRole('option', { name: 'Suspended', exact: true }).click();
  await expect(page.getByLabel('Status for Grace Hopper')).toHaveText(
    'Suspended',
  );
  await page.getByRole('button', { name: 'Make admin' }).click();
  await expect(
    page.getByRole('button', { name: 'Remove admin' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(
    page.getByRole('cell').filter({ hasText: 'Grace Hopper' }),
  ).toBeVisible();
  const refetched = page.waitForResponse(
    (response) =>
      deleted &&
      new URL(response.url()).pathname === '/api/v1/users/' &&
      response.request().method() === 'GET',
  );
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete user', exact: true })
    .click();
  await refetched;
  await expect(page.getByText('User deleted successfully.')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No Users Found' }),
  ).toBeVisible();
  await expect(
    page.getByRole('cell').filter({ hasText: 'Grace Hopper' }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'No Users Found' }),
  ).toBeVisible();
});
test('user list and mutation failures are visible', async ({ page }) => {
  await session(page);
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ status: 500, json: { detail: 'List unavailable' } }),
  );
  await page.goto('/users');
  await expect(page.getByRole('alert')).toHaveText('List unavailable');
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ json: [learner] }),
  );
  await page.reload();
  await page.route('**/api/v1/users/2/modify_admin_privileges/', (route) =>
    route.fulfill({ status: 403, json: { detail: 'Permission denied' } }),
  );
  await page.getByRole('button', { name: 'Make admin' }).click();
  await expect(page.getByRole('alert')).toHaveText('Permission denied');
});
test('profile and preferences save; password confirmation prevents invalid submission', async ({
  page,
}) => {
  await session(page);
  let saved: Record<string, unknown> = {};
  await page.route('**/api/v1/users/me/', (route) => {
    if (route.request().method() === 'PUT')
      saved = route.request().postDataJSON();
    return route.fulfill({
      json: { ...admin, first_name: undefined, last_name: undefined, ...saved },
    });
  });
  await page.route('**/api/v1/auth/change-password/', (route) =>
    route.fulfill({ json: {} }),
  );
  await page.goto('/profile');
  await expect(page.getByLabel('Full name')).toHaveValue('Ada Lovelace');
  await page.getByLabel('Full name').fill('Augusta');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByText('Profile details saved successfully.'),
  ).toBeVisible();
  expect(saved.full_name).toBe('Augusta');
  await page
    .getByRole('button', { name: 'Notifications', exact: true })
    .click();
  await page.getByRole('checkbox', { name: /Email notifications/ }).uncheck();
  await page.getByRole('button', { name: 'Save notifications' }).click();
  await expect(
    page.getByText('Notification preferences saved successfully.'),
  ).toBeVisible();
  expect(saved.email_notifications).toBe(false);
  await page.getByRole('button', { name: 'Password & Security' }).click();
  await page.getByLabel('Current password', { exact: true }).fill('password');
  await page.getByLabel('New password', { exact: true }).fill('newpassword');
  await page
    .getByLabel('Confirm new password', { exact: true })
    .fill('different');
  await page
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await expect(page.getByText('Passwords do not match.')).toBeVisible();
  await page
    .getByLabel('Confirm new password', { exact: true })
    .fill('newpassword');
  await page
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await expect(page.getByText('Password changed successfully.')).toBeVisible();
});
test('avatar rejects invalid files and reports upload success and failure', async ({
  page,
}) => {
  await session(page);
  await page.goto('/profile');
  const upload = page.locator('input[type=file]');
  await upload.setInputFiles({
    name: 'bad.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('bad'),
  });
  await expect(page.getByText('Please choose an image file.')).toBeVisible();
  await upload.setInputFiles({
    name: 'big.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(
    page.getByText('Profile images must be smaller than 5 MB.'),
  ).toBeVisible();
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ status: 500, json: { detail: 'Upload failed' } }),
  );
  await upload.setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('image'),
  });
  await expect(page.getByText('Upload failed')).toBeVisible();
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ json: admin }),
  );
  await upload.setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('image'),
  });
  await expect(
    page.getByText('Profile photo updated successfully.'),
  ).toBeVisible();
});

test('edit dialog traps keyboard focus, closes with Escape, and shows save errors', async ({
  page,
}) => {
  await session(page);
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ json: [learner] }),
  );
  await page.route('**/api/v1/users/2/', (route) =>
    route.fulfill({ status: 400, json: { detail: 'Cannot save user' } }),
  );
  await page.goto('/users');
  const edit = page.getByRole('button', { name: 'Edit', exact: true });
  await edit.click();
  const close = page.getByRole('button', { name: 'Close edit user dialog' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('button', { name: 'Save changes' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
    'Cannot save user',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(edit).toBeFocused();
});
test('profile update and password failures are visible', async ({ page }) => {
  await session(page);
  await page.goto('/profile');
  await expect(page.getByLabel('Full name')).toBeVisible();
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ status: 500, json: { detail: 'Save unavailable' } }),
  );
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Save unavailable')).toBeVisible();
  await page
    .getByRole('button', { name: 'Notifications', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save notifications' }).click();
  await expect(page.getByText('Save unavailable')).toBeVisible();
  await page.getByRole('button', { name: 'Password & Security' }).click();
  await page
    .getByLabel('Current password', { exact: true })
    .fill('wrongpassword');
  await page.getByLabel('New password', { exact: true }).fill('newpassword');
  await page
    .getByLabel('Confirm new password', { exact: true })
    .fill('newpassword');
  await page.route('**/api/v1/auth/change-password/', (route) =>
    route.fulfill({
      status: 400,
      json: { detail: 'Current password is incorrect' },
    }),
  );
  await page
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await expect(page.getByText('Current password is incorrect')).toBeVisible();
});
test('status and deletion failures preserve the user', async ({ page }) => {
  await session(page);
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ json: [learner] }),
  );
  await page.route('**/api/v1/users/2/modify_user_status/', (route) =>
    route.fulfill({ status: 403, json: { detail: 'Status denied' } }),
  );
  await page.route('**/api/v1/users/2/', (route) =>
    route.fulfill({ status: 403, json: { detail: 'Deletion denied' } }),
  );
  await page.goto('/users');
  await page
    .getByRole('button', { name: 'Status for Grace Hopper', exact: true })
    .click();
  await page.getByRole('option', { name: 'Suspended', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Status denied');
  await expect(page.getByLabel('Status for Grace Hopper')).toHaveText('Active');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete user', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
    'Deletion denied',
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(
    page.getByRole('cell').filter({ hasText: 'Grace Hopper' }),
  ).toBeVisible();
});
test('cross-tab logout removes the protected view', async ({ page }) => {
  await session(page);
  await page.goto('/profile');
  await expect(page.getByLabel('Full name')).toBeVisible();
  await page.evaluate(() => {
    localStorage.removeItem('learninfy.auth');
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'learninfy.auth' }),
    );
  });
  await expect(page).toHaveURL(/auth\/sign-in/);
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

test('reset and profile password controls toggle independently', async ({
  page,
}) => {
  await page.goto('/auth/reset-password/uid/token');
  await page.getByLabel('New password', { exact: true }).fill('newpassword');
  await page
    .getByRole('button', { name: 'Show new password', exact: true })
    .click();
  await expect(
    page.getByLabel('New password', { exact: true }),
  ).toHaveAttribute('type', 'text');
  await session(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Password & Security' }).click();
  for (const label of [
    'Current password',
    'New password',
    'Confirm new password',
  ]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute(
      'type',
      'password',
    );
    await page
      .getByRole('button', { name: `Show ${label.toLowerCase()}`, exact: true })
      .click();
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute(
      'type',
      'text',
    );
    await page
      .getByRole('button', { name: `Hide ${label.toLowerCase()}`, exact: true })
      .click();
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute(
      'type',
      'password',
    );
  }
});

test('role filters and reset work with the new users layout', async ({
  page,
}) => {
  await session(page);
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ json: [admin, learner] }),
  );
  await page.goto('/users');
  await expect(page.getByText('Showing 2 of 2 users')).toBeVisible();
  await page.getByRole('button', { name: 'Admins', exact: true }).click();
  await expect(page.getByText('Showing 1 of 2 users')).toBeVisible();
  await expect(
    page.getByRole('cell').filter({ hasText: 'Ada Lovelace' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Instructors', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No Users Found' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reset All Filters' }).click();
  await expect(page.getByText('Showing 2 of 2 users')).toBeVisible();
});

test('static welcome and responsive navigation', async ({ page }, testInfo) => {
  await session(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome to your dashboard' }),
  ).toBeVisible();
  await expect(
    page.getByText('Reports and insights will be available here soon.', {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('welcome.png'),
    fullPage: true,
  });
  const menu = page.getByRole('button', { name: 'Open menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByText('Courses', { exact: true }).click();
  await expect(page.getByText('All Courses', { exact: true })).toBeVisible();
  await page.route('**/api/v1/users/', (route) => route.fulfill({ json: [] }));
  await page.getByRole('link', { name: 'Users', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No Users Found' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('users.png'),
    fullPage: true,
  });
});

test('account dropdown supports keyboard navigation and SPA profile routing', async ({
  page,
}) => {
  await session(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome to your dashboard' }),
  ).toBeVisible();
  await expect(page.getByText('Manage profile', { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText('Manage users', { exact: true })).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Account menu' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Log out' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await page.locator('main').click({ position: { x: 2, y: 2 } });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.evaluate(() => {
    (window as unknown as { spaMarker: string }).spaMarker = 'same-document';
  });
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('Full name')).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { spaMarker: string }).spaMarker,
    ),
  ).toBe('same-document');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(page.getByLabel('Full name')).toBeVisible();
});

test('sign-in returns to the requested protected page', async ({ page }) => {
  await page.route('**/api/v1/auth/staff/sign-in/', (route) =>
    route.fulfill({ json: { access: 'a', refresh: 'r' } }),
  );
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ json: admin }),
  );
  await page.goto('/profile');
  await expect(page).toHaveURL(/auth\/sign-in/);
  await page.getByLabel('Email').fill(admin.email);
  await page.getByLabel('Password', { exact: true }).fill('password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('Full name')).toBeVisible();
});

test('expired access refreshes and restores a deep link', async ({ page }) => {
  await session(page);
  let refreshes = 0;
  await page.route('**/api/v1/users/me/', (route) =>
    route.request().headers().authorization === 'Bearer fresh'
      ? route.fulfill({ json: admin })
      : route.fulfill({ status: 401, json: {} }),
  );
  await page.route('**/api/v1/auth/refresh/', (route) => {
    refreshes++;
    return route.fulfill({ json: { access: 'fresh', refresh: 'rotated' } });
  });
  await page.goto('/profile');
  await expect(page.getByLabel('Full name')).toBeVisible();
  expect(refreshes).toBe(1);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('learninfy.auth')!),
    ),
  ).toEqual({ access: 'fresh', refresh: 'rotated' });
});

test('temporary refresh outage preserves the session and supports retry', async ({
  page,
}) => {
  await session(page);
  await page.route('**/api/v1/users/me/', (route) =>
    route.request().headers().authorization === 'Bearer fresh'
      ? route.fulfill({ json: admin })
      : route.fulfill({ status: 401, json: {} }),
  );
  await page.route('**/api/v1/auth/refresh/', (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('learninfy.auth')),
  ).not.toBeNull();
  await page.route('**/api/v1/auth/refresh/', (route) =>
    route.fulfill({ json: { access: 'fresh' } }),
  );
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByLabel('Full name')).toBeVisible();
});

test('all account statuses display and filter consistently', async ({
  page,
}, testInfo) => {
  await session(page);
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({
      json: ['ACTIVE', 'PD', 'SUSPENDED', 'NA'].map((status, index) => ({
        ...learner,
        id: String(index + 2),
        full_name: `Member ${index + 1}`,
        status,
      })),
    }),
  );
  await page.goto('/users');
  for (const [index, status] of [
    'Active',
    'Pending',
    'Suspended',
    'Inactive',
  ].entries())
    await expect(
      page.getByLabel(`Status for Member ${index + 1}`, { exact: true }),
    ).toHaveText(status);
  await expect(page.getByLabel('Account status summary')).toContainText(
    'Active1',
  );
  await page.screenshot({
    path: testInfo.outputPath('account-statuses.png'),
    fullPage: true,
  });
  await page.route('**/api/v1/users/?status=suspended', (route) =>
    route.fulfill({
      json: [
        { ...learner, id: '4', full_name: 'Member 3', status: 'SUSPENDED' },
      ],
    }),
  );
  await page
    .getByRole('button', { name: 'Filter by status', exact: true })
    .click();
  await page.getByRole('option', { name: 'Suspended', exact: true }).click();
  await expect(page.getByText('Showing 1 of 1 users')).toBeVisible();
  await expect(
    page.getByLabel('Status for Member 3', { exact: true }),
  ).toBeVisible();
});

test('users load failure can be retried without reloading the page', async ({
  page,
}) => {
  await session(page);
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ status: 503, json: { detail: 'Temporarily unavailable' } }),
  );
  await page.goto('/users');
  await expect(
    page.getByRole('heading', { name: 'Unable to load users' }),
  ).toBeVisible();
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ json: [learner] }),
  );
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('Showing 1 of 1 users')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

for (const path of ['/users', '/profile']) {
  test(`cross-tab account replacement revalidates ${path}`, async ({
    page,
    context,
  }) => {
    await session(page);
    let replacementRequests = 0;
    await page.route('**/api/v1/users/me/', (route) => {
      const replacement =
        route.request().headers().authorization === 'Bearer learner-access';
      if (replacement) replacementRequests++;
      return route.fulfill({ json: replacement ? learner : admin });
    });
    await page.route('**/api/v1/users/', (route) =>
      route.fulfill({ json: [admin, learner] }),
    );
    await page.goto(path);
    if (path === '/users') {
      await expect(
        page.getByRole('heading', { name: 'Users Management' }),
      ).toBeVisible();
    } else {
      await expect(page.getByLabel('Full name')).toHaveValue('Ada Lovelace');
    }
    const otherTab = await context.newPage();
    await otherTab.goto('/auth/reset-password/uid/token');
    await otherTab.evaluate(() =>
      localStorage.setItem(
        'learninfy.auth',
        JSON.stringify({
          access: 'learner-access',
          refresh: 'learner-refresh',
        }),
      ),
    );
    if (path === '/users') {
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole('heading', { name: 'Users Management' }),
      ).toHaveCount(0);
    } else {
      await expect(page.getByLabel('Full name')).toHaveValue('Grace Hopper');
    }
    await expect(
      page.getByRole('link', { name: 'Users', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Account menu' }),
    ).toContainText('grace');
    expect(replacementRequests).toBeGreaterThan(0);
    await otherTab.close();
  });
}

test('delete confirmation supports keyboard cancellation and locks while pending', async ({
  page,
}, testInfo) => {
  await session(page);
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ json: [learner] }),
  );
  let requests = 0;
  let release!: () => void;
  await page.route('**/api/v1/users/2/', async (route) => {
    requests++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      status: 503,
      json: { detail: 'Please try again shortly.' },
    });
  });
  await page.goto('/users');
  const trigger = page.getByRole('button', { name: 'Delete', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Delete this user?' });
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
  await expect(cancel).toBeFocused();
  await expect(dialog).toContainText('Grace Hopper');
  await expect(dialog).toContainText('grace@example.com');
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('button', { name: 'Delete user', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('button', { name: 'Close confirmation' }),
  ).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath('delete-confirmation.png'),
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(requests).toBe(0);
  await trigger.click();
  await dialog
    .getByRole('button', { name: 'Delete user', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Deleting…' }),
  ).toBeDisabled();
  await expect(cancel).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(dialog.getByRole('alert')).toHaveText(
    'Please try again shortly.',
  );
  await expect(
    dialog.getByRole('button', { name: 'Delete user', exact: true }),
  ).toBeEnabled();
  await cancel.click();
  await expect(trigger).toBeFocused();
});
