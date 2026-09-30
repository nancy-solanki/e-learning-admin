import { z } from 'zod';
import type { Coupon, CouponDraft } from '../../api/services/coupons';
export const draftSchema = z.object({
  code: z.string().trim().min(1, 'Enter a coupon code.').max(100),
  course: z.uuid('Select a course.'),
  coupon_type: z.enum(['percentage', 'fixed']),
  value: z.number().int(),
  limit: z.number().int(),
  is_unlimited: z.boolean(),
  is_global: z.boolean(),
  is_instructor_created: z.boolean(),
  expired_at: z.iso.date().nullable(),
});
export function emptyDraft(admin: boolean): CouponDraft {
  return {
    code: '',
    course: '',
    coupon_type: 'percentage',
    value: 10,
    limit: 100,
    is_unlimited: false,
    is_global: false,
    is_instructor_created: !admin,
    expired_at: null,
  };
}
export function importDraft(text: string, admin: boolean): CouponDraft {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Choose a JSON file containing one coupon object.');
  const result = draftSchema
    .extend({
      course: z
        .union([z.uuid('Select a course.'), z.literal('')])
        .nullable()
        .transform((value) => value ?? ''),
    })
    .safeParse({ ...emptyDraft(admin), ...parsed });
  if (!result.success)
    throw new Error(
      result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(' '),
    );
  return {
    ...result.data,
    is_instructor_created: admin ? result.data.is_instructor_created : true,
  };
}
export function couponStatus(
  coupon: Coupon,
  today = new Date().toLocaleDateString('en-CA'),
) {
  if (coupon.deleted_at) return 'Deleted';
  if (coupon.expired_at && coupon.expired_at < today) return 'Expired';
  if (!coupon.is_unlimited && coupon.used >= coupon.limit) return 'Exhausted';
  return 'Active';
}
