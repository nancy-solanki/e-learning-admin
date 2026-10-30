import { test, expect } from '../fixtures/test';
import { session, sessionAs } from '../support/session';

test('sidebar localization link opens the localization page', async ({
  controls,
  page,
}) => {
  await session(page);
  await page.route('**/api/v1/localization/**', (route) =>
    route.fulfill({
      json: { count: 0, next: null, previous: null, results: [] },
    }),
  );

  await page.goto('/');
  await controls.openNavigation();
  await page.getByText('Site', { exact: true }).click();
  await page.getByRole('link', { name: 'Localizations', exact: true }).click();

  await expect(page).toHaveURL(/\/localizations$/);
  await expect(
    page.getByRole('heading', { name: 'Localizations', exact: true }),
  ).toBeVisible();
});

for (const role of ['learner', 'instructor']) {
  test(`${role} cannot access localizations or request management data`, async ({
    controls,
    page,
  }) => {
    await sessionAs(page, role);
    const requests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/v1/localization/')) {
        requests.push(request.url());
      }
    });

    await page.goto('/localizations');
    await expect(page).toHaveURL('/');
    await controls.openNavigation();
    await expect(
      page.getByRole('link', { name: 'Localizations', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Localizations', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Create localization' }),
    ).toHaveCount(0);
    expect(requests).toEqual([]);
  });
}

test('returns to the previous page when a toggle empties the current page', async ({
  controls,
  page,
}) => {
  await session(page);
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
  await controls.choose('Filter by record status', 'Active');
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
