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
  slug: string;
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
  thumbnail: { id: string; name: string; url: string } | null;
  instructor: string | null;
  categories: string[];
  tags: string[];
  student_count: number;
}
export interface AdminCourseFilters {
  page?: number;
  search?: string;
  status?: CourseStatus;
  category?: string;
  category_slug?: string;
  tag?: string;
  tag_slug?: string;
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
