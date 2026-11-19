import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';

export type OrderPerson = {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
};
export type OrderRelation = {
  id: string;
  title?: string;
  code?: string;
} | null;
export type Order = {
  id: string;
  is_free: boolean;
  admin_commission: number | string;
  status: string;
  reject_reason: string | null;
  total_paid: number | string;
  user: OrderPerson;
  instructor: OrderPerson;
  course: OrderRelation;
  coupon: OrderRelation;
  enroll: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
export type OrderFilters = {
  status?: string;
  is_free?: boolean;
  course?: string;
  user?: string;
  instructor?: string;
  coupon?: string;
  total_paid_min?: number;
  total_paid_max?: number;
  created_at_after?: string;
  created_at_before?: string;
  search?: string;
  ordering?: 'created_at' | '-created_at' | 'total_paid' | '-total_paid';
};
export type OrderPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
};

export async function listOrders(
  filters: OrderFilters,
  page: number,
  signal?: AbortSignal,
) {
  return (
    await api.get<OrderPage>(ENDPOINTS.ORDER.LIST, {
      params: { ...filters, page, page_size: 20 },
      signal,
    })
  ).data;
}

export async function getOrder(id: string, signal?: AbortSignal) {
  return (await api.get<Order>(ENDPOINTS.ORDER.DETAIL(id), { signal })).data;
}
