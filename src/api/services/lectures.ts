import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';

export type LectureStatus = 'published' | 'draft' | 'rejected';
export type LectureType = 'video' | 'document';

export interface AdminLecture {
  id: string;
  instructor: string;
  course: string;
  section: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  title: string;
  slug: string | null;
  description: string;
  status: LectureStatus;
  reject_reason: string | null;
  order: number;
  lecture_type: LectureType;
  is_preview: boolean;
  source: string | null;
  thumbnail: string | null;
  resources: unknown | null;
}

export interface AdminLectureFilters {
  page?: number | 'last';
  search?: string;
  course?: string;
  course_slug?: string;
  section?: string;
  section_slug?: string;
  instructor?: string;
  status?: LectureStatus;
  lecture_type?: LectureType;
  is_preview?: boolean;
  ordering?: string;
}

export interface AdminLecturePage {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminLecture[];
}

export async function listAdminLectures(
  filters: AdminLectureFilters = {},
  signal?: AbortSignal,
): Promise<AdminLecturePage> {
  return (
    await api.get<AdminLecturePage>(ENDPOINTS.LECTURE.ADMIN_LIST, {
      params: filters,
      signal,
    })
  ).data;
}

export async function getAdminLecture(id: string): Promise<AdminLecture> {
  return (await api.get<AdminLecture>(ENDPOINTS.LECTURE.ADMIN_DETAIL(id))).data;
}

export async function patchAdminLecture(
  id: string,
  status: LectureStatus,
  rejectReason?: string,
): Promise<AdminLecture> {
  const body: { status: LectureStatus; reject_reason?: string } = { status };
  if (status === 'rejected' && rejectReason?.trim()) {
    body.reject_reason = rejectReason.trim();
  }
  return (
    await api.patch<AdminLecture>(ENDPOINTS.LECTURE.ADMIN_DETAIL(id), body)
  ).data;
}
