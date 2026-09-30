import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  couponStatus,
  draftSchema,
  emptyDraft,
  importDraft,
} from '../../src/pages/coupons/model';
import type { Coupon } from '../../src/api/services/coupons';
const course = '711e0b9f-3e61-4c8a-9cb4-a824ae2f47c3';
const draft = { ...emptyDraft(true), code: 'SAVE20', course };
const coupon: Coupon = {
  ...draft,
  id: 'coupon-id',
  course_title: 'Python',
  used: 0,
  deleted_at: null,
  created_at: null,
  updated_at: null,
};
afterEach(() => vi.useRealTimers());

describe('coupon draft validation', () => {
  it('defaults ownership according to the current role', () => {
    expect(emptyDraft(true).is_instructor_created).toBe(false);
    expect(emptyDraft(false).is_instructor_created).toBe(true);
  });
  it('trims coupon codes and permits nullable expiry', () => {
    expect(draftSchema.parse({ ...draft, code: ' SAVE20 ' }).code).toBe(
      'SAVE20',
    );
    expect(draftSchema.parse(draft).expired_at).toBeNull();
  });
  it.each([
    { code: '' },
    { code: 'x'.repeat(101) },
    { course: 'invalid' },
    { course: '', is_global: true },
    { coupon_type: 'Percentage' },
    { value: 2.5 },
    { limit: 1.5 },
    { is_global: 'true' },
    { expired_at: '2026-02-30' },
    { expired_at: 'tomorrow' },
  ])('rejects invalid fields %j', (fields) => {
    expect(draftSchema.safeParse({ ...draft, ...fields }).success).toBe(false);
  });
});

describe('JSON coupon import', () => {
  it('imports the downloadable example but requires a course before saving', () => {
    const example = readFileSync(
      new URL('../../public/templates/coupon.json', import.meta.url),
      'utf8',
    );
    const imported = importDraft(example, true);
    expect(imported.code).toBe('LEARN20');
    expect(imported.course).toBe('');
    expect(draftSchema.safeParse(imported).success).toBe(false);
  });
  it.each([{}, { course: '' }, { course: null }])(
    'allows an unselected course in an imported draft: %j',
    (fields) => {
      const imported = importDraft(
        JSON.stringify({ code: 'SAVE20', ...fields }),
        true,
      );
      expect(imported.course).toBe('');
      expect(draftSchema.safeParse(imported).success).toBe(false);
    },
  );

  it('fills optional defaults and strips backend-managed fields', () => {
    expect(
      importDraft(
        JSON.stringify({
          code: 'SAVE20',
          course,
          used: 900,
          deleted_at: '2026-09-30',
          id: 'ignored',
        }),
        true,
      ),
    ).toEqual(draft);
  });
  it('forces instructor ownership for instructor imports', () => {
    expect(
      importDraft(
        JSON.stringify({ ...draft, is_instructor_created: false }),
        false,
      ).is_instructor_created,
    ).toBe(true);
  });
  it('preserves an admin’s explicit instructor ownership choice', () => {
    expect(
      importDraft(
        JSON.stringify({ ...draft, is_instructor_created: true }),
        true,
      ).is_instructor_created,
    ).toBe(true);
  });
  it.each(['null', '[]', '42', '"coupon"', 'false', '{invalid'])(
    'rejects invalid file contents %s',
    (text) => {
      expect(() => importDraft(text, true)).toThrow();
    },
  );
  it('reports the invalid field name', () => {
    expect(() =>
      importDraft(JSON.stringify({ ...draft, course: 'bad' }), true),
    ).toThrow('course:');
  });
});

describe('coupon status', () => {
  it('prioritizes deletion over expiry and exhaustion', () => {
    expect(
      couponStatus(
        {
          ...coupon,
          deleted_at: '2026-09-01',
          expired_at: '2026-09-01',
          used: 100,
        },
        '2026-09-30',
      ),
    ).toBe('Deleted');
  });
  it('prioritizes expiry over exhaustion', () => {
    expect(
      couponStatus(
        { ...coupon, expired_at: '2026-09-29', used: 100 },
        '2026-09-30',
      ),
    ).toBe('Expired');
  });
  it('remains active on the expiry date', () => {
    expect(
      couponStatus({ ...coupon, expired_at: '2026-09-30' }, '2026-09-30'),
    ).toBe('Active');
  });
  it.each([100, 101])(
    'is exhausted when usage reaches or exceeds the cap (%s)',
    (used) => {
      expect(couponStatus({ ...coupon, used }, '2026-09-30')).toBe('Exhausted');
    },
  );
  it('ignores the cap for unlimited coupons', () => {
    expect(
      couponStatus({ ...coupon, used: 200, is_unlimited: true }, '2026-09-30'),
    ).toBe('Active');
  });
  it('supports coupons with no expiry date', () => {
    expect(couponStatus(coupon, '2026-09-30')).toBe('Active');
  });
  it('uses the current date when no date is supplied', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
    expect(couponStatus({ ...coupon, expired_at: '2026-09-01' })).toBe(
      'Expired',
    );
  });
});
