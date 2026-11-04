import { test, expect } from '../fixtures/test';
import { session } from '../support/session';
import { mockCourses } from '../support/courses-api';

async function setup(page: import('@playwright/test').Page) {
  await session(page, {
    id: 'instructor-1',
    username: 'ada',
    role: ['instructor'],
  });
  await mockCourses(page);
  const records = ['Getting started', 'Core concepts', 'Hands-on project'].map(
    (title, index) => ({
      id: `section-${index + 1}`,
      title,
      description: 'Learn with practical exercises.',
      course: 'course-1',
      instructor: 'ada',
      course_title: 'Course 01',
      order: index + 1,
      status: 'draft',
      deleted_at: null,
    }),
  );
  const writes: { id: string; body: Record<string, unknown> }[] = [];
  await page.route('**/api/v1/section/instructor/all/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'PATCH') {
      const id = url.pathname.split('/').at(-2)!;
      const body = request.postDataJSON();
      writes.push({ id, body });
      expect(request.headers()['x-csrftoken']).toBe('csrf');
      const record = records.find((item) => item.id === id)!;
      Object.assign(record, body);
      return route.fulfill({ json: record });
    }
    expect(url.searchParams.get('course')).toBe('course-1');
    return route.fulfill({
      json: {
        count: records.length,
        next: null,
        previous: null,
        results: [...records].sort((a, b) => a.order - b.order),
      },
    });
  });
  await page.route('**/api/v1/lecture/instructor/all/**', (route) =>
    route.fulfill({
      json: {
        count: 2,
        next: null,
        previous: null,
        results: [1, 2].map((index) => ({
          id: `lecture-${index}`,
          title: `Lecture ${index}`,
          description: 'Description',
          section: 'section-1',
          course: 'course-1',
          order: index,
          lecture_type: 'video',
          status: 'draft',
          source: '/video.mp4',
          deleted_at: null,
        })),
      },
    }),
  );
  await page.goto('/courses/course-1/curriculum');
  return writes;
}

test('section keyboard reordering persists only after Save and survives reload', async ({
  page,
}) => {
  const writes = await setup(page);
  const list = page.getByRole('list', { name: 'Course sections' });
  const handle = page.getByRole('button', { name: 'Reorder Getting started' });
  await handle.focus();
  await handle.press('Space');
  await handle.press('ArrowDown');
  await handle.press('Space');
  await expect(list.getByRole('heading').first()).toHaveText('Core concepts');
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Section order saved.' }),
  ).toBeVisible();
  expect(writes).toEqual([
    { id: 'section-2', body: { order: 1 } },
    { id: 'section-1', body: { order: 2 } },
    { id: 'section-3', body: { order: 3 } },
  ]);
  await page.reload();
  await expect(list.getByRole('heading').first()).toHaveText('Core concepts');
});

test('section edits send changed fields; lecture dialogs are ready without unconfirmed writes', async ({
  page,
}) => {
  const writes = await setup(page);
  await page.getByLabel('Actions for Getting started').click();
  await page.getByRole('button', { name: 'Edit section', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Introduction');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(writes).toEqual([
    { id: 'section-1', body: { title: 'Introduction' } },
  ]);
  await page.getByLabel('Actions for Introduction').click();
  await page
    .getByRole('button', { name: 'Manage lectures', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'Lecture 1', exact: true }),
  ).toBeVisible();
  const handle = dialog.getByRole('button', { name: 'Reorder Lecture 1' });
  await handle.focus();
  await handle.press('Space');
  await handle.press('ArrowDown');
  await handle.press('Space');
  await expect(dialog.getByRole('listitem').first()).toContainText('Lecture 2');
  await expect(
    dialog.getByRole('button', { name: 'Save', exact: true }),
  ).toBeDisabled();
  page.once('dialog', (modal) => modal.accept());
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByLabel('Actions for Introduction').click();
  await page
    .getByRole('button', { name: 'Manage lectures', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Edit lecture Lecture 1', exact: true })
    .click();
  await expect(page.getByLabel('Lecture title')).toHaveValue('Lecture 1');
  await expect(
    page.getByRole('button', { name: 'Save changes' }),
  ).toBeDisabled();
  await expect(
    page.getByText(/Sample lectures|Sample curriculum|browser session/),
  ).toHaveCount(0);
});
