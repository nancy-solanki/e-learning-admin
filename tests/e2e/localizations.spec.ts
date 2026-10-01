import { expect, test } from '@playwright/test';

test('sidebar localization link opens the localization page', async ({
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
  await page.route('**/api/v1/localization/**', (route) =>
    route.fulfill({
      json: { count: 0, next: null, previous: null, results: [] },
    }),
  );

  await page.goto('/');
  if ((page.viewportSize()?.width ?? 1024) < 1024)
    await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByText('Site', { exact: true }).click();
  await page.getByRole('link', { name: 'Localizations', exact: true }).click();

  await expect(page).toHaveURL(/\/localizations$/);
  await expect(
    page.getByRole('heading', { name: 'Localizations', exact: true }),
  ).toBeVisible();
});

test('admin can filter, create, update, and delete localizations', async ({
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
  let record: {
    id: string;
    language_name: string;
    country: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  } | null = null;
  await page.route('**/api/v1/localization/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (method === 'POST') {
      expect(request.headers()['content-type']).toContain('application/json');
      expect(JSON.parse(request.postData()!)).toEqual({
        language_name: 'English',
        country: 'India',
      });
      record = {
        id: '7b20815e-591d-4c08-914e-735321f44823',
        language_name: 'English',
        country: 'India',
        created_at: '2026-10-01T12:00:00Z',
        updated_at: '2026-10-01T12:00:00Z',
        deleted_at: null,
      };
      await route.fulfill({ status: 201, json: record });
    } else if (method === 'PUT') {
      expect(url.pathname).toContain(record?.id);
      expect(JSON.parse(request.postData()!)).toEqual({
        language_name: 'English',
        country: 'United Kingdom',
      });
      record!.country = 'United Kingdom';
      await route.fulfill({ json: record });
    } else if (method === 'DELETE') {
      expect(url.search).toBe('');
      expect(request.postData()).toBeNull();
      if (record?.deleted_at) {
        record.deleted_at = null;
        await route.fulfill({
          status: 200,
          json: { message: 'Activated successfully' },
        });
      } else {
        record!.deleted_at = '2026-10-01T13:00:00Z';
        await route.fulfill({ status: 204 });
      }
    } else if (method === 'GET' && url.pathname.endsWith(`/${record?.id}/`)) {
      await route.fulfill({ json: record });
    } else {
      const isDeleted = url.searchParams.get('is_deleted');
      const exactCountry = url.searchParams.get('country');
      const search = url.searchParams.get('search')?.toLowerCase();
      const visible =
        record &&
        (isDeleted === null ||
          (isDeleted === 'true') === Boolean(record.deleted_at)) &&
        (!exactCountry ||
          exactCountry.toLowerCase() === record.country.toLowerCase()) &&
        (!search ||
          `${record.language_name} ${record.country}`
            .toLowerCase()
            .includes(search));
      await route.fulfill({
        json: {
          count: visible ? 1 : 0,
          next: null,
          previous: null,
          results: visible ? [record] : [],
        },
      });
    }
  });

  await page.goto('/localizations');
  await expect(
    page.getByRole('heading', { name: 'Localizations', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Filter by record status' }),
  ).toHaveText('All records');
  await page.getByRole('button', { name: '+ Create localization' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Language name').fill('  English  ');
  await editor.getByLabel('Country').fill('  India  ');
  await editor.getByRole('button', { name: 'Create localization' }).click();
  await expect(editor).not.toBeVisible();
  await expect(page.getByText('English', { exact: true })).toBeVisible();

  await page.getByLabel('Filter by country').fill('India');
  await expect(page.getByText('English', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit English — India' }).click();
  await expect(editor.getByLabel('Country')).toHaveValue('India');
  await editor.getByLabel('Country').fill('United Kingdom');
  await editor.getByRole('button', { name: 'Save changes' }).click();
  await page.getByLabel('Filter by country').fill('');
  await expect(page.getByText('United Kingdom', { exact: true })).toBeVisible();

  await page
    .getByRole('button', { name: 'Delete English — United Kingdom' })
    .click();
  await page
    .getByRole('button', { name: 'Delete localization', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Delete English — United Kingdom' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Restore English — United Kingdom' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Filter by record status' }).click();
  await page.getByRole('option', { name: 'Deleted', exact: true }).click();
  await expect(
    page.getByRole('table').getByText('Deleted', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Delete English — United Kingdom' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Restore English — United Kingdom' }),
  ).toHaveCount(0);
});

test('non-admin users only read active localizations', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learninfy.auth',
      JSON.stringify({ access: 'access', refresh: 'refresh' }),
    ),
  );
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({
      json: { id: '2', username: 'learner', role: ['learner'] },
    }),
  );
  await page.route('**/api/v1/localization/**', (route) =>
    route.fulfill({
      json: { count: 0, next: null, previous: null, results: [] },
    }),
  );
  await page.goto('/localizations');
  const list = await page.waitForRequest('**/api/v1/localization/**');
  expect(new URL(list.url()).searchParams.get('is_deleted')).toBe('false');
  if ((page.viewportSize()?.width ?? 1024) < 1024)
    await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(
    page.getByRole('link', { name: 'Localizations', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Record status')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Create localization' }),
  ).toHaveCount(0);
});

test('returns to the previous page when a toggle empties the current page', async ({
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
  let removed = false;
  const lastRecord = {
    id: 'id-20',
    language_name: 'Language 20',
    country: 'Country 20',
    created_at: '2026-10-01T12:00:00Z',
    updated_at: '2026-10-01T12:00:00Z',
    deleted_at: null,
  };
  await page.route('**/api/v1/localization/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'DELETE') {
      removed = true;
      await route.fulfill({ status: 204 });
      return;
    }
    const currentPage = Number(url.searchParams.get('page') ?? '1');
    if (currentPage === 2 && removed) {
      await route.fulfill({ status: 404, json: { detail: 'Invalid page.' } });
      return;
    }
    const results =
      currentPage === 2
        ? [lastRecord]
        : Array.from({ length: 20 }, (_, index) => ({
            ...lastRecord,
            id: `id-${index}`,
            language_name: `Language ${index}`,
            country: `Country ${index}`,
          }));
    await route.fulfill({
      json: {
        count: removed ? 20 : 21,
        next:
          currentPage === 1
            ? 'http://localhost/api/v1/localization/?page=2'
            : null,
        previous:
          currentPage === 2
            ? 'http://localhost/api/v1/localization/?page=1'
            : null,
        results,
      },
    });
  });

  await page.goto('/localizations');
  const activePage = page.waitForRequest(
    (request) =>
      new URL(request.url()).searchParams.get('is_deleted') === 'false' &&
      new URL(request.url()).searchParams.get('page') === '1',
  );
  await page.getByRole('button', { name: 'Filter by record status' }).click();
  await page.getByRole('option', { name: 'Active', exact: true }).click();
  await activePage;
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Page 2', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Delete Language 20 — Country 20' })
    .click();
  await page
    .getByRole('button', { name: 'Delete localization', exact: true })
    .click();
  await expect(page.getByText('Page 1', { exact: true })).toBeVisible();
  await expect(page.getByText('20 total')).toBeVisible();
});
