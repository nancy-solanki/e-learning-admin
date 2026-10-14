import { test, expect } from '../fixtures/test';
import { session } from '../support/session';
import { learner } from '../fixtures/users';

for (const role of ['admin', 'instructor', 'student']) {
  test(`create user sends an invitation as ${role} and refreshes the directory`, async ({
    controls,
    page,
  }) => {
    await session(page);
    let invited = false;
    await page.route('**/api/v1/users/', (route) =>
      route.fulfill({
        json: invited ? [{ ...learner, status: 'PENDING' }] : [],
      }),
    );
    await page.route('**/api/v1/users/invite/', (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers().authorization).toBeUndefined();
      expect(route.request().headers()['x-csrftoken']).toBe('csrf');
      expect(route.request().postDataJSON()).toEqual({
        email: learner.email,
        username: 'grace',
        first_name: 'Grace',
        last_name: 'Hopper',
        role,
      });
      invited = true;
      return route.fulfill({
        status: 201,
        json: {
          id: '2',
          email: learner.email,
          status: 'PENDING',
          message: 'Invitation sent successfully',
        },
      });
    });
    await page.goto('/users');
    await page
      .getByRole('button', { name: 'Create user', exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Create user',
      exact: true,
    });
    await controls.fillInvitation(learner.email);
    await dialog.getByRole('button', { name: 'Role', exact: true }).click();
    await page
      .getByRole('option', { name: new RegExp(`^${role}$`, 'i') })
      .click();
    await dialog.getByRole('button', { name: 'Send invitation' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveText(
      'Invitation sent successfully',
    );
    await expect(page.getByText('Showing 1 of 1 users')).toBeVisible();
    await expect(
      page.getByLabel('Status for Grace Hopper', { exact: true }),
    ).toHaveText('Pending');
  });
}

test('invitation validation and delivery errors retain the form', async ({
  controls,
  page,
}) => {
  await session(page);
  await page.route('**/api/v1/users/', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/users/invite/', (route) =>
    route.fulfill({
      status: 400,
      json: { email: ['This email is already registered.'] },
    }),
  );
  await page.goto('/users');
  await page.getByRole('button', { name: 'Create user', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create user', exact: true });
  await controls.fillInvitation(learner.email);
  await dialog.getByRole('button', { name: 'Send invitation' }).click();
  await expect(
    dialog.getByText('This email is already registered.'),
  ).toBeVisible();
  await expect(dialog.getByLabel('Email', { exact: true })).toHaveValue(
    learner.email,
  );
  await page.route('**/api/v1/users/invite/', (route) =>
    route.fulfill({
      status: 503,
      json: { message: 'Invitation delivery failed.' },
    }),
  );
  await dialog.getByRole('button', { name: 'Send invitation' }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'Invitation delivery failed.',
  );
  await expect(
    dialog.getByRole('button', { name: 'Send invitation' }),
  ).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Create user', exact: true }),
  ).toBeFocused();
});

test('resend invitation is pending-only, prevents duplicate sends and handles failures', async ({
  page,
}) => {
  await session(page);
  let listRequests = 0;
  await page.route('**/api/v1/users/', (route) => {
    listRequests++;
    return route.fulfill({
      json: ['PENDING', 'PD', 'ACTIVE', 'SUSPENDED', 'INACTIVE'].map(
        (status, index) => ({
          ...learner,
          id: String(index + 2),
          full_name: `Member ${index}`,
          status,
        }),
      ),
    });
  });
  let requests = 0;
  let release!: () => void;
  await page.route('**/api/v1/users/2/resend-invite/', async (route) => {
    requests++;
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBeUndefined();
    expect(route.request().headers()['x-csrftoken']).toBe('csrf');
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({ json: { message: 'Invitation email sent again.' } });
  });
  await page.goto('/users');
  const buttons = page.getByRole('button', {
    name: 'Resend invitation',
    exact: true,
  });
  await expect(buttons).toHaveCount(2);
  await buttons.first().click();
  await expect(
    page.getByRole('button', { name: 'Sending…', exact: true }),
  ).toBeDisabled();
  await expect(buttons).toBeDisabled();
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(page.getByRole('alert')).toHaveText(
    'Invitation email sent again.',
  );
  expect(listRequests).toBe(1);
  await page.route('**/api/v1/users/2/resend-invite/', (route) =>
    route.fulfill({
      status: 503,
      json: { detail: 'Invitation delivery failed.' },
    }),
  );
  await buttons.first().click();
  await expect(page.getByRole('alert')).toHaveText(
    'Invitation delivery failed.',
  );
  await expect(buttons.first()).toBeEnabled();
});
