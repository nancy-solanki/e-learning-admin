import { test, expect } from '../fixtures/test';
import { admin } from '../fixtures/users';
import { session } from '../support/session';

const instructor = { ...admin, id: 'instructor-1', role: ['instructor'] };

const dashboard = {
  instructor: { first_name: 'Grace' },
  metrics: {
    published_courses: 3,
    total_students: 1240,
    average_rating: 4.8,
    new_students_30d: 86,
  },
  enrollment_trend: [{ date: '2026-11-01', count: 12 }],
  course_earnings: [{ date: '2026-11-01', amount: '1250.50' }],
  currency: 'INR',
  top_courses: [
    {
      id: 'course-1',
      title: 'Practical TypeScript',
      slug: 'practical-typescript',
      thumbnail_url: null,
      status: 'published' as const,
      student_count: 700,
      average_rating: 4.9,
      updated_at: '2026-11-01T00:00:00Z',
    },
  ],
  recent_ratings: [
    {
      id: 'rating-1',
      course_title: 'Practical TypeScript',
      student_name: 'Sam Learner',
      rating: 5,
      comment: 'Clear and useful.',
      created_at: '2026-11-15T00:00:00Z',
    },
  ],
};

test('instructor dashboard shows metrics, course and rating data and requests each chart range', async ({
  page,
}) => {
  await session(page, instructor);
  const periods: string[] = [];
  await page.route('**/api/v1/dashboard/instructor/**', (route) => {
    periods.push(
      new URL(route.request().url()).searchParams.get('period') ?? '',
    );
    return route.fulfill({ json: dashboard });
  });
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Welcome back, Grace' }),
  ).toBeVisible();
  const metrics = page.getByRole('region', { name: 'Instructor metrics' });
  await expect(metrics).toContainText('3');
  await expect(metrics).toContainText('1,240');
  await expect(metrics).toContainText('4.8');
  await expect(metrics).toContainText('86');
  await expect(
    page.getByRole('heading', { name: 'Student enrollment' }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: /student enrollments/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: /course earnings/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Performance charts' })
      .locator('p')
      .filter({ hasText: '₹1,250.50' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Practical TypeScript/ }),
  ).toHaveAttribute('href', '/courses/course-1/edit');
  await expect(page.getByText('Clear and useful.')).toBeVisible();

  for (const period of ['monthly', 'yearly', 'daily']) {
    await page.getByRole('button', { name: period, exact: true }).click();
    await expect(
      page.getByRole('button', { name: period, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  }
  expect(periods).toEqual(['daily', 'monthly', 'yearly']);
});

test('instructor dashboard shows empty states and retries a failed dashboard request', async ({
  page,
}) => {
  await session(page, instructor);
  let fail = true;
  const requests: string[] = [];
  await page.route('**/api/v1/dashboard/instructor/**', (route) => {
    requests.push(
      new URL(route.request().url()).searchParams.get('period') ?? '',
    );
    if (fail) {
      return route.fulfill({
        status: 503,
        json: { detail: 'Dashboard unavailable' },
      });
    }
    return route.fulfill({
      json: {
        ...dashboard,
        metrics: { ...dashboard.metrics, average_rating: null },
        enrollment_trend: [],
        course_earnings: [],
        currency: null,
        top_courses: [],
        recent_ratings: [],
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText(
    'Unable to load your dashboard. Please try again.',
  );
  fail = false;
  await page.getByRole('button', { name: 'Retry' }).click();

  await expect(
    page.getByText('No enrollment activity in this period.'),
  ).toBeVisible();
  await expect(page.getByText('No earnings in this period.')).toBeVisible();
  await expect(
    page.getByText(
      'You haven’t created a course yet. Start with your first course.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText('No ratings yet. Student feedback will appear here.'),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Instructor metrics' }),
  ).toContainText('—');
  expect(requests).toEqual(['daily', 'daily']);
});
