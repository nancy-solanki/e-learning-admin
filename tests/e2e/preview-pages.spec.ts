import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function session(page: Page, role = 'admin') {
  await page.route('**/api/v1/users/me/', (route) =>
    route.fulfill({ json: { id: '1', username: 'ada', role: [role] } }),
  );
}
async function select(page: Page, label: string, option: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await session(page);
});

test('courses filter, sort, show details, and create a temporary draft', async ({
  page,
}) => {
  await page.goto('/courses');
  await expect(page.getByText('Showing 6 of 6 courses')).toBeVisible();
  await select(page, 'Category', 'Design');
  await expect(page.getByText('Showing 2 of 6 courses')).toBeVisible();
  await page.getByRole('button', { name: /^Draft/ }).click();
  await expect(page.getByText('Showing 1 of 6 courses')).toBeVisible();
  await page.getByLabel('Search courses').fill('no matching course');
  await expect(
    page.getByRole('heading', { name: 'No courses found' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await select(page, 'Sort courses', 'Title: A–Z');
  await expect(page.locator('article').first()).toContainText(
    'Brand identity: Make your mark',
  );
  await page.getByRole('button', { name: 'View course' }).first().click();
  await expect(page.getByRole('dialog')).toContainText(
    'Brand identity: Make your mark',
  );
  await page.getByRole('button', { name: 'Back to courses' }).click();
  await page.getByRole('button', { name: 'Add course' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Create draft' }).click();
  await expect(dialog.getByLabel('Course title')).toHaveValue('');
  expect(
    await dialog
      .getByLabel('Course title')
      .evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBe(true);
  await dialog.getByLabel('Course title').fill('E2E course');
  await dialog.getByLabel('Description').fill('A test learning journey');
  await dialog.getByLabel('Category').selectOption('Development');
  await dialog.getByLabel('Price (USD)').fill('42.50');
  await dialog.getByRole('button', { name: 'Create draft' }).click();
  await expect(dialog).toHaveCount(0);
  const card = page.locator('article').filter({ hasText: 'E2E course' });
  await expect(card).toContainText('Draft');
  await card.getByRole('button', { name: 'View course' }).click();
  await expect(dialog).toContainText('$42.5');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByText('Showing 6 of 6 courses')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'E2E course' })).toHaveCount(
    0,
  );
});

for (const kind of ['sections', 'lectures'] as const) {
  const noun = kind === 'sections' ? 'section' : 'lecture';
  test(`${kind} search, course filter, add, edit, cancel, and reset on reload`, async ({
    page,
  }) => {
    await page.goto(`/${kind}`);
    await expect(page.getByText(`Showing 6 of 6 ${kind}`)).toBeVisible();
    await page
      .getByLabel('Filter by course')
      .selectOption('The complete modern web developer');
    await expect(page.getByText(`Showing 2 of 6 ${kind}`)).toBeVisible();
    await page.getByLabel(`Search ${kind}`).fill('no matching entry');
    await expect(
      page.getByRole('heading', { name: `No ${kind} found` }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page
      .getByRole('button', { name: `＋ Add ${noun}`, exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: `Add ${noun}`, exact: true })
      .click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Title')).toHaveValue('');
    await dialog.getByLabel('Title').fill(`E2E ${noun}`);
    await dialog.getByLabel('Description').fill('Practice with examples');
    if (kind === 'lectures') {
      await dialog.getByLabel('Duration (minutes)').fill('25');
      await dialog.getByLabel('Status').selectOption('Approved');
    }
    await dialog
      .getByRole('button', { name: `Add ${noun}`, exact: true })
      .click();
    await expect(page.getByText(`Showing 7 of 7 ${kind}`)).toBeVisible();
    const card = page.locator('article').filter({ hasText: `E2E ${noun}` });
    await card.getByRole('button', { name: `Edit ${noun}` }).click();
    await expect(dialog.getByLabel('Description')).toHaveValue(
      'Practice with examples',
    );
    await dialog.getByLabel('Title').fill(`Updated ${noun}`);
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      page.getByRole('heading', { name: `Updated ${noun}` }),
    ).toBeVisible();
    await page
      .locator('article')
      .filter({ hasText: `Updated ${noun}` })
      .getByRole('button', { name: `Edit ${noun}` })
      .click();
    await dialog.getByLabel('Title').fill('Unsaved change');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `Updated ${noun}` }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText(`Showing 6 of 6 ${kind}`)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: `Updated ${noun}` }),
    ).toHaveCount(0);
    await page
      .getByRole('link', {
        name: `Explore ${kind === 'sections' ? 'lectures' : 'sections'}`,
      })
      .click();
    await expect(page).toHaveURL(
      kind === 'sections' ? /\/lectures$/ : /\/sections$/,
    );
  });
}

