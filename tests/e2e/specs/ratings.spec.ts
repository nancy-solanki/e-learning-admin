import { test, expect } from '../fixtures/test';
import { session, sessionAs } from '../support/session';
import { mockRatings } from '../support/ratings-api';

for (const role of ['anonymous', 'instructor', 'learner']) {
  test(`${role} cannot access ratings or request management data`, async ({
    page,
    controls,
  }) => {
    await sessionAs(page, role);
    const state = await mockRatings(page);
    await page.goto('/ratings');
    await expect(page).toHaveURL(
      role === 'anonymous' ? /\/auth\/sign-in/ : /\/$/,
    );
    await controls.openNavigation();
    await expect(
      page.getByRole('link', { name: 'Ratings', exact: true }),
    ).toHaveCount(0);
    expect(state.lists).toHaveLength(0);
  });
}

test('ratings navigation, server pagination, search and empty results', async ({
  page,
  controls,
}) => {
  await session(page);
  const state = await mockRatings(page);
  await page.goto('/');
  await controls.openNavigation();
  await page.getByRole('link', { name: 'Ratings', exact: true }).click();
  await expect(page.getByRole('row')).toHaveCount(21);
  await expect(
    page.getByRole('button', { name: 'Previous', exact: true }),
  ).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: 'Reviewer 21', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Next', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(page.getByRole('row')).toHaveCount(21);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Showing 21–21 of 21')).toBeVisible();
  await page.getByLabel('Search ratings').fill('  Review 1  ');
  await expect(page.getByRole('row')).toHaveCount(12);
  await expect
    .poll(() => state.lists.at(-1)?.searchParams.get('search'))
    .toBe('Review 1');
  expect(state.lists.at(-1)?.searchParams.get('page')).toBe('1');
  await page.getByLabel('Search ratings').fill('missing');
  await expect(
    page.getByRole('heading', { name: 'No ratings found' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
  await expect(page.getByRole('row')).toHaveCount(21);
});

test('rating filters send IDs, scores, dates and ordering and reset pagination', async ({
  page,
  controls,
}) => {
  await session(page);
  const state = await mockRatings(page);
  await page.goto('/ratings');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Showing 21–21 of 21')).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Filter ratings' });
  await controls.choose('Course', 'Python Basics', drawer);
  await controls.choose('Reviewer', 'Reviewer 1 reviewer@example.com', drawer);
  await drawer.getByLabel('Filter by exact rating').fill('5');
  await drawer.getByLabel('Filter by minimum rating').fill('0');
  await drawer.getByLabel('Filter by maximum rating').fill('5');
  await drawer.getByLabel('Filter ratings created after').fill('2026-01-01');
  await drawer.getByLabel('Filter ratings created before').fill('2026-02-01');
  await controls.choose('Sort ratings', 'Highest rating', drawer);
  await drawer.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('row')).toHaveCount(2);
  expect(Object.fromEntries(state.lists.at(-1)!.searchParams)).toEqual({
    page: '1',
    course: 'course-1',
    user: 'user-1',
    rating: '5',
    rating_min: '0',
    rating_max: '5',
    created_at_after: '2026-01-01',
    created_at_before: '2026-02-01',
    ordering: '-rating',
  });
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(drawer.getByLabel('Filter by exact rating')).toHaveValue('5');
  await drawer.getByRole('button', { name: 'Reset filters' }).click();
  await drawer.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('row')).toHaveCount(21);
  await expect(
    page.getByRole('button', { name: 'Clear filters', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Previous', exact: true }),
  ).toBeDisabled();
});

for (const [label, ordering] of [
  ['Oldest first', 'created_at'],
  ['Lowest rating', 'rating'],
  ['Newest first', '-created_at'],
]) {
  test(`ratings sort by ${label}`, async ({ page, controls }) => {
    await session(page);
    const state = await mockRatings(page);
    await page.goto('/ratings');
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await controls.choose('Sort ratings', label);
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect
      .poll(() => state.lists.at(-1)?.searchParams.get('ordering'))
      .toBe(ordering);
    if (ordering === 'rating')
      await expect(page.getByRole('row').nth(1)).toContainText('Reviewer 2');
  });
}

