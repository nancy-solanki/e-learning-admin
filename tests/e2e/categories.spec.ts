import { test, expect } from '@playwright/test';

test('category create, drag upload, edit without replacing thumbnail, and delete', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learninfy.auth',
      JSON.stringify({ access: 'access', refresh: 'refresh' }),
    ),
  );
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ json: { id: '1', username: 'admin', role: ['admin'] } }),
  );
  const category = {
    id: '1',
    title: 'python',
    slug: 'python',
    description: 'Learn Python',
    thumbnail: null,
    created_at: null,
    updated_at: null,
  };
  let exists = false;
  let failSave = true;
  await page.route('**/api/v1/category/**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST' || request.method() === 'PATCH') {
      expect(request.headers()['content-type']).toContain(
        'multipart/form-data; boundary=',
      );
      expect(request.headers().authorization).toBe('Bearer access');
      const body = request.postDataBuffer()!.toString();
      if (request.method() === 'POST') {
        expect(body).toContain('filename="python.png"');
        if (failSave) {
          failSave = false;
          await route.fulfill({
            status: 400,
            json: { title: ['This title already exists.'] },
          });
          return;
        }
        exists = true;
      } else {
        expect(body).not.toContain('name="thumbnail"');
        category.description = 'Updated description';
      }
      await route.fulfill({ json: category });
    } else if (request.method() === 'DELETE') {
      exists = false;
      await route.fulfill({ status: 204 });
    } else if (new URL(request.url()).pathname.endsWith('/python/'))
      await route.fulfill({ json: category });
    else
      await route.fulfill({
        json: {
          count: exists ? 1 : 0,
          next: null,
          previous: null,
          results: exists ? [category] : [],
        },
      });
  });
  await page.goto('/categories');
  await page
    .getByRole('button', { name: 'Create your first category' })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Category title').fill('Python');
  await dialog.getByLabel('Description').fill('Learn Python');
  await dialog
    .getByRole('button', { name: 'Create category', exact: true })
    .click();
  await expect(dialog.getByText('Add a thumbnail image.')).toBeVisible();
  await dialog.getByLabel('Upload thumbnail').setInputFiles({
    name: 'bad.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('bad'),
  });
  await expect(dialog.getByText('Please choose an image file.')).toBeVisible();
  await dialog.locator('.category-dropzone').evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array([137, 80, 78, 71])], 'python.png', {
        type: 'image/png',
      }),
    );
    element.dispatchEvent(
      new DragEvent('drop', { bubbles: true, dataTransfer: transfer }),
    );
  });
  await expect(dialog.getByText('python.png', { exact: true })).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Create category', exact: true })
    .click();
  await expect(dialog.getByText('This title already exists.')).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Create category', exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'python', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit python', exact: true }).click();
  await dialog.getByLabel('Description').fill('Updated description');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByText('Updated description', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Delete python', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Delete category', exact: true })
    .click();
  await expect(page.getByText('Make room for something great')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('category sort supports keyboard navigation and updates server ordering', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learninfy.auth',
      JSON.stringify({ access: 'access', refresh: 'refresh' }),
    ),
  );
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ json: { id: '1', username: 'admin', role: ['admin'] } }),
  );
  await page.route('**/api/v1/category/**', (route) =>
    route.fulfill({
      json: {
        count: 3,
        next: null,
        previous: null,
        results: [
          'Design & creativity',
          'Development',
          'Business & growth',
        ].map((title, i) => ({
          id: String(i),
          title,
          slug: title.toLowerCase().split(' ')[0],
          description:
            'Explore fresh perspectives and build the skills to bring your ideas to life.',
          thumbnail: null,
          created_at: '2026-09-29T12:00:00Z',
        })),
      },
    }),
  );
  await page.goto('/categories');
  await expect(
    page.getByRole('heading', { name: 'Design & creativity' }),
  ).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Sort categories' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('End');
  const sorted = page.waitForRequest(
    (request) =>
      new URL(request.url()).searchParams.get('ordering') === '-title',
  );
  await page.keyboard.press('Enter');
  await sorted;
  await expect(trigger).toHaveText('Title: Z–A');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Design & creativity' }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('categories.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Create category', exact: true })
    .click();
  await page.screenshot({ path: testInfo.outputPath('category-editor.png') });
});

test('profile displays backend URL avatars and updates the shared avatar after upload', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learninfy.auth',
      JSON.stringify({ access: 'access', refresh: 'refresh' }),
    ),
  );
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
  await page
    .getByLabel('Change photo')
    .setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from([137, 80, 78, 71]),
    });
  await expect(photo).toHaveAttribute('src', /updated-avatar.svg$/);
  await expect(
    page.getByRole('button', { name: 'Account menu' }).locator('img'),
  ).toHaveAttribute('src', /updated-avatar.svg$/);
});
