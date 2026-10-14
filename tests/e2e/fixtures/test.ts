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
