import { When, Then, expect } from '../fixtures/test';
import type { Page } from '@playwright/test';
import { mockCurriculum, type ApiState } from '../support/curriculum-api';

const states = new WeakMap<Page, ApiState>();

When('I prepare the admin section and lecture APIs', async ({ page }) => {
  states.set(page, await mockCurriculum(page));
});

Then(
  'there are no create, edit, delete, or restore actions',
  async ({ page }) => {
    await expect(
      page.getByRole('button', {
        name: /\b(create|add|edit|delete|restore)\b/i,
      }),
    ).toHaveCount(0);
  },
);

Then(
  'the {word} filters are available in a drawer',
  async ({ page }, kind: string) => {
    const plural = kind === 'section' ? 'sections' : 'lectures';
    await page.getByRole('button', { name: 'Filters' }).click();
    const drawer = page.getByRole('dialog', { name: `Filter ${plural}` });
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole('button', { name: 'Filter by course' }),
    ).toBeVisible();
    await expect(
      drawer.getByRole('button', { name: 'Instructors' }),
    ).toBeVisible();
    await expect(
      drawer.getByLabel('curriculum-filter-course-slug'),
    ).toHaveCount(0);
    await expect(
      drawer.getByLabel('curriculum-filter-section-slug'),
    ).toHaveCount(0);
    await drawer.getByRole('button', { name: 'Instructors' }).click();
    await expect(
      page.getByRole('option', { name: 'Ada Instructor ada@example.test' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await drawer.getByRole('button', { name: 'Close drawer' }).click();
  },
);

Then('{word} status filters are available', async ({ page }, kind: string) => {
  const group = page.getByRole('group', {
    name: `Filter ${kind === 'section' ? 'sections' : 'lectures'} by status`,
  });
  await expect(
    group.getByRole('button', { name: 'All statuses' }),
  ).toBeVisible();
  await expect(group.getByRole('button', { name: 'Published' })).toBeVisible();
  await expect(group.getByRole('button', { name: 'Draft' })).toBeVisible();
  await expect(group.getByRole('button', { name: 'Rejected' })).toBeVisible();
  await expect(group.getByRole('button', { name: 'Approved' })).toHaveCount(0);
});

Then(
  'admin navigation omits the All Sections and All Lectures links',
  async ({ page }) => {
    const navigation = page.getByRole('navigation', {
      name: 'Main navigation',
    });
    await expect(
      navigation.getByRole('link', { name: 'All Sections' }),
    ).toHaveCount(0);
    await expect(
      navigation.getByRole('link', { name: 'All Lectures' }),
    ).toHaveCount(0);
    await expect(
      navigation.getByRole('link', {
        name: /^(Published|Draft|Rejected) Lectures$/,
      }),
    ).toHaveCount(0);
  },
);

When(
  'I change section status to {string}',
  async ({ page, controls }, status: string) => {
    await page.getByRole('button', { name: 'View details' }).first().click();
    const details = page.getByRole('dialog', { name: 'Introduction' });
    await expect(details).not.toContainText('course-1');
    await expect(details).not.toContainText('section-1');
    await expect(details).toContainText('Python Basics');
    await expect(details).toContainText('Ada Instructor');
    await details.getByRole('button', { name: 'Change status' }).click();
    const moderation = page.getByRole('dialog', {
      name: 'Change publication status',
    });
    await controls.choose('New status', status, moderation);
    await moderation.getByRole('button', { name: 'Change status' }).click();
  },
);

Then('the section status is {string}', async ({ page }, status: string) => {
  await expect(
    page.locator('article').getByText(status, { exact: true }),
  ).toBeVisible();
});

Then('the section patch contains only status', async ({ page }) => {
  expect(states.get(page)?.sectionPatches).toEqual([{ status: 'draft' }]);
});

When(
  'I reject the lecture with reason {string}',
  async ({ page, controls }, reason: string) => {
    await page.getByRole('button', { name: 'View details' }).first().click();
    const details = page.getByRole('dialog', {
      name: 'Welcome to the course',
    });
    await expect(details).not.toContainText('course-1');
    await expect(details).not.toContainText('section-1');
    await expect(details).toContainText('Python Basics');
    await expect(details).toContainText('Ada Instructor');
    await details.getByRole('button', { name: 'Change status' }).click();
    const moderation = page.getByRole('dialog', {
      name: 'Change publication status',
    });
    await controls.choose('New status', 'Rejected', moderation);
    await moderation.getByLabel('Rejection reason (optional)').fill(reason);
    await moderation.getByRole('button', { name: 'Change status' }).click();
  },
);

Then('the lecture status is {string}', async ({ page }, status: string) => {
  await expect(
    page.locator('article').getByText(status, { exact: true }),
  ).toBeVisible();
});

Then(
  'the lecture patch contains only status and rejection reason',
  async ({ page }) => {
    expect(states.get(page)?.lecturePatches).toEqual([
      { status: 'rejected', reject_reason: 'Improve the audio quality.' },
    ]);
    expect(
      states
        .get(page)
        ?.methods.some((method) => ['POST', 'PUT', 'DELETE'].includes(method)),
    ).toBe(false);
  },
);
