import { test, expect } from '../fixtures/test';
import { session } from '../support/session';
import { mockCourses } from '../support/courses-api';

test('course service errors can be retried', async ({ page }) => {
  await session(page);
  const state = await mockCourses(page);
  state.fail = true;
  await page.goto('/courses');
  await expect(page.getByRole('alert')).toContainText(
    'Course service unavailable',
  );
  state.fail = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Course library · 21' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /\b(add|create)\b/i }),
  ).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('instructors see the create tile beside their own courses', async ({
  page,
}) => {
  await session(page, {
    id: 'instructor-1',
    username: 'ada',
    role: ['instructor'],
  });
  const state = await mockCourses(page);
  await page.goto('/courses');

  await expect(
    page.getByRole('heading', { name: 'My Courses · 21' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Create new course', exact: true }),
  ).toHaveAttribute('href', '/courses/create');
  await expect(page.getByRole('heading', { name: 'Course 01' })).toBeVisible();
  expect(state.requests[0]?.has('instructor')).toBe(false);
  await expect(page.getByRole('button', { name: /^Filters/ })).toBeVisible();
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(
    page.getByRole('dialog', { name: 'Filter courses' }),
  ).toBeVisible();
});

test('instructors submit a saved course for approval', async ({ page }) => {
  await session(page, {
    id: 'instructor-1',
    username: 'ada',
    role: ['instructor'],
  });
  const state = await mockCourses(page);
  await page.goto('/courses');
  const course = page.locator('article').filter({ hasText: 'Course 01' });
  await course.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(course.getByText('In review', { exact: true })).toBeVisible();
  await expect(course).toContainText(
    'Course submitted for review. It will be published once an admin approves it.',
  );
  await expect(
    course.getByRole('button', { name: 'Submit for approval' }),
  ).toHaveCount(0);
  expect(state.submissions).toEqual(['course-1']);
});

test('course card actions do not overlap at narrow viewport widths', async ({
  page,
}) => {
  await session(page, {
    id: 'instructor-1',
    username: 'ada',
    role: ['instructor'],
  });
  await mockCourses(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/courses');

  const actions = page
    .locator('article')
    .first()
    .locator('footer a, footer button');
  await expect(actions).toHaveCount(3);
  const boxes = await actions.evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  for (let first = 0; first < boxes.length; first += 1) {
    for (let second = first + 1; second < boxes.length; second += 1) {
      const a = boxes[first];
      const b = boxes[second];
      expect(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
      ).toBe(true);
    }
  }
});

test('course filters send selected IDs, numbers and explicit false values and reset pagination', async ({
  page,
  controls,
}) => {
  await session(page);
  const state = await mockCourses(page);
  await page.goto('/courses?page=2');
  await expect(
    page.getByRole('heading', { name: 'Course 21', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filter courses' });
  await controls.choose('Categories', 'Development');
  await controls.choose('Instructors', 'Ada Instructor ada@example.com');
  await controls.choose('Ordering', 'Title: Z–A', drawer);
  await controls.choose('Free courses', 'No');
  await controls.choose('Best sellers', 'Yes');
  await page.getByLabel('Minimum price').fill('10');
  await page.getByLabel('Maximum price').fill('100');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(
    page.getByRole('heading', { name: 'Course library · 1' }),
  ).toBeVisible();
  expect(Object.fromEntries(state.requests.at(-1)!)).toMatchObject({
    category: 'category-1',
    instructor: 'instructor-1',
    price_min: '10',
    price_max: '100',
    is_free: 'false',
    is_best_seller: 'true',
    ordering: '-title',
    page: '1',
  });
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL('/courses');
  await expect(
    page.getByRole('heading', { name: 'Course library · 21' }),
  ).toBeVisible();
});

test('course filters use category names and omit slug and tag-only filters', async ({
  page,
}) => {
  await session(page);
  const state = await mockCourses(page);
  await page.goto(
    '/courses?category_slug=programming&tag=tag-uuid&tag_slug=beginner',
  );
  await expect(
    page.getByRole('heading', { name: 'Course library · 21' }),
  ).toBeVisible();
  expect(Object.fromEntries(state.requests.at(-1)!)).toEqual({ page: '1' });
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filter courses' });
  await expect(
    drawer.getByRole('button', { name: 'Categories' }),
  ).toBeVisible();
  await expect(drawer.getByLabel('course-category-slug')).toHaveCount(0);
  await expect(drawer.getByLabel('course-tag')).toHaveCount(0);
  await expect(drawer.getByLabel('course-tag-slug')).toHaveCount(0);
});

test('invalid course URL values are ignored and dialog close restores focus', async ({
  page,
}) => {
  await session(page);
  const state = await mockCourses(page);
  await page.goto(
    '/courses?page=-2&status=invalid&price_min=bad&is_free=maybe',
  );
  await expect(
    page.getByRole('heading', { name: 'Course library · 21' }),
  ).toBeVisible();
  expect(Object.fromEntries(state.requests.at(-1)!)).toEqual({ page: '1' });
  await expect(
    page.getByRole('button', { name: 'Previous page', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('article').nth(2)).toContainText('Deleted');
  const view = page.getByRole('button', { name: 'View course' }).first();
  await view.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Free');
  await expect(dialog).not.toContainText('instructor-1');
  await expect(dialog).not.toContainText('category-1');
  await expect(
    dialog.getByRole('img', { name: 'Image unavailable for Course 01' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(view).toBeFocused();
  await page
    .locator('article')
    .nth(2)
    .getByRole('button', { name: 'View course' })
    .click();
  const deleted = page.getByRole('dialog');
  await expect(
    deleted.getByRole('button', { name: 'Change status' }),
  ).toHaveCount(0);
});

test('admins can view course details but cannot change course content or status', async ({
  page,
}) => {
  await session(page);
  const state = await mockCourses(page);
  await page.goto('/courses');
  await page.getByRole('button', { name: 'View course' }).first().click();
  const details = page.getByRole('dialog', { name: 'Course 01' });
  await expect(
    details.getByRole('button', { name: 'Change status' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Create new course' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Manage curriculum for Course 01' }),
  ).toHaveCount(0);
  expect(state.patchBodies).toEqual([]);
  expect(
    state.methods.some((method) =>
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method),
    ),
  ).toBe(false);
});

test('scrolling appends courses, stops at the end, and search resets the list', async ({
  page,
}) => {
  await session(page);
  const state = await mockCourses(page);
  await page.goto('/courses');
  await expect(page.locator('article')).toHaveCount(20);
  await page.getByRole('status').scrollIntoViewIfNeeded();
  await expect(page.locator('article')).toHaveCount(21);
  await expect(page.locator('article').first()).toContainText('Course 01');
  await expect(page.getByRole('status')).toHaveText('Showing 21 of 21 courses');
  expect(state.requests.map((params) => params.get('page'))).toEqual([
    '1',
    '2',
  ]);
  await page.getByRole('textbox', { name: 'Search courses' }).fill('Course 01');
  await expect(page.locator('article')).toHaveCount(1);
  expect(Object.fromEntries(state.requests.at(-1)!)).toMatchObject({
    search: 'Course 01',
    page: '1',
  });
});

test('a failed next page preserves courses and can be retried', async ({
  page,
}) => {
  await session(page);
  const state = await mockCourses(page);
  await page.goto('/courses');
  await expect(page.locator('article')).toHaveCount(20);
  state.fail = true;
  await page.getByRole('status').scrollIntoViewIfNeeded();
  await expect(page.getByRole('alert')).toContainText(
    'Course service unavailable',
  );
  await expect(page.locator('article')).toHaveCount(20);
  state.fail = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(21);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
