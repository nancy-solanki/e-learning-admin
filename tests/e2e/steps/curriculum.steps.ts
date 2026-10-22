import { When, Then, expect } from '../fixtures/test';
import type { Page } from '@playwright/test';
import type { AdminLecture } from '../../../src/api/services/lectures';
import type { AdminSection } from '../../../src/api/services/sections';

type ApiState = {
  section: AdminSection;
  lecture: AdminLecture;
  sectionPatches: Record<string, unknown>[];
  lecturePatches: Record<string, unknown>[];
  methods: string[];
};

const states = new WeakMap<Page, ApiState>();

When('I prepare the admin section and lecture APIs', async ({ page }) => {
  const state: ApiState = {
    section: {
      id: 'section-1',
      instructor: 'john_doe',
      course_title: 'Python Basics',
      created_at: '2026-10-22T10:00:00Z',
      updated_at: null,
      deleted_at: null,
      title: 'Introduction',
      slug: 'introduction',
      description: 'Getting started with Python.',
      status: 'published',
      order: 1,
      course: 'course-1',
    },
    lecture: {
      id: 'lecture-1',
      instructor: 'john_doe',
      course: 'course-1',
      section: 'section-1',
      created_at: '2026-10-22T10:00:00Z',
      updated_at: null,
      deleted_at: null,
      title: 'Welcome to the course',
      slug: 'welcome',
      description: 'A first lesson.',
      status: 'published',
      reject_reason: null,
      order: 1,
      lecture_type: 'video',
      is_preview: false,
      source: 'https://example.test/lesson.mp4',
      thumbnail: null,
      resources: null,
    },
    sectionPatches: [],
    lecturePatches: [],
    methods: [],
  };
  states.set(page, state);
  await page.route('**/api/v1/course/**', (route) => {
    state.methods.push(route.request().method());
    return route.fulfill({
      json: [{ id: 'course-1', title: 'Python Basics' }],
    });
  });
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({
      json: [
        {
          id: 'instructor-1',
          full_name: 'Ada Instructor',
          first_name: 'Ada',
          last_name: 'Instructor',
          username: 'john_doe',
          email: 'ada@example.test',
          role: ['instructor'],
        },
      ],
    }),
  );
  await page.route('**/api/v1/section/instructor/all/**', async (route) => {
    state.methods.push(route.request().method());
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/section/instructor/all/') {
      return route.fulfill({
        json: {
          count: 1,
          next: null,
          previous: null,
          results: [state.section],
        },
      });
    }
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      state.sectionPatches.push(body);
      if (typeof body.status === 'string') {
        state.section.status = body.status as AdminSection['status'];
      }
      return route.fulfill({ json: state.section });
    }
    return route.fulfill({ json: state.section });
  });
  await page.route('**/api/v1/lecture/instructor/all/**', async (route) => {
    state.methods.push(route.request().method());
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/lecture/instructor/all/') {
      return route.fulfill({
        json: {
          count: 1,
          next: null,
          previous: null,
          results: [state.lecture],
        },
      });
    }
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      state.lecturePatches.push(body);
      if (typeof body.status === 'string') {
        state.lecture.status = body.status as AdminLecture['status'];
      }
      if (typeof body.reject_reason === 'string') {
        state.lecture.reject_reason = body.reject_reason;
      }
      return route.fulfill({ json: state.lecture });
    }
    return route.fulfill({ json: state.lecture });
  });
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
