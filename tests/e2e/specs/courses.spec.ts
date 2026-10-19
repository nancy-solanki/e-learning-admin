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
  await expect(page.getByRole('alert')).toHaveCount(0);
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
  await controls.choose('Categories', 'Development');
  await controls.choose('Instructors', 'Ada Instructor ada@example.com');
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
    page.getByRole('button', { name: 'Previous', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('article').nth(2)).toContainText('Deleted');
  const view = page.getByRole('button', { name: 'View course' }).first();
  await view.click();
  await expect(page.getByRole('dialog')).toContainText('Free');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(view).toBeFocused();
});
