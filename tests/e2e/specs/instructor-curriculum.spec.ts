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
      deleted_at: null as string | null,
    }),
  );
  const writes: { id: string; body: Record<string, unknown> }[] = [];
  const sectionSubmissions: string[] = [];
  const sectionDeletes: string[] = [];
  await page.route('**/api/v1/section/instructor/all/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST' && url.pathname.endsWith('/submit/')) {
      const id = url.pathname.split('/').at(-3)!;
      sectionSubmissions.push(id);
      const record = records.find((item) => item.id === id)!;
      record.status = 'in-review';
      return route.fulfill({
        json: {
          message:
            'Section submitted for review. It will be published once an admin approves it.',
          status: 'in-review',
        },
      });
    }
    if (request.method() === 'DELETE') {
      const id = url.pathname.split('/').at(-2)!;
      sectionDeletes.push(id);
      const record = records.find((item) => item.id === id)!;
      record.deleted_at = '2026-10-25T10:00:00Z';
      return route.fulfill({
        json: { message: 'Section deleted successfully' },
      });
    }
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
  const lectureRecords = [1, 2].map((index) => ({
    id: `lecture-${index}`,
    title: `Lecture ${index}`,
    description: 'Description',
    section: 'section-1',
    course: 'course-1',
    order: index,
    lecture_type: 'video',
    status: 'draft',
    is_preview: false,
    document_content: null,
    source: '/video.mp4',
    thumbnail: null,
    resources: [],
    deleted_at: null as string | null,
  }));
  const lectureWrites: {
    method: string;
    id?: string;
    body?: Record<string, unknown>;
  }[] = [];
  await page.route('**/api/v1/lecture/instructor/all/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const id = url.pathname.split('/').at(-2);
    if (request.method() === 'POST' && url.pathname.endsWith('/submit/')) {
      const recordId = url.pathname.split('/').at(-3)!;
      lectureWrites.push({ method: 'SUBMIT', id: recordId });
      const record = lectureRecords.find((item) => item.id === recordId)!;
      record.status = 'in-review';
      return route.fulfill({
        json: {
          message:
            'Lecture submitted for review. It will be published once an admin approves it.',
          status: 'in-review',
        },
      });
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/all/')) {
      expect(url.searchParams.get('course')).toBe('course-1');
      expect(url.searchParams.get('section')).toBe('section-1');
      return route.fulfill({
        json: {
          count: lectureRecords.length,
          next: null,
          previous: null,
          results: [...lectureRecords].sort((a, b) => a.order - b.order),
        },
      });
    }
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      lectureWrites.push({ method: 'POST', body });
      const record = {
        ...lectureRecords[0],
        ...body,
        id: `lecture-${lectureRecords.length + 1}`,
      };
      lectureRecords.push(record);
      return route.fulfill({ status: 201, json: record });
    }
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON() as Record<string, unknown>;
      lectureWrites.push({ method: 'PATCH', id, body });
      const record = lectureRecords.find((item) => item.id === id)!;
      Object.assign(record, body);
      return route.fulfill({ json: record });
    }
    if (request.method() === 'DELETE') {
      lectureWrites.push({ method: 'DELETE', id });
      const record = lectureRecords.find((item) => item.id === id)!;
      const deleted = !record.deleted_at;
      record.deleted_at = deleted ? '2026-10-25T10:00:00Z' : null;
      return route.fulfill({
        json: {
          message: deleted
            ? 'Lecture deleted successfully'
            : 'Lecture activated successfully',
        },
      });
    }
    return route.fulfill({
      json: lectureRecords.find((item) => item.id === id),
    });
  });
  await page.goto('/courses/course-1/curriculum');
  return { writes, lectureWrites, sectionSubmissions, sectionDeletes };
}

