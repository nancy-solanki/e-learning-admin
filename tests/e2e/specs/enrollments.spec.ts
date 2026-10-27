import { test, expect } from '@playwright/test';

const id = '550e8400-e29b-41d4-a716-446655440000';
const course = {
  id: '650e8400-e29b-41d4-a716-446655440000',
  title: 'Design foundations',
  slug: 'design',
};
const entry = {
  id,
  user: {
    id: 'student',
    username: 'emma',
    full_name: 'Emma Wilson',
    email: 'emma@example.com',
    avatar: '',
  },
  course,
  created_at: null,
  total_lessons: 0,
  completed_lessons: null,
  progress: null,
  status: 'unknown',
  access: null,
  progress_tracking_available: false,
};
const envelope = (results: unknown[], next: string | null = null) => ({
  count: 21,
  next,
  previous: null,
  results,
});

test('admin report filters, pagination, truthful progress, modal and export', async ({
  page,
}) => {
  const requests: URL[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (url.pathname.endsWith('/users/me/'))
      return route.fulfill({
        json: { id: 'admin', username: 'admin', role: ['admin'] },
      });
    if (url.pathname.endsWith('/courses/'))
      return route.fulfill({
        json: envelope(
          url.searchParams.get('page') === '2'
            ? [{ ...course, id: 'second', title: 'Second course' }]
            : [course],
          url.searchParams.get('page') === '2' ? null : '?page=2',
        ),
      });
    if (url.pathname.endsWith('/summary/'))
      return route.fulfill({
        json: {
          total_enrollments: 21,
          in_progress: null,
          completed: null,
          not_started: null,
          unknown: 21,
          progress_tracking_available: false,
        },
      });
    if (url.pathname.endsWith('/export/'))
      return route.fulfill({
        contentType: 'text/csv',
        body: 'Enrollment ID,Student\n' + id + ',Emma Wilson',
      });
    if (url.pathname.endsWith(`/${id}/`)) return route.fulfill({ json: entry });
    return route.fulfill({
      json: envelope(
        [entry],
        url.searchParams.get('page') === '2' ? null : '?page=2',
      ),
    });
  });
  await page.goto('/enrollments');
  await expect(page.getByText('emma@example.com')).toBeVisible();
  await expect(page.getByText('Progress tracking unavailable')).toHaveCount(3);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByText('Unavailable', { exact: true })).toBeVisible();
  const view = page.getByRole('button', { name: `View enrollment ${id}` });
  await view.click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText(id, { exact: true })).toBeVisible();
  await expect(modal.getByText('Not specified')).toBeVisible();
  await modal.getByRole('button', { name: 'Close', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(
    modal.getByRole('button', { name: 'Close dialog' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(view).toBeFocused();
  await view.click();
  await modal.getByRole('button', { name: 'Close dialog' }).click();
  await view.click();
  await modal.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2', { exact: true })).toBeVisible();
  for (const search of [id, 'Emma Wilson', 'Design foundations']) {
    await page
      .getByRole('textbox', { name: 'Search enrollments' })
      .fill(search);
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            url.pathname.endsWith('/management/') &&
            url.searchParams.get('search') === search &&
            url.searchParams.get('page') === '1',
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            url.pathname.endsWith('/summary/') &&
            url.searchParams.get('search') === search,
        ),
      )
      .toBe(true);
  }
  await page.getByRole('button', { name: 'Filter by course' }).click();
  await expect(
    page.getByRole('option', { name: 'Second course' }),
  ).toBeVisible();
  await page.getByRole('option', { name: course.title }).click();
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.pathname.endsWith('/management/') &&
          url.searchParams.get('course') === course.id,
      ),
    )
    .toBe(true);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export enrollments' }).click();
  expect((await download).suggestedFilename()).toBe('enrollments.csv');
  const exported = requests.find((url) => url.pathname.endsWith('/export/'))!;
  expect(exported.searchParams.get('page')).toBeNull();
  expect(exported.searchParams.get('course')).toBe(course.id);
  expect(exported.searchParams.get('search')).toBe('Design foundations');
  for (const url of requests.filter((url) =>
    url.pathname.endsWith('/courses/'),
  ))
    expect([...url.searchParams.keys()]).toEqual(['page']);
});

for (const role of ['learner', 'instructor', 'staff']) {
  test(`${role} cannot access report or navigation`, async ({ page }) => {
    let reportRequests = 0;
    await page.route('**/api/v1/**', (route) => {
      if (route.request().url().includes('/enroll/')) reportRequests++;
      return route.fulfill({
        json: {
          id: role,
          username: role,
          role: [role],
          is_staff: role === 'staff',
        },
      });
    });
    await page.goto('/enrollments');
    await expect(
      page.getByRole('heading', { name: 'Access denied' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Enrollments', exact: true }),
    ).toHaveCount(0);
    expect(reportRequests).toBe(0);
  });
}

test('403 from details removes existing reporting data', async ({ page }) => {
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/users/me/'))
      return route.fulfill({ json: { id: 'admin', role: ['admin'] } });
    if (path.endsWith(`/${id}/`))
      return route.fulfill({ status: 403, json: { detail: 'Forbidden' } });
    if (path.endsWith('/summary/'))
      return route.fulfill({ json: { total_enrollments: 21 } });
    return route.fulfill({
      json: envelope(path.endsWith('/courses/') ? [course] : [entry]),
    });
  });
  await page.goto('/enrollments');
  await page.getByRole('button', { name: `View enrollment ${id}` }).click();
  await expect(
    page.getByRole('heading', { name: 'Access denied' }),
  ).toBeVisible();
  await expect(page.getByText('emma@example.com')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const code of [401, 404]) {
  test(`detail ${code} handles expired session or missing enrollment`, async ({
    page,
  }) => {
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/users/me/'))
        return route.fulfill({ json: { id: 'admin', role: ['admin'] } });
      if (path.endsWith('/auth/csrf/'))
        return route.fulfill({ json: { csrfToken: 'test' } });
      if (path.includes('/auth/') || path.endsWith(`/${id}/`))
        return route.fulfill({ status: code, json: { detail: 'Unavailable' } });
      if (path.endsWith('/summary/'))
        return route.fulfill({ json: { total_enrollments: 21 } });
      return route.fulfill({
        json: envelope(path.endsWith('/courses/') ? [course] : [entry]),
      });
    });
    await page.goto('/enrollments');
    await page.getByRole('button', { name: `View enrollment ${id}` }).click();
    if (code === 401) {
      await expect(page).toHaveURL(/auth\/sign-in/);
      await expect(page.getByText('emma@example.com')).toHaveCount(0);
    } else {
      await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
        'Enrollment not found.',
      );
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Close', exact: true })
        .click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });
}
