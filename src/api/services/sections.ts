import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';

export type SectionStatus = 'published' | 'draft' | 'rejected';

export interface AdminSection {
  id: string;
  instructor: string;
  course_title: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  title: string;
  slug: string | null;
  description: string;
  status: SectionStatus;
  order: number;
  course: string;
}

export interface AdminSectionFilters {
  page?: number | 'last';
  search?: string;
  course?: string;
  course_slug?: string;
  status?: SectionStatus;
  ordering?: string;
}

export interface AdminSectionPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminSection[];
}

export async function listAdminSections(
  filters: AdminSectionFilters = {},
  signal?: AbortSignal,
): Promise<AdminSectionPage> {
  return (
    await api.get<AdminSectionPage>(ENDPOINTS.SECTION.ADMIN_LIST, {
      params: filters,
      signal,
    })
  ).data;
}

export async function getAdminSection(id: string): Promise<AdminSection> {
  return (await api.get<AdminSection>(ENDPOINTS.SECTION.ADMIN_DETAIL(id))).data;
}

export async function patchAdminSection(
  id: string,
  changes: Partial<SectionPayload> | SectionStatus,
): Promise<AdminSection> {
  return (
    await api.patch<AdminSection>(ENDPOINTS.SECTION.ADMIN_DETAIL(id), {
      ...(typeof changes === 'string' ? { status: changes } : changes),
    })
  ).data;
}

export interface SectionPayload {
  title: string;
  description: string;
  course: string;
  order?: number;
  status?: SectionStatus;
  slug?: string;
}

export async function createAdminSection(
  payload: SectionPayload,
): Promise<AdminSection> {
  return (await api.post<AdminSection>(ENDPOINTS.SECTION.ADMIN_LIST, payload))
    .data;
}

export async function updateAdminSection(
  id: string,
  payload: SectionPayload,
): Promise<AdminSection> {
  return (
    await api.put<AdminSection>(ENDPOINTS.SECTION.ADMIN_DETAIL(id), payload)
  ).data;
}

export async function deleteAdminSection(id: string): Promise<void> {
  await api.delete(ENDPOINTS.SECTION.ADMIN_DETAIL(id));
}
