import { test, expect } from '../fixtures/test';
import { mockCourses } from '../support/courses-api';
import { session } from '../support/session';

test('static welcome and responsive navigation', async ({
  controls,
  page,
}, testInfo) => {
  await session(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome to your dashboard' }),
  ).toBeVisible();
  await expect(
    page.getByText('Reports and insights will be available here soon.', {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('welcome.png'),
    fullPage: true,
  });
  await controls.openNavigation();
  await mockCourses(page);
  await page.getByRole('link', { name: 'Courses', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Courses.' })).toBeVisible();
  await controls.openNavigation();
  await page.route('**/api/v1/users/', (route) => route.fulfill({ json: [] }));
  await page.getByRole('link', { name: 'Users', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No Users Found' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('users.png'),
    fullPage: true,
  });
});

test('only Other and Site are accordions in admin navigation', async ({
  controls,
  page,
}) => {
  await session(page);
  await page.goto('/');
  await controls.openNavigation();
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });

  await expect(navigation.getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(navigation.locator('details > summary')).toHaveText([
    'Other',
    'Site',
  ]);
  for (const label of [
    'Users',
    'Category',
    'Courses',
    'Sections',
    'Lectures',
    'Ratings',
    'Wallets',
    'Coupons',
    'Enrollments',
  ]) {
    await expect(navigation.getByRole('link', { name: label })).toBeVisible();
  }
  await expect(navigation.getByText('Orders', { exact: true })).toBeVisible();
});

test('account dropdown supports keyboard navigation and SPA profile routing', async ({
  page,
}) => {
  await session(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome to your dashboard' }),
  ).toBeVisible();
  await expect(page.getByText('Manage profile', { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText('Manage users', { exact: true })).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Account menu' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Log out' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await page.locator('main').click({ position: { x: 2, y: 2 } });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.evaluate(() => {
    (window as unknown as { spaMarker: string }).spaMarker = 'same-document';
  });
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('Full name')).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { spaMarker: string }).spaMarker,
    ),
  ).toBe('same-document');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(page.getByLabel('Full name')).toBeVisible();
});

test('instructor navigation contains only their accessible management pages', async ({
  page,
  controls,
}) => {
  await session(page, {
    id: 'instructor-1',
    username: 'ada',
    role: ['instructor'],
  });
  await page.goto('/');
  await controls.openNavigation();
  await expect(
    page.getByRole('link', { name: 'Bank Account', exact: true }),
  ).toBeVisible();

  for (const label of [
    'Courses',
    'Ratings',
    'Coupons',
    'Enrollments',
    'Bank Account',
  ]) {
    await expect(
      page.getByRole('link', { name: label, exact: true }),
    ).toBeVisible();
  }
  for (const label of [
    'Users',
    'Category',
    'Sections',
    'Lectures',
    'Wallets',
  ]) {
    await expect(
      page.getByRole('link', { name: label, exact: true }),
    ).toHaveCount(0);
  }

  await page.goto('/sections');
  await expect(page).toHaveURL('/');
});
