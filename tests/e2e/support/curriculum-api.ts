import type { Page } from '@playwright/test';
import type { AdminLecture } from '../../../src/api/services/lectures';
import type { AdminSection } from '../../../src/api/services/sections';

export type ApiState = {
  section: AdminSection;
  lecture: AdminLecture;
  sectionPatches: Record<string, unknown>[];
  lecturePatches: Record<string, unknown>[];
  methods: string[];
  failList: string | null;
  failDetail: boolean;
  failPatch: boolean;
  count: number;
  requests: { kind: string; params: URLSearchParams }[];
};

export async function mockCurriculum(page: Page) {
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
    failList: null,
    failDetail: false,
    failPatch: false,
    count: 1,
    requests: [],
  };
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
  for (const kind of ['section', 'lecture'] as const) {
    const endpoint = `/api/v1/${kind}/instructor/all/`;
    await page.route(`**${endpoint}**`, async (route) => {
      const request = route.request();
      state.methods.push(request.method());
      const url = new URL(request.url());
      const record = state[kind];
      if (url.pathname === endpoint) {
        state.requests.push({ kind, params: url.searchParams });
        if (state.failList === kind) {
          return route.fulfill({
            status: 503,
            json: { detail: 'Curriculum unavailable' },
          });
        }
        const search = url.searchParams.get('search')?.toLowerCase();
        const status = url.searchParams.get('status');
        const count =
          (search && !record.title.toLowerCase().includes(search)) ||
          (status && status !== record.status)
            ? 0
            : state.count;
        const pageNumber = Number(url.searchParams.get('page') || 1);
        const records = Array.from({ length: count }, (_, i) => ({
          ...record,
          title: i === 0 ? record.title : `${record.title} ${i + 1}`,
          id: i === 0 ? record.id : `${kind}-${i + 1}`,
        }));
        return route.fulfill({
          json: {
            count,
            next:
              pageNumber * 20 < count
                ? `${endpoint}?page=${pageNumber + 1}`
                : null,
            previous:
              pageNumber > 1 ? `${endpoint}?page=${pageNumber - 1}` : null,
            results: records.slice((pageNumber - 1) * 20, pageNumber * 20),
          },
        });
      }
      if (request.method() === 'PATCH') {
        const body = request.postDataJSON() as Record<string, unknown>;
        state[kind === 'section' ? 'sectionPatches' : 'lecturePatches'].push(
          body,
        );
        if (state.failPatch) {
          return route.fulfill({
            status: 400,
            json: { detail: 'Status update failed' },
          });
        }
        if (typeof body.status === 'string')
          record.status = body.status as AdminSection['status'];
        if (kind === 'lecture' && typeof body.reject_reason === 'string') {
          state.lecture.reject_reason = body.reject_reason;
        }
        return route.fulfill({ json: record });
      }
      if (state.failDetail) {
        return route.fulfill({
          status: 503,
          json: { detail: 'Details unavailable' },
        });
      }
      return route.fulfill({ json: record });
    });
  }
  return state;
}
