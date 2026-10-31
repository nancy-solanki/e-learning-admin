import { test, expect } from '../fixtures/test';
import { session, sessionAs } from '../support/session';
import { mockCurriculum } from '../support/curriculum-api';

for (const kind of ['section', 'lecture'] as const) {
  const plural = `${kind}s`;

  test(`${plural}: instructors use direct navigation and live curriculum details`, async ({
    page,
  }) => {
    await sessionAs(page, 'instructor');
    const state = await mockCurriculum(page);
    await page.goto(`/${plural}`);
    await expect(page.locator('article')).toContainText(state[kind].title);
    const navigation = page.getByRole('navigation', {
      name: 'Main navigation',
    });
    await expect(navigation.getByRole('link')).toHaveText([
      'Home',
      'Courses',
      'Ratings',
      'Coupons',
      'Enrollments',
      'Bank Account',
    ]);
    await expect(navigation.locator('details')).toHaveCount(0);
    await expect(page.getByText('Sample data · Static preview')).toHaveCount(0);
    await page.getByRole('button', { name: 'View details' }).click();
    await expect(
      page.getByRole('dialog', { name: state[kind].title }),
    ).toBeVisible();
  });

  test(`${plural}: list failures can be retried`, async ({ page }) => {
    await session(page);
    const state = await mockCurriculum(page);
    state.failList = kind;
    await page.goto(`/${plural}`);
    await expect(page.getByRole('alert')).toContainText(
      'Curriculum unavailable',
    );
    state.failList = null;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.locator('article')).toHaveCount(1);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test(`${plural}: detail failures can be retried and dismissed`, async ({
    page,
  }) => {
    await session(page);
    const state = await mockCurriculum(page);
    state.failDetail = true;
    await page.goto(`/${plural}`);
    const view = page.getByRole('button', { name: 'View details' });
    await view.click();
    await expect(page.getByRole('alert')).toContainText('Details unavailable');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await view.click();
    await expect(page.getByRole('alert')).toContainText('Details unavailable');
    state.failDetail = false;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: state[kind].title }),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test(`${plural}: failed moderation preserves the draft for retry`, async ({
    page,
    controls,
  }) => {
    await session(page);
    const state = await mockCurriculum(page);
    state.failPatch = true;
    await page.goto(`/${plural}`);
    await page.getByRole('button', { name: 'View details' }).click();
    const details = page.getByRole('dialog', { name: state[kind].title });
    await details.getByRole('button', { name: 'Change status' }).click();
    const dialog = page.getByRole('dialog', {
      name: 'Change publication status',
    });
    await expect(
      dialog.getByRole('button', { name: 'Change status' }),
    ).toBeDisabled();
    await controls.choose('New status', 'Rejected', dialog);
    if (kind === 'lecture') {
      await dialog
        .getByLabel('Rejection reason (optional)')
        .fill('  Improve audio.  ');
    }
    await dialog.getByRole('button', { name: 'Change status' }).click();
    await expect(dialog.getByRole('alert')).toContainText(
      'Status update failed',
    );
    await expect(
      dialog.getByRole('button', { name: 'New status' }),
    ).toContainText('Rejected');
    expect(state[kind].status).toBe('published');
    if (kind === 'lecture') {
      await expect(
        dialog.getByLabel('Rejection reason (optional)'),
      ).toHaveValue('  Improve audio.  ');
    }
    state.failPatch = false;
    await dialog.getByRole('button', { name: 'Change status' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.locator('article').getByText('Rejected', { exact: true }),
    ).toBeVisible();
    await expect(details.getByText('rejected', { exact: true })).toBeVisible();
    const payload =
      kind === 'lecture'
        ? { status: 'rejected', reject_reason: 'Improve audio.' }
        : { status: 'rejected' };
    expect(
      state[kind === 'section' ? 'sectionPatches' : 'lecturePatches'],
    ).toEqual([payload, payload]);
  });

  test(`${plural}: deleted records cannot be moderated`, async ({ page }) => {
    await session(page);
    const state = await mockCurriculum(page);
    state[kind].deleted_at = '2026-01-01T00:00:00Z';
    await page.goto(`/${plural}`);
    await expect(page.locator('article')).toContainText('Deleted · read-only');
    await page.getByRole('button', { name: 'View details' }).click();
    const details = page.getByRole('dialog', { name: state[kind].title });
    await expect(details).toBeVisible();
    await expect(
      details.getByRole('button', { name: 'Change status' }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
    expect(state.methods.every((method) => method === 'GET')).toBe(true);
  });

  test(`${plural}: pagination, search and empty results reset correctly`, async ({
    page,
  }) => {
    await session(page);
    const state = await mockCurriculum(page);
    state.count = 21;
    await page.goto(`/${plural}`);
    await expect(page.locator('article')).toHaveCount(20);
    await expect(
      page.getByRole('button', { name: 'Previous', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.locator('article')).toHaveCount(1);
    await expect(page).toHaveURL(new RegExp(`/${plural}\\?page=2$`));
    await expect(
      page.getByRole('button', { name: 'Next', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect(page.locator('article')).toHaveCount(20);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.locator('article')).toHaveCount(1);
    await page
      .getByRole('textbox', { name: `Search ${plural}` })
      .fill('missing record');
    await expect(
      page.getByText(
        `No ${plural} found. Try another search or adjust your filters.`,
      ),
    ).toBeVisible();
    expect(
      Object.fromEntries(
        state.requests.filter((r) => r.kind === kind).at(-1)!.params,
      ),
    ).toMatchObject({
      page: '1',
      search: 'missing record',
    });
    await page.getByRole('textbox', { name: `Search ${plural}` }).clear();
    await expect(page.locator('article')).toHaveCount(20);
  });

  test(`${plural}: filters submit IDs and reset pagination, and cancelled drafts are discarded`, async ({
    page,
    controls,
  }) => {
    await session(page);
    const state = await mockCurriculum(page);
    state.count = 21;
    await page.goto(`/${plural}?page=2`);
    await expect(page.locator('article')).toHaveCount(1);
    await page.getByRole('button', { name: /^Filters/ }).click();
    const drawer = page.getByRole('dialog', { name: `Filter ${plural}` });
    await controls.choose('Filter by course', 'Python Basics', drawer);
    await drawer.getByRole('button', { name: 'Close drawer' }).click();
    await page.getByRole('button', { name: /^Filters/ }).click();
    await expect(
      drawer.getByRole('button', { name: 'Filter by course' }),
    ).toContainText('All courses');
    await controls.choose('Filter by course', 'Python Basics', drawer);
    await controls.choose(
      'Instructors',
      'Ada Instructor ada@example.test',
      drawer,
    );
    await controls.choose('Ordering', 'Title: Z–A', drawer);
    if (kind === 'lecture') {
      await controls.choose('Filter by section', 'Introduction', drawer);
      await controls.choose('Filter by lecture type', 'Video', drawer);
      await controls.choose('Filter preview lectures', 'No', drawer);
    }
    await drawer.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.locator('article')).toHaveCount(20);
    expect(
      Object.fromEntries(
        state.requests.filter((r) => r.kind === kind).at(-1)!.params,
      ),
    ).toEqual({
      page: '1',
      course: 'course-1',
      instructor: 'instructor-1',
      ordering: '-title',
      ...(kind === 'lecture'
        ? { section: 'section-1', lecture_type: 'video', is_preview: 'false' }
        : {}),
    });
    await page
      .getByRole('group', { name: `Filter ${plural} by status` })
      .getByRole('button', { name: 'Draft', exact: true })
      .click();
    await expect(page.locator('article')).toHaveCount(0);
    await expect(
      page.getByText(
        `No ${plural} found. Try another search or adjust your filters.`,
      ),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Clear filters', exact: true })
      .click();
    await expect(page.locator('article')).toHaveCount(20);
    await expect(page).toHaveURL(`/${plural}?page=1`);
  });
}
