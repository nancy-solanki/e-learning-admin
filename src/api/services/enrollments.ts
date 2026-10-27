import axios from 'axios';
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
    email: string;
    avatar: string;
  };
  course: { id: string; title: string; slug: string };
  created_at: string | null;
  total_lessons: number;
  completed_lessons: number | null;
  progress: number | null;
  status: string;
  access: string | null;
  progress_tracking_available: boolean;
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
export type EnrollmentSummary = {
  total_enrollments: number;
  in_progress: number | null;
  completed: number | null;
  not_started: number | null;
  unknown: number;
  progress_tracking_available: boolean;
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
export async function enrollmentSummary(
  filters: EnrollmentFilters,
  signal?: AbortSignal,
) {
  return (
    await api.get<EnrollmentSummary>(`${root}summary/`, {
      params: filters,
      signal,
    })
  ).data;
}
export async function enrollmentCourses(signal?: AbortSignal) {
  const courses: Enrollment['course'][] = [];
  let page = 1;
  while (true) {
    const { data } = await api.get<Page<Enrollment['course']>>(
      `${root}courses/`,
      { params: { page }, signal },
    );
    courses.push(...data.results);
    if (!data.next) return courses;
    page += 1;
  }
}
export async function enrollmentDetail(id: string, signal?: AbortSignal) {
  return (
    await api.get<Enrollment>(`${root}${encodeURIComponent(id)}/`, { signal })
  ).data;
}
export async function exportEnrollments(
  filters: EnrollmentFilters,
  signal?: AbortSignal,
) {
  try {
    return (
      await api.get<Blob>(`${root}export/`, {
        params: filters,
        responseType: 'blob',
        signal,
      })
    ).data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        /* Keep the original HTTP error. */
      }
    }
    throw error;
  }
}