test('section keyboard reordering persists only after Save and survives reload', async ({
  page,
}) => {
  const { writes } = await setup(page);
  const list = page.getByRole('list', { name: 'Course sections' });
  const handle = page.getByRole('button', { name: 'Reorder Getting started' });
  await handle.focus();
  await handle.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await handle.press('ArrowDown');
  await handle.press('ArrowDown');
  await handle.press('ArrowUp');
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

test('section edits and lecture writes use the instructor curriculum API', async ({
  page,
}) => {
  const { writes, lectureWrites } = await setup(page);
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
  await dialog
    .getByRole('listitem')
    .filter({ hasText: 'Lecture 1' })
    .getByLabel('Actions for lecture Lecture 1')
    .click();
  await dialog
    .getByRole('button', { name: 'Edit lecture Lecture 1', exact: true })
    .click();
  await expect(page.getByLabel('Lecture title')).toHaveValue('Lecture 1');
  await page.getByLabel('Lecture title').fill('Revised lecture');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  expect(lectureWrites.at(-1)).toMatchObject({
    method: 'PATCH',
    id: 'lecture-1',
    body: {
      title: 'Revised lecture',
      order: 1,
      course: 'course-1',
      section: 'section-1',
    },
  });
  await expect(
    page.getByText(/Sample lectures|Sample curriculum|browser session/),
  ).toHaveCount(0);
});

test('instructors submit sections and lectures for approval', async ({
  page,
}) => {
  const { sectionSubmissions, lectureWrites } = await setup(page);
  const section = page
    .getByRole('list', { name: 'Course sections' })
    .getByRole('listitem')
    .filter({ hasText: 'Getting started' });
  await section.getByLabel('Actions for Getting started').click();
  await page
    .getByRole('button', { name: 'Submit for approval', exact: true })
    .click();
  await expect(section.getByText('In review', { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Section submitted for review.' })
      .first(),
  ).toBeVisible();
  expect(sectionSubmissions).toEqual(['section-1']);
  await page
    .getByRole('button', { name: 'Manage lectures', exact: true })
    .click();
  const lectureDialog = page.getByRole('dialog', { name: 'Manage lectures' });
  const lecture = lectureDialog
    .getByRole('listitem')
    .filter({ hasText: 'Lecture 1' });
  await lecture.getByLabel('Actions for lecture Lecture 1').click();
  await page
    .getByRole('button', { name: 'Submit for approval', exact: true })
    .click();
  await expect(lecture.getByText('In review', { exact: true })).toBeVisible();
  await expect(
    lectureDialog
      .getByRole('status')
      .filter({ hasText: 'Lecture submitted for review.' })
      .first(),
  ).toBeVisible();
  expect(lectureWrites.at(-1)).toEqual({
    method: 'SUBMIT',
    id: 'lecture-1',
  });
  await expect(
    lecture.getByRole('button', { name: 'Submit for approval' }),
  ).toHaveCount(0);
});

test('sections can be deleted from their actions menu', async ({ page }) => {
  const { sectionDeletes } = await setup(page);
  const section = page
    .getByRole('list', { name: 'Course sections' })
    .getByRole('listitem')
    .filter({ hasText: 'Getting started' });
  await section.getByLabel('Actions for Getting started').click();
  await page
    .getByRole('button', { name: 'Delete section', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Delete section' })
    .getByRole('button', { name: 'Delete section', exact: true })
    .click();
  await expect(section).toHaveCount(0);
  expect(sectionDeletes).toEqual(['section-1']);
});

test('instructors create document lectures as JSON and can soft-delete them', async ({
  page,
}) => {
  const { lectureWrites } = await setup(page);
  await page.getByLabel('Actions for Getting started').click();
  await page
    .getByRole('button', { name: 'Manage lectures', exact: true })
    .click();
  await page.getByRole('button', { name: '+ New lecture' }).click();
  await page.getByLabel('Lecture type').click();
  await page.getByRole('option', { name: 'Document' }).click();
  await page.getByLabel('Lecture title').fill('Course introduction');
  await page.getByLabel('Description').fill('Start here');
  await page.getByLabel('Document content').fill('Welcome to the course.');
  await page.getByRole('button', { name: 'Create lecture' }).click();
  await expect(page.getByText('Lecture saved.').first()).toBeVisible();
  expect(lectureWrites.at(-1)).toEqual({
    method: 'POST',
    body: {
      title: 'Course introduction',
      description: 'Start here',
      lecture_type: 'document',
      is_preview: false,
      document_content: 'Welcome to the course.',
      resources: [],
      order: 3,
      course: 'course-1',
      section: 'section-1',
    },
  });
  await page.getByLabel('Actions for lecture Course introduction').click();
  await page
    .getByRole('button', {
      name: 'Delete lecture Course introduction',
    })
    .click();
  await page
    .getByRole('button', { name: 'Delete lecture', exact: true })
    .click();
  await expect(page.getByText('Lecture deleted.').first()).toBeVisible();
  expect(lectureWrites.at(-1)).toMatchObject({
    method: 'DELETE',
    id: 'lecture-3',
  });
  await page
    .getByRole('dialog', { name: 'Manage lectures' })
    .getByRole('button', { name: 'Restore lecture', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Restore lecture' })
    .getByRole('button', { name: 'Restore lecture', exact: true })
    .click();
  await expect(page.getByText('Lecture restored.').first()).toBeVisible();
  expect(lectureWrites.at(-1)).toMatchObject({
    method: 'DELETE',
    id: 'lecture-3',
  });
});

test('section form blocks whitespace-only titles and descriptions', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('button', { name: '+ New section' }).click();

  const title = page.getByRole('textbox', { name: 'Title', exact: true });
  const description = page.getByRole('textbox', {
    name: 'Description',
    exact: true,
  });
  const submit = page.getByRole('button', { name: 'Create section' });

  await title.fill('   ');
  await description.fill('A valid description.');
  await expect(submit).toBeDisabled();

  await title.fill('A valid title.');
  await description.fill('   ');
  await expect(submit).toBeDisabled();
});

test('lecture form validates video files and required document content', async ({
  page,
}) => {
  const { lectureWrites } = await setup(page);
  await page.getByLabel('Actions for Getting started').click();
  await page
    .getByRole('button', { name: 'Manage lectures', exact: true })
    .click();
  await page.getByRole('button', { name: '+ New lecture' }).click();
  await page.getByLabel('Lecture title').fill('Course introduction');
  await page.getByLabel('Description').fill('Start here');

  await page.getByRole('button', { name: 'Create lecture' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Choose a video to continue.',
  );
  expect(lectureWrites).toHaveLength(0);

  await page.locator('#lecture-video').setInputFiles({
    name: 'thumbnail.png',
    mimeType: 'image/png',
    buffer: Buffer.from('image'),
  });
  await expect(page.getByRole('alert')).toHaveText('Choose a video file.');
  expect(lectureWrites).toHaveLength(0);

  await page.getByLabel('Lecture type').click();
  await page.getByRole('option', { name: 'Document' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('Document content')).toHaveAttribute(
    'required',
    '',
  );
  await page.getByRole('button', { name: 'Create lecture' }).click();
  expect(lectureWrites).toHaveLength(0);
  await expect(page.getByLabel('Document content')).toBeVisible();
});

test('video and thumbnail inputs use the shared file selection control', async ({
  page,
}) => {
  await setup(page);
  await page.getByLabel('Actions for Getting started').click();
  await page
    .getByRole('button', { name: 'Manage lectures', exact: true })
    .click();
  await page.getByRole('button', { name: '+ New lecture' }).click();

  await expect(
    page
      .getByRole('button', { name: 'Click to upload or drag and drop' })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByRole('button', { name: 'Click to upload or drag and drop' })
      .nth(1),
  ).toBeVisible();
  await expect(page.locator('#lecture-video').locator('..')).toHaveClass(
    /ui-file-dropzone/,
  );
  await expect(page.locator('#lecture-thumbnail').locator('..')).toHaveClass(
    /ui-file-dropzone/,
  );
  await page.locator('#lecture-video').setInputFiles({
    name: 'lesson.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('video'),
  });
  await page.locator('#lecture-thumbnail').setInputFiles({
    name: 'thumbnail.png',
    mimeType: 'image/png',
    buffer: Buffer.from('image'),
  });
  await expect(page.getByText('lesson.mp4')).toBeVisible();
  await expect(page.getByText('thumbnail.png')).toBeVisible();
  await page.getByRole('button', { name: 'Remove lesson.mp4' }).click();
  await expect(page.getByText('No video selected')).toBeVisible();
});
