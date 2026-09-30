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
  is_deleted?: boolean;
  ordering: string;
  page: number;
  page_size: number;
};
export async function listCoupons(params: CouponFilters, signal?: AbortSignal) {
  return (
    await api.get<CouponPage>(ENDPOINTS.COUPON.MANAGEMENT, { params, signal })
  ).data;
}
export async function getCoupon(id: string) {
  return (await api.get<Coupon>(ENDPOINTS.COUPON.DETAIL(id))).data;
}
export async function saveCoupon(body: Partial<CouponDraft>, id?: string) {
  return (
    await api.request<Coupon>({
      url: id ? ENDPOINTS.COUPON.DETAIL(id) : ENDPOINTS.COUPON.MANAGEMENT,
      method: id ? 'PATCH' : 'POST',
      data: body,
    })
  ).data;
}
export async function toggleCoupon(id: string) {
  // DELETE toggles state, so even authentication retries must be disabled.
  return (
    await api.delete<{ message: string }>(ENDPOINTS.COUPON.DETAIL(id), {
      skipAuthRetry: true,
    } as AxiosRequestConfig & { skipAuthRetry: boolean })
  ).data;
}
