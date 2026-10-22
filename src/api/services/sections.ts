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
  instructor?: string;
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
  status: SectionStatus,
): Promise<AdminSection> {
  return (
    await api.patch<AdminSection>(ENDPOINTS.SECTION.ADMIN_DETAIL(id), {
      status,
    })
  ).data;
}
