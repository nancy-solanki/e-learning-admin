import { test, expect } from '@playwright/test';

const id = '550e8400-e29b-41d4-a716-446655440000';
const courseId = '650e8400-e29b-41d4-a716-446655440000';
const course = {
  id: courseId,
  title: 'Design foundations',
  slug: 'design',
  status: 'published',
};
const entry = {
  id,
  user: {
    id: 'student',
    username: 'emma',
    first_name: 'Emma',
    last_name: 'Wilson',
    full_name: 'Emma Wilson',
    avatar: '',
  },
  course: { id: courseId, title: course.title, slug: course.slug },
  average_rating: null,
  progress: 0,
  created_at: '2026-10-10T09:00:00Z',
  updated_at: '2026-10-10T09:00:00Z',
  deleted_at: null,
};
const envelope = (results: unknown[], next: string | null = null) => ({
  count: results.length,
  next,
  previous: null,
  results,
});
const publishedCourse = {
  ...course,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: null,
  deleted_at: null,
  short_description: '',
  long_description: '',
  is_free: true,
  price: 0,
  reject_reason: null,
  is_best_seller: false,
  learn_description_points: '',
  requirements: '',
  total_hours: '0',
  total_articles: 0,
  thumbnail: null,
  instructor: 'instructor',
  categories: [],
  tags: [],
  student_count: 1,
};

test('instructor enrollment management and published course roster', async ({
  page,
}) => {
  const requests: URL[] = [];
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    if (url.pathname.endsWith('/users/me/'))
      return route.fulfill({
        json: { id: 'instructor', username: 'ada', role: ['instructor'] },
      });
    if (url.pathname.endsWith('/course/instructor/all/'))
      return route.fulfill({
        json: envelope([
          publishedCourse,
          {
            ...publishedCourse,
            id: 'draft-id',
            title: 'Draft course',
            slug: 'draft',
            status: 'draft',
          },
        ]),
      });
    if (url.pathname.endsWith('/enroll/management/'))
      return route.fulfill({ json: envelope([entry]) });
    if (url.pathname.endsWith('/enroll/course/design/'))
      return route.fulfill({ json: envelope([entry]) });
    if (url.pathname.endsWith(`/enroll/management/${id}/`))
      return route.fulfill({ json: entry });
    return route.fulfill({ json: envelope([]) });
  });

  await page.goto('/enrollments');
  await expect(page.getByText('Emma Wilson')).toBeVisible();
  await expect(page.getByText('emma@example.com')).toHaveCount(0);
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filter by course' }).click();
  await expect(
    page.getByRole('option', { name: 'Design foundations' }),
  ).toBeVisible();
  await expect(page.getByRole('option', { name: 'Draft course' })).toHaveCount(
    0,
  );
  await page.getByRole('option', { name: 'Design foundations' }).click();
  await expect
    .poll(() =>
      requests.some((url) => url.pathname === '/api/v1/enroll/course/design/'),
    )
    .toBe(true);
  await page.getByRole('button', { name: `View enrollment ${id}` }).click();
  await expect(page.getByRole('dialog').getByText('Not rated')).toBeVisible();
  await expect(
    page.getByRole('dialog').getByText('0%', { exact: true }),
  ).toHaveCount(2);
});

test('learners cannot access report or navigation', async ({ page }) => {
  let reportRequests = 0;
  await page.route('**/api/v1/**', (route) => {
    if (route.request().url().includes('/enroll/')) reportRequests++;
    return route.fulfill({
      json: { id: 'learner', username: 'learner', role: ['learner'] },
    });
  });
  await page.goto('/enrollments');
  await expect(page).toHaveURL('/auth/sign-in');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Enrollments', exact: true }),
  ).toHaveCount(0);
  expect(reportRequests).toBe(0);
});

test('instructors can access enrollments from navigation and direct URL', async ({
  page,
}) => {
  let reportRequests = 0;
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/users/me/'))
      return route.fulfill({
        json: {
          id: 'instructor',
          username: 'instructor',
          role: ['instructor'],
        },
      });
    if (url.pathname.includes('/enroll/')) reportRequests++;
    return route.fulfill({ json: envelope([]) });
  });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Open menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await expect(page.getByRole('link', { name: 'Enrollments' })).toBeVisible();
  await page.goto('/enrollments');
  await expect(page).toHaveURL('/enrollments');
  await expect.poll(() => reportRequests).toBeGreaterThan(0);
});

test('404 from detail reports a missing enrollment', async ({ page }) => {
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/users/me/'))
      return route.fulfill({ json: { id: 'admin', role: ['admin'] } });
    if (url.pathname.endsWith(`/enroll/management/${id}/`))
      return route.fulfill({ status: 404, json: { detail: 'Not found' } });
    if (url.pathname.endsWith('/course/instructor/all/'))
      return route.fulfill({ json: envelope([]) });
    return route.fulfill({ json: envelope([entry]) });
  });
  await page.goto('/enrollments');
  await page.getByRole('button', { name: `View enrollment ${id}` }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Enrollment not found.',
  );
});
