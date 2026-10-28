import type { Page } from '@playwright/test';
import type { Rating, RatingUpdate } from '../../../src/api/services/ratings';

export async function mockRatings(page: Page, count = 21) {
  const state = {
    records: Array.from({ length: count }, (_, i): Rating => ({
      id: `rating-${i + 1}`,
      course: { id: 'course-1', title: 'Python Basics' },
      course_title: 'Python Basics',
      user: { id: `user-${i + 1}`, full_name: `Reviewer ${i + 1}` },
      rating: i === 0 ? 5 : 3,
      comment: `Review ${i + 1}`,
      response: null,
      created_at: '2026-01-15T12:00:00Z',
      updated_at: null,
    })),
    lists: [] as URL[],
    updates: [] as RatingUpdate[],
    deletes: [] as string[],
    failList: false,
    failDetail: false,
    failSave: false,
    failDelete: false,
    failOptions: false,
    holdMutation: undefined as Promise<void> | undefined,
  };
  await page.route('**/api/v1/course/', (route) =>
    route.fulfill(
      state.failOptions
        ? { status: 503, json: {} }
        : {
            json: [{ id: 'course-1', title: 'Python Basics' }],
          },
    ),
  );
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({
      json: [
        {
          id: 'user-1',
          full_name: 'Reviewer 1',
          email: 'reviewer@example.com',
        },
      ],
    }),
  );
  await page.route('**/api/v1/rating/management/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const id = url.pathname.split('/').filter(Boolean)[4];
    const record = state.records.find((item) => item.id === id);
    if (request.method() === 'PATCH') {
      const values = request.postDataJSON() as RatingUpdate;
      state.updates.push(values);
      await state.holdMutation;
      if (state.failSave)
        return route.fulfill({
          status: 400,
          json: { comment: ['Comment rejected.'] },
        });
      if (!record) return route.fulfill({ status: 404, json: {} });
      Object.assign(record, values);
      return route.fulfill({ json: record });
    }
    if (request.method() === 'DELETE') {
      state.deletes.push(id);
      await state.holdMutation;
      if (state.failDelete)
        return route.fulfill({
          status: 503,
          json: { detail: 'Delete unavailable' },
        });
      state.records = state.records.filter((item) => item.id !== id);
      return route.fulfill({ status: 204 });
    }
    if (id)
      return route.fulfill(
        state.failDetail
          ? { status: 503, json: { detail: 'Details unavailable' } }
          : record
            ? { json: record }
            : { status: 404, json: { detail: 'Rating not found' } },
      );
    state.lists.push(url);
    if (state.failList)
      return route.fulfill({
        status: 503,
        json: { detail: 'Ratings unavailable' },
      });
    const params = url.searchParams;
    const search = params.get('search')?.toLowerCase();
    const results = state.records.filter(
      (item) =>
        (!search ||
          `${item.comment} ${item.response}`.toLowerCase().includes(search)) &&
        (!params.has('user') ||
          (typeof item.user === 'object' &&
            item.user?.id === params.get('user'))) &&
        (!params.has('rating') || item.rating === Number(params.get('rating'))),
    );
    if (params.get('ordering') === 'rating')
      results.sort((a, b) => a.rating - b.rating);
    if (params.get('ordering') === '-rating')
      results.sort((a, b) => b.rating - a.rating);
    const current = Number(params.get('page') || 1);
    return route.fulfill({
      json: {
        count: results.length,
        next: current * 20 < results.length ? '?page=2' : null,
        previous: current > 1 ? '?page=1' : null,
        results: results.slice((current - 1) * 20, current * 20),
      },
    });
  });
  return state;
}
