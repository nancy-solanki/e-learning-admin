import type { mockCoupons } from '../support/coupons-api';
import type { mockProfile } from '../support/profile-api';
import { test as base, createBdd } from 'playwright-bdd';
import { expect, type Download } from '@playwright/test';
import { PreviewPages } from '../pages/preview-pages';
import { Controls } from '../pages/controls';

// Everything here is test-scoped: retries, workers and scenarios never share state.
export const test = base.extend<{
  apiState: {
    coupon?: Awaited<ReturnType<typeof mockCoupons>>;
    profile?: Awaited<ReturnType<typeof mockProfile>>;
  };
  controls: Controls;
  preview: PreviewPages;
  downloads: { latest?: Download };
  authRequests: { activation?: unknown };
}>({
  page: async ({ page, context }, provide) => {
    const unmocked: string[] = [];
    await context.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/v1/auth/csrf/') {
        await route.fulfill({ json: { csrfToken: 'csrf' } });
      } else if (
        ['/api/v1/users/me/', '/api/v1/auth/refresh/'].includes(path)
      ) {
        await route.fulfill({ status: 401, json: {} });
      } else if (path === '/api/v1/dashboard/instructor/') {
        await route.fulfill({
          json: {
            instructor: { first_name: 'Grace' },
            metrics: {
              published_courses: 0,
              total_students: 0,
              average_rating: null,
              new_students_30d: 0,
            },
            enrollment_trend: [],
            course_earnings: [],
            currency: 'INR',
            top_courses: [],
            recent_ratings: [],
          },
        });
      } else if (path === '/api/v1/wallet/overview/') {
        await route.fulfill({
          json: {
            currency: 'INR',
            as_of: '2026-11-15T00:00:00Z',
            history_started_at: '2026-01-01T00:00:00Z',
            history_complete: true,
            opening_balance: '0.00',
            period: {
              start: '2026-11-01',
              end: '2026-11-15',
              timezone: 'UTC',
            },
            summary: {
              available_balance: '0.00',
              period_earnings: '0.00',
              completed_payouts: '0.00',
              refunds: '0.00',
              earning_count: 0,
              completed_payout_count: 0,
              refund_count: 0,
              pending_payout_amount: '0.00',
              pending_payout_count: 0,
              latest_pending_payout_at: null,
            },
            payout_account: null,
          },
        });
      } else if (path === '/api/v1/wallet/transactions/') {
        await route.fulfill({
          json: { count: 0, next: null, previous: null, results: [] },
        });
      } else {
        unmocked.push(`${route.request().method()} ${path}`);
        await route.fulfill({
          status: 503,
          json: { detail: 'Unmocked E2E request' },
        });
      }
    });
    await provide(page);
    expect(unmocked, 'Every API request must have an explicit mock').toEqual(
      [],
    );
  },
  apiState: async ({ page }, provide) => {
    void page;
    await provide({});
  },
  controls: async ({ page }, provide) => {
    await provide(new Controls(page));
  },
  preview: async ({ page, controls }, provide) => {
    await provide(new PreviewPages(page, controls));
  },
  authRequests: async ({ page }, provide) => {
    void page;
    await provide({});
  },
  downloads: async ({ page }, provide) => {
    // Depend on page so download state has the same lifetime as the browser page.
    void page;
    await provide({});
  },
});
export { expect };
export const { Given, When, Then } = createBdd(test);
