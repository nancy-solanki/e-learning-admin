import { api } from '../axios';
import { API_ROOT } from '../config';
import { ENDPOINTS } from '../endpoints';
import { listCourseOptions } from './courses';
import { listUsers } from './users';

export type ListOption = {
  value: string;
  label: string;
  description?: string;
  username?: string;
};

export async function listNamedOptions(
  endpoint: string,
  labelField: 'title' | 'name',
  signal?: AbortSignal,
): Promise<ListOption[]> {
  const base = new URL(
    API_ROOT || window.location.origin,
    window.location.origin,
  );
  let next: string | null = endpoint;
  const visited = new Set<string>();
  const options = new Map<string, ListOption>();
  while (next) {
    const url: URL = new URL(next, base);
    if (
      url.origin !== base.origin ||
      url.pathname !== endpoint ||
      visited.has(url.href)
    ) {
      throw new Error('Invalid option pagination URL.');
    }
    visited.add(url.href);
    type Record = { id: string; title?: string; name?: string };
    type Page = Record[] | { results: Record[]; next?: string | null };
    const { data }: { data: Page } = await api.get<Page>(url.href, { signal });
    for (const record of Array.isArray(data) ? data : data.results) {
      const label = record[labelField];
      if (!record.id || !label)
        throw new Error('Invalid option list response.');
      options.set(record.id, { value: record.id, label });
    }
    next = Array.isArray(data) ? null : (data.next ?? null);
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export const listCategoryOptions = (signal?: AbortSignal) =>
  listNamedOptions(ENDPOINTS.CATEGORY.LIST, 'title', signal);

export async function listRatingCourseOptions(
  signal?: AbortSignal,
): Promise<ListOption[]> {
  return (await listCourseOptions(signal)).map((course) => ({
    value: course.id,
    label: course.title,
  }));
}

export async function listRatingUserOptions(
  signal?: AbortSignal,
): Promise<ListOption[]> {
  const users = await listUsers({}, signal);
  return users
    .map((user) => ({
      value: user.id,
      label:
        user.full_name ||
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.username ||
        user.email,
      description: user.email,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function listInstructorOptions(
  signal?: AbortSignal,
): Promise<ListOption[]> {
  const users = await listUsers({}, signal);
  return users
    .filter((user) =>
      user.role?.some(
        (role) =>
          role
            .trim()
            .toLowerCase()
            .replace(/^role_/, '') === 'instructor',
      ),
    )
    .map((user) => ({
      value: user.id,
      label:
        user.full_name ||
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.username ||
        user.email,
      description: user.email,
      ...(user.username ? { username: user.username } : {}),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
