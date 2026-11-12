import type { AxiosRequestConfig } from 'axios';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
export type CouponDraft = {
  code: string;
  course: string;
  coupon_type: 'percentage' | 'fixed';
  value: number;
  limit: number;
  is_unlimited: boolean;
  is_global: boolean;
  is_instructor_created: boolean;
  expired_at: string | null;
};
export type Coupon = CouponDraft & {
  id: string;
  course_title: string;
  used: number;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
export type CouponPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Coupon[];
};
export type CouponFilters = {
  search?: string;
  coupon_type?: string;
  course?: string;
  is_global?: boolean;
  is_unlimited?: boolean;
  expired_at_after?: string;
  expired_at_before?: string;
  value_min?: number;
  value_max?: number;
  ordering: string;
  page: number;
  page_size: number;
};
type CouponScope = 'admin' | 'instructor';
function couponEndpoint(_scope: CouponScope, id?: string) {
  return id
    ? ENDPOINTS.COUPON.DETAIL(id)
    : ENDPOINTS.COUPON.MANAGEMENT;
}
export async function listCoupons(
  params: CouponFilters,
  signal?: AbortSignal,
  scope: CouponScope = 'admin',
) {
  return (
    await api.get<CouponPage>(couponEndpoint(scope), { params, signal })
  ).data;
}
export async function listCouponsNext(next: string, signal?: AbortSignal) {
  const base = api.defaults.baseURL ?? 'http://localhost';
  const url = new URL(next, base);
  if (
    url.origin !== new URL(base).origin ||
    !url.pathname.startsWith('/api/v1/coupon/management/')
  ) {
    throw new Error('Invalid coupon pagination URL.');
  }
  return (await api.get<CouponPage>(`${url.pathname}${url.search}`, { signal }))
    .data;
}
export async function getCoupon(id: string, scope: CouponScope = 'admin') {
  return (await api.get<Coupon>(couponEndpoint(scope, id))).data;
}
export async function saveCoupon(
  body: Partial<CouponDraft>,
  id?: string,
  scope: CouponScope = 'admin',
) {
  const payload = { ...body };
  if (scope === 'instructor') delete payload.is_instructor_created;
  return (
    await api.request<Coupon>({
      url: couponEndpoint(scope, id),
      method: id ? 'PATCH' : 'POST',
      data: payload,
    })
  ).data;
}
export async function replaceCoupon(
  body: Partial<CouponDraft>,
  id: string,
  scope: CouponScope = 'admin',
) {
  const payload = { ...body };
  if (scope === 'instructor') delete payload.is_instructor_created;
  return (
    await api.put<Coupon>(couponEndpoint(scope, id), payload)
  ).data;
}
export async function updateCoupon(
  body: Partial<CouponDraft>,
  id: string,
  scope: CouponScope = 'admin',
) {
  return saveCoupon(body, id, scope);
}
export async function toggleCoupon(id: string, scope: CouponScope = 'admin') {
  // DELETE toggles state, so even authentication retries must be disabled.
  return (
    await api.delete<{ message: string }>(couponEndpoint(scope, id), {
      skipAuthRetry: true,
    } as AxiosRequestConfig & { skipAuthRetry: boolean })
  ).data;
}
