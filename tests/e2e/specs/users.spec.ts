import { test, expect } from '../fixtures/test';
import { session } from '../support/session';
import { admin, learner } from '../fixtures/users';

test('user search, status and ordering are sent to the backend', async ({
  controls,
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
  await controls.choose('Filter by status', 'Suspended');
  await statusRequest;
  await expect(page.getByText('No users match your filters.')).toBeVisible();
  const orderRequest = page.waitForRequest(
    (request) =>
      new URL(request.url()).searchParams.get('ordering') === '-created_at',
  );
  await controls.choose('Sort users', 'Newest first');
  await orderRequest;
});

test('user edit, status, privilege changes and delete persist in the table', async ({
  controls,
  page,
}) => {
  await session(page);
  let current = { ...learner };
  let deleted = false;
  let listRequests = 0;
  await page.route('**/api/v1/users/', (route) => {
    listRequests++;
    return route.fulfill({ json: deleted ? [] : [current] });
  });
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
  await controls.choose('Status for Grace Hopper', 'Suspended');
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
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete user', exact: true })
    .click();
  await expect(page.getByText('User deleted successfully.')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'No Users Found' }),
  ).toBeVisible();
  await expect(
    page.getByRole('cell').filter({ hasText: 'Grace Hopper' }),
  ).toHaveCount(0);
  expect(listRequests).toBe(1);
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

test('status and deletion failures preserve the user', async ({
  controls,
  page,
}) => {
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
  await controls.choose('Status for Grace Hopper', 'Suspended');
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

test('all account statuses display and filter consistently', async ({
  controls,
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
  await controls.choose('Filter by status', 'Suspended');
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

for (const responseBody of [{ message: 'Updated successfully' }, { id: '2' }]) {
  test(`partial mutation responses update user role and status without list reload: ${JSON.stringify(responseBody)}`, async ({
    page,
  }) => {
    await session(page);
    let current = { ...learner, role: ['instructor'], is_staff: false };
    let listRequests = 0;
    await page.route('**/api/v1/users/', (route) => {
      listRequests++;
      return route.fulfill({ json: [current] });
    });
    await page.route('**/api/v1/users/2/', (route) =>
      route.fulfill({ json: current }),
    );
    await page.route('**/api/v1/users/2/modify_admin_privileges/', (route) => {
      const admin = route.request().postDataJSON().is_admin;
      current = {
        ...current,
        is_staff: admin,
        role: admin ? ['admin'] : ['instructor'],
      };
      return route.fulfill({ json: responseBody });
    });
    await page.route('**/api/v1/users/2/modify_user_status/', (route) => {
      current = { ...current, status: route.request().postDataJSON().status };
      return route.fulfill({ json: responseBody });
    });
    await page.goto('/users');
    const row = page.getByRole('row').filter({ hasText: learner.email });
    await row.getByRole('button', { name: 'Make admin' }).click();
    await expect(
      row.getByRole('button', { name: 'Remove admin' }),
    ).toBeVisible();
    await expect(row.getByText('Administrator', { exact: true })).toBeVisible();
    await row.getByRole('button', { name: 'Remove admin' }).click();
    await expect(row.getByRole('button', { name: 'Make admin' })).toBeVisible();
    await expect(row.getByText('Instructor', { exact: true })).toBeVisible();
    await row
      .getByRole('button', { name: 'Status for Grace Hopper', exact: true })
      .click();
    await page.getByRole('option', { name: 'Pending', exact: true }).click();
    await expect(
      row.getByLabel('Status for Grace Hopper', { exact: true }),
    ).toHaveText('Pending');
    await expect(
      row.getByRole('button', { name: 'Resend invitation' }),
    ).toBeVisible();
    expect(listRequests).toBe(1);
  });
}