for (const status of [
  'Published',
  'Draft',
  'Pending',
  'Approved',
  'Rejected',
]) {
  test(`lecture ${status} deep link and status navigation`, async ({
    page,
  }) => {
    await page.goto(`/lectures?status=${status}`);
    await expect(page.locator('article')).toHaveCount(
      status === 'Published' ? 2 : 1,
    );
    await expect(
      page.getByRole('button', { name: new RegExp(`^${status} \\d`) }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('article')).toHaveCount(
      status === 'Published' ? 2 : 1,
    );
    await page.getByRole('button', { name: /^All lectures/ }).click();
    await expect(page).toHaveURL(/\/lectures$/);
    await expect(page.locator('article')).toHaveCount(6);
  });
}

for (const kind of ['wallets', 'enrollments'] as const) {
  const wallet = kind === 'wallets';
  const noun = wallet ? 'transactions' : 'enrollments';
  const id = wallet ? 'TXN-1007' : 'ENR-1002';
  test(`${kind} filters, details, empty state, and filtered CSV export`, async ({
    page,
  }) => {
    await page.goto(`/${kind}`);
    await select(
      page,
      wallet ? 'Transaction status' : 'Enrollment status',
      wallet ? 'Pending' : 'Completed',
    );
    await select(
      page,
      wallet ? 'Transaction type' : 'Filter by course',
      wallet ? 'Withdrawal' : 'UI/UX Design: From idea to experience',
    );
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText(id);
    await page
      .getByRole('button', {
        name: `View ${wallet ? 'transaction' : 'enrollment'} ${id}`,
      })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(id);
    if (wallet) await expect(dialog).toContainText('-$250.00');
    else
      await expect(dialog.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '100',
      );
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: `Export ${noun}` }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      wallet ? 'sample-wallet-transactions.csv' : 'sample-enrollments.csv',
    );
    const csv = await readFile((await download.path())!, 'utf8');
    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toContain(id);
    expect(csv).not.toContain(wallet ? 'TXN-1008' : 'ENR-1006');
    await page.getByLabel(`Search ${noun}`).fill('missing record');
    await expect(
      page.getByRole('heading', { name: `No ${noun} found` }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(wallet ? 8 : 6);
    await page.getByLabel(`Search ${noun}`).fill(id);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

for (const path of ['/courses', '/sections', '/lectures', '/wallets']) {
  test(`instructor can open ${path} and learner is redirected`, async ({
    page,
  }) => {
    await session(page, 'instructor');
    await page.goto(path);
    await expect(page).toHaveURL(path);
    await expect(page.locator('main h1')).toHaveText(
      path === '/wallets'
        ? 'Wallet.'
        : `${path.slice(1, 2).toUpperCase()}${path.slice(2)}.`,
    );
    await session(page, 'learner');
    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: 'Welcome to your dashboard' }),
    ).toBeVisible();
  });
}

for (const path of [
  '/',
  '/profile',
  '/users',
  '/categories',
  '/coupons',
  '/courses',
  '/sections',
  '/lectures',
  '/wallets',
  '/enrollments',
  '/localizations',
]) {
  test(`anonymous access to ${path} requires sign-in`, async ({ page }) => {
    await page.route('**/api/v1/users/me/', (route) =>
      route.fulfill({ status: 401, json: {} }),
    );
    await page.route('**/api/v1/auth/refresh/', (route) =>
      route.fulfill({ status: 401, json: {} }),
    );
    await page.route('**/api/v1/auth/csrf/', (route) =>
      route.fulfill({ json: { csrfToken: 'csrf' } }),
    );
    await page.goto(path);
    await expect(page).toHaveURL('/auth/sign-in');
    await expect(
      page.getByRole('button', { name: 'Sign in', exact: true }),
    ).toBeVisible();
  });
}

for (const role of ['instructor', 'learner']) {
  test(`${role} cannot access admin enrollments`, async ({ page }) => {
    await session(page, role);
    await page.goto('/enrollments');
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: 'Welcome to your dashboard' }),
    ).toBeVisible();
  });
}

test('unknown routes return to the dashboard', async ({ page }) => {
  await page.goto('/unknown-page');
  await expect(page).toHaveURL('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome to your dashboard' }),
  ).toBeVisible();
});
