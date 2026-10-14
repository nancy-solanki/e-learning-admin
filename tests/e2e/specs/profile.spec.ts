import { test, expect } from '../fixtures/test';
import { session } from '../support/session';
import { admin } from '../fixtures/users';

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

test('profile displays backend URL avatars and updates the shared avatar after upload', async ({
  page,
}) => {
  const user = {
    id: '1',
    full_name: 'Ada Lovelace',
    username: 'ada',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    phone_number: '',
    language: 'en',
    bio: '',
    role: ['admin'],
    avatar: '/test-avatar.svg',
  };
  await page.route('**/*avatar*.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#b98eda"/></svg>',
    }),
  );
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({
      json:
        route.request().method() === 'PUT'
          ? { ...user, avatar: '/updated-avatar.svg' }
          : user,
    }),
  );
  await page.goto('/profile');
  const photo = page.locator('#profile-form .ui-avatar img');
  await expect(photo).toHaveAttribute('src', /test-avatar.svg$/);
  await expect
    .poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await page.getByLabel('Change photo').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71]),
  });
  await expect(photo).toHaveAttribute('src', /updated-avatar.svg$/);
  await expect(
    page.getByRole('button', { name: 'Account menu' }).locator('img'),
  ).toHaveAttribute('src', /updated-avatar.svg$/);
});
