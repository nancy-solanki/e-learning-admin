import type { Page } from '@playwright/test';
import type { AdminCourse } from '../../../src/api/services/courses';

export const courseEndpoint = '/api/v1/course/instructor/all/';
export const courses: AdminCourse[] = Array.from({ length: 21 }, (_, i) => ({
  id: `course-${i + 1}`,
  title: `Course ${String(i + 1).padStart(2, '0')}`,
  slug: `course-${i + 1}`,
  short_description: 'Practical learning',
  long_description: 'Complete lessons with hands-on exercises.',
  status: i === 0 ? 'draft' : 'published',
  price: i === 0 ? 0 : 50,
  is_free: i === 0,
  is_best_seller: i === 1,
  deleted_at: i === 2 ? '2026-01-01' : null,
  created_at: '2026-01-01',
  updated_at: null,
  reject_reason: null,
  learn_description_points: 'Build practical skills',
  requirements: 'No experience required',
  total_hours: '2',
  total_articles: 4,
  thumbnail: i === 0 ? 'thumbnail-file-id' : null,
  instructor: 'instructor-1',
  categories: ['category-1'],
  tags: [],
  student_count: 10,
}));

export async function mockCourses(page: Page) {
  const requests: URLSearchParams[] = [];
  const patchBodies: unknown[] = [];
  const methods: string[] = [];
  const state = { fail: false, requests, patchBodies, methods };
  const records = courses.map((course) => ({ ...course }));
  await page.route('**/api/v1/category/**', (route) =>
    route.fulfill({
      json: {
        results: [{ id: 'category-1', title: 'Development' }],
        next: null,
      },
    }),
  );
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({
      json: [
        {
          id: 'instructor-1',
          full_name: 'Ada Instructor',
          email: 'ada@example.com',
          role: ['instructor'],
        },
      ],
    }),
  );
  await page.route(`**${courseEndpoint}**`, (route) => {
    const request = route.request();
    methods.push(request.method());
    const url = new URL(request.url());
    const params = url.searchParams;
    const endpointPath = new URL(courseEndpoint, url.origin).pathname;
    if (url.pathname !== endpointPath) {
      const id = decodeURIComponent(
        url.pathname.slice(endpointPath.length).replace(/\/$/, ''),
      );
      const course = records.find((record) => record.id === id);
      if (!course)
        return route.fulfill({ status: 404, json: { detail: 'Not found' } });
      if (request.method() === 'PATCH') {
        const body = request.postDataJSON() as Record<string, unknown>;
        patchBodies.push(body);
        if (typeof body.status === 'string') {
          course.status = body.status as AdminCourse['status'];
        }
        if (typeof body.reject_reason === 'string') {
          course.reject_reason = body.reject_reason;
        }
        return route.fulfill({ json: course });
      }
      return route.fulfill({ json: course });
    }
    requests.push(params);
    if (state.fail)
      return route.fulfill({
        status: 503,
        json: { detail: 'Course service unavailable' },
      });
    let results = records.filter(
      (course) =>
        (!params.get('search') ||
          course.title
            .toLowerCase()
            .includes(params.get('search')!.toLowerCase())) &&
        (!params.get('status') || course.status === params.get('status')) &&
        (!params.has('is_free') ||
          String(course.is_free) === params.get('is_free')) &&
        (!params.has('is_best_seller') ||
          String(course.is_best_seller) === params.get('is_best_seller')) &&
        (!params.has('price_min') ||
          course.price >= Number(params.get('price_min'))) &&
        (!params.has('price_max') ||
          course.price <= Number(params.get('price_max'))),
    );
    if (params.get('ordering') === '-title') results = [...results].reverse();
    const count = results.length;
    const number = Number(params.get('page') || 1);
    return route.fulfill({
      json: {
        count,
        next:
          number * 20 < count ? `${courseEndpoint}?page=${number + 1}` : null,
        previous: number > 1 ? `${courseEndpoint}?page=${number - 1}` : null,
        results: results.slice((number - 1) * 20, number * 20),
      },
    });
  });
  return state;
}
