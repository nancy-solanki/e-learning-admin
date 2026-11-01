import { api } from '../axios';
import { API_ROOT } from '../config';
import { ENDPOINTS } from '../endpoints';

export type CourseOption = { id: string; title: string };
type CoursePage =
  CourseOption[] | { results: CourseOption[]; next?: string | null };

export async function listCourseOptions(
  signal?: AbortSignal,
): Promise<CourseOption[]> {
  const courses: CourseOption[] = [];
  const base = new URL(
    API_ROOT || window.location.origin,
    window.location.origin,
  );
  let next: string | null = ENDPOINTS.COURSE.LIST;
  const visited = new Set<string>();
  while (next) {
    const url: URL = new URL(next, base);
    if (
      url.origin !== base.origin ||
      url.pathname !== ENDPOINTS.COURSE.LIST ||
      visited.has(url.href)
    ) {
      throw new Error('Invalid course pagination URL.');
    }
    visited.add(url.href);
    const { data }: { data: CoursePage } = await api.get<CoursePage>(url.href, {
      signal,
    });
    courses.push(...(Array.isArray(data) ? data : data.results));
    next = Array.isArray(data) ? null : (data.next ?? null);
  }
  return courses.sort((a, b) => a.title.localeCompare(b.title));
}

export type CourseStatus =
  'published' | 'in-review' | 'approved' | 'draft' | 'rejected';
export interface AdminCourse {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  title: string;
  slug: string | null;
  short_description: string;
  long_description: string;
  is_free: boolean;
  price: number;
  status: CourseStatus;
  reject_reason: string | null;
  is_best_seller: boolean;
  learn_description_points: string;
  requirements: string;
  total_hours: string;
  total_articles: number;
  localization?: string | null;
  thumbnail: { id: string; url: string; name: string } | null;
  instructor: string | null;
  categories: string[];
  tags: { id: string; name: string; slug: string }[];
  student_count: number;
}
export interface AdminCourseFilters {
  page?: number | 'last';
  search?: string;
  status?: CourseStatus;
  category?: string;
  instructor?: string;
  price_min?: number;
  price_max?: number;
  is_free?: boolean;
  is_best_seller?: boolean;
  ordering?: string;
}
export interface AdminCoursePage {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminCourse[];
}
export async function listAdminCourses(
  filters: AdminCourseFilters = {},
  signal?: AbortSignal,
): Promise<AdminCoursePage> {
  const { data } = await api.get<AdminCoursePage>(ENDPOINTS.COURSE.ADMIN_LIST, {
    params: filters,
    signal,
  });
  return data;
}

export async function getAdminCourse(id: string): Promise<AdminCourse> {
  return (await api.get<AdminCourse>(ENDPOINTS.COURSE.ADMIN_DETAIL(id))).data;
}

export async function patchAdminCourse(
  id: string,
  status: CourseStatus,
  rejectReason?: string,
): Promise<AdminCourse> {
  const body: { status: CourseStatus; reject_reason?: string } = { status };
  if (status === 'rejected' && rejectReason?.trim()) {
    body.reject_reason = rejectReason.trim();
  }
  return (await api.patch<AdminCourse>(ENDPOINTS.COURSE.ADMIN_DETAIL(id), body))
    .data;
}

export interface CreateCoursePayload {
  title: string;
  short_description: string;
  long_description: string;
  learn_description_points: string;
  requirements: string;
  thumbnail: File;
  localization?: string | null;
  categories: string[];
  tags?: string[];
  is_free?: boolean;
  price?: number;
  status?: CourseStatus;
  is_best_seller?: boolean;
  total_hours?: string;
  total_articles?: number;
}

export async function createInstructorCourse(
  body: CreateCoursePayload,
): Promise<AdminCourse> {
  return (
    await api.post<AdminCourse>(
      ENDPOINTS.COURSE.ADMIN_LIST,
      courseFormData(body),
    )
  ).data;
}

export async function patchInstructorCourse(
  id: string,
  body: Partial<CreateCoursePayload>,
): Promise<AdminCourse> {
  return (
    await api.patch<AdminCourse>(
      ENDPOINTS.COURSE.ADMIN_DETAIL(id),
      body.thumbnail ? courseFormData(body) : body,
    )
  ).data;
}

function courseFormData(body: Partial<CreateCoursePayload>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    if (key === 'categories')
      (value as string[]).forEach((id) => data.append(key, id));
    else if (key === 'tags') data.append(key, JSON.stringify(value));
    else if (value === null) data.append(key, '');
    else if (value instanceof File) data.append(key, value);
    else data.append(key, String(value));
  }
  return data;
}

export async function listCourseLocalizations(
  signal?: AbortSignal,
): Promise<{ value: string; label: string }[]> {
  const base = new URL(
    API_ROOT || window.location.origin,
    window.location.origin,
  );
  const visited = new Set<string>();
  const options: { value: string; label: string }[] = [];
  let next: string | null = ENDPOINTS.COURSE.LOCALIZATIONS;
  while (next) {
    const url: URL = new URL(next, base);
    if (
      url.origin !== base.origin ||
      url.pathname !== ENDPOINTS.COURSE.LOCALIZATIONS ||
      visited.has(url.href)
    )
      throw new Error('Invalid localization pagination URL.');
    visited.add(url.href);
    const {
      data,
    }: {
      data: {
        results: { id: string; language_name: string; country: string }[];
        next: string | null;
      };
    } = await api.get(url.href, { signal });
    options.push(
      ...data.results.map((item) => ({
        value: item.id,
        label: `${item.language_name} · ${item.country}`,
      })),
    );
    next = data.next;
  }
  return options;
}
