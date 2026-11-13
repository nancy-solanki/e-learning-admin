import { api } from '../axios';

const root = '/api/v1/enroll/management/';
export type Enrollment = {
  id: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    first_name: string;
    last_name: string;
    avatar: string;
  };
  course: { id: string; title: string; slug: string };
  average_rating: number | null;
  progress: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
export type EnrollmentFilters = {
  search?: string;
  course?: string;
  course_slug?: string;
  user?: string;
  created_at_after?: string;
  created_at_before?: string;
  ordering?:
    | 'created_at'
    | '-created_at'
    | 'user__first_name'
    | '-user__first_name'
    | 'user__last_name'
    | '-user__last_name';
};
type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
export async function listEnrollments(
  filters: EnrollmentFilters,
  page: number,
  signal?: AbortSignal,
) {
  return (
    await api.get<Page<Enrollment>>(root, {
      params: { ...filters, page },
      signal,
    })
  ).data;
}
export async function listCourseEnrollments(
  slug: string,
  filters: EnrollmentFilters,
  page: number,
  signal?: AbortSignal,
) {
  return (
    await api.get<Page<Enrollment>>(
      `/api/v1/enroll/course/${encodeURIComponent(slug)}/`,
      {
        params: { ...filters, page },
        signal,
      },
    )
  ).data;
}
export async function enrollmentDetail(id: string, signal?: AbortSignal) {
  return (
    await api.get<Enrollment>(`${root}${encodeURIComponent(id)}/`, { signal })
  ).data;
}