test('list and detail errors recover, and missing comments have explicit fallbacks', async ({
  page,
}) => {
  await session(page);
  const state = await mockRatings(page, 1);
  state.failList = true;
  state.records[0].comment = null;
  await page.goto('/ratings');
  await expect(page.getByRole('alert')).toHaveText('Ratings unavailable');
  state.failList = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  state.failDetail = true;
  await page
    .getByRole('button', { name: 'View rating by Reviewer 1', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toHaveText('Details unavailable');
  state.failDetail = false;
  await dialog.getByRole('button', { name: 'Try again' }).click();
  await expect(
    dialog.getByText('Python Basics', { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText('No comment', { exact: true })).toBeVisible();
  await expect(dialog.getByText('No response', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('edit failure retains draft, retries save only text fields and supports clearing', async ({
  page,
}) => {
  await session(page);
  const state = await mockRatings(page, 1);
  await page.goto('/ratings');
  await page
    .getByRole('button', { name: 'View rating by Reviewer 1', exact: true })
    .click();
  await page.getByRole('button', { name: 'Edit rating', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit rating', exact: true });
  await dialog.getByLabel('Rating comment').fill('  Updated review  ');
  await dialog.getByLabel('Instructor response').fill('  Thank you  ');
  state.failSave = true;
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog.getByRole('alert')).toHaveText([
    'Comment rejected.',
    'Comment rejected.',
  ]);
  await expect(dialog.getByLabel('Rating comment')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(dialog.getByLabel('Rating comment')).toHaveValue(
    '  Updated review  ',
  );
  await expect(dialog.getByLabel('Instructor response')).toHaveValue(
    '  Thank you  ',
  );
  state.failSave = false;
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.updates.at(-1)).toEqual({
    comment: 'Updated review',
    response: 'Thank you',
  });
  await expect(
    page.getByRole('cell', { name: 'Updated review', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'View rating by Reviewer 1', exact: true })
    .click();
  await expect(
    page.getByRole('dialog').getByText('Thank you', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit rating', exact: true }).click();
  await dialog.getByLabel('Rating comment').fill(' ');
  await dialog.getByLabel('Instructor response').fill('');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.updates.at(-1)).toEqual({ comment: null, response: null });
});

test('keyboard cancellation restores focus and discards edit and filter drafts', async ({
  page,
  controls,
}) => {
  await session(page);
  const state = await mockRatings(page, 1);
  await page.goto('/ratings');
  const edit = page.getByRole('button', {
    name: 'Edit rating by Reviewer 1',
    exact: true,
  });
  await edit.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await dialog.getByLabel('Rating comment').fill('Discard this');
  await dialog.getByRole('button', { name: 'Save changes' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(edit).toBeFocused();
  await edit.click();
  await expect(dialog.getByLabel('Rating comment')).toHaveValue('Review 1');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(state.updates).toHaveLength(0);
  const filters = page.getByRole('button', { name: 'Filters', exact: true });
  await filters.click();
  await dialog.getByLabel('Filter by exact rating').fill('1');
  await page.keyboard.press('Escape');
  await expect(filters).toBeFocused();
  await filters.click();
  await expect(dialog.getByLabel('Filter by exact rating')).toHaveValue('');
  await controls.expectResponsive();
});

test('delete cancellation, failure and retry preserve records until success', async ({
  page,
}) => {
  await session(page);
  const state = await mockRatings(page, 1);
  await page.goto('/ratings');
  const remove = page.getByRole('button', {
    name: 'Delete rating by Reviewer 1',
    exact: true,
  });
  await remove.click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(remove).toBeFocused();
  expect(state.deletes).toHaveLength(0);
  await page
    .getByRole('button', { name: 'View rating by Reviewer 1', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Delete rating', exact: true })
    .click();
  state.failDelete = true;
  await dialog
    .getByRole('button', { name: 'Delete rating', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toHaveText('Delete unavailable');
  expect(state.records).toHaveLength(1);
  state.failDelete = false;
  await dialog
    .getByRole('button', { name: 'Delete rating', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'No ratings found' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText(
    'Rating deleted successfully.',
  );
});

test('deleting the last rating on page two returns to the previous page', async ({
  page,
}) => {
  await session(page);
  await mockRatings(page);
  await page.goto('/ratings');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete rating by Reviewer 21', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete rating', exact: true })
    .click();
  await expect(page.getByText('Showing 1–20 of 20')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Next', exact: true }),
  ).toBeDisabled();
});

for (const action of ['save', 'delete']) {
  test(`pending ${action} prevents duplicate submission and dismissal`, async ({
    page,
  }) => {
    await session(page);
    const state = await mockRatings(page, 1);
    let release!: () => void;
    state.holdMutation = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.goto('/ratings');
    await page
      .getByRole('button', {
        name: `${action === 'save' ? 'Edit' : 'Delete'} rating by Reviewer 1`,
        exact: true,
      })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', {
        name: action === 'save' ? 'Save changes' : 'Delete rating',
        exact: true,
      })
      .click();
    try {
      await expect(
        dialog.getByRole('button', {
          name: action === 'save' ? 'Saving…' : 'Deleting…',
        }),
      ).toBeDisabled();
      await expect(
        dialog.getByRole('button', { name: 'Cancel', exact: true }),
      ).toBeDisabled();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeVisible();
      await expect
        .poll(() =>
          action === 'save' ? state.updates.length : state.deletes.length,
        )
        .toBe(1);
    } finally {
      release();
    }
    await expect(dialog).toHaveCount(0);
  });
}

test('failed course options can be retried in the filter drawer', async ({
  page,
  controls,
}) => {
  await session(page);
  const state = await mockRatings(page, 0);
  state.failOptions = true;
  await page.goto('/ratings');
  await expect(
    page.getByRole('heading', { name: 'No ratings found' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText(
    'Could not load course.',
  );
  await expect(
    dialog.getByRole('button', { name: 'Course', exact: true }),
  ).toBeDisabled();
  state.failOptions = false;
  await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
  await controls.choose('Course', 'Python Basics', dialog);
  await expect(dialog.getByRole('alert')).toHaveCount(0);
});
