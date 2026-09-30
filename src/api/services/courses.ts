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
