import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function mockCoupons(page: Page) {
  let coupon = {
    id: 'coupon-id',
    code: 'LEARN20',
    course: '711e0b9f-3e61-4c8a-9cb4-a824ae2f47c3',
    course_title: 'Python Basics',
    coupon_type: 'percentage',
    value: 20,
    limit: 100,
    used: 5,
    is_unlimited: false,
    is_global: false,
    is_instructor_created: false,
    expired_at: '2099-12-31',
    deleted_at: null as string | null,
    created_at: null,
    updated_at: null,
  };
  await page.route('**/api/v1/course/**', (route) =>
    route.fulfill({
      json: {
        results: [{ id: coupon.course, title: coupon.course_title }],
        next: null,
      },
    }),
  );
  let exists = false;
  let deletes = 0;
  await page.route('**/api/v1/coupon/management/**', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      expect(req.postDataJSON().is_instructor_created).toBe(false);
      coupon = { ...coupon, ...req.postDataJSON() };
      exists = true;
      return route.fulfill({ status: 201, json: coupon });
    }
    if (req.method() === 'PATCH') {
      expect(req.postDataJSON()).toEqual({ value: 25 });
      coupon = { ...coupon, ...req.postDataJSON() };
      return route.fulfill({ json: coupon });
    }
    if (req.method() === 'DELETE') {
      deletes++;
      coupon.deleted_at = coupon.deleted_at ? null : '2026-09-30';
      return route.fulfill({
        json: {
          message: coupon.deleted_at
            ? 'Coupon deleted successfully'
            : 'Coupon activated successfully',
        },
      });
    }
    if (new URL(req.url()).pathname.endsWith('/coupon-id/'))
      return route.fulfill({ json: coupon });
    const deleted = new URL(req.url()).searchParams.get('is_deleted');
    const results =
      exists && (deleted === null || String(!!coupon.deleted_at) === deleted)
        ? [coupon]
        : [];
    return route.fulfill({
      json: { count: results.length, next: null, previous: null, results },
    });
  });

  return {
    get coupon() {
      return coupon;
    },
    get exists() {
      return exists;
    },
    get deletes() {
      return deletes;
    },
  };
}
