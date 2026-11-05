import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';

export type LectureStatus = 'published' | 'in-review' | 'draft' | 'rejected';
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
  document_content?: string | null;
}

export interface InstructorLecturePayload {
  title: string;
  description: string;
  lecture_type: LectureType;
  is_preview: boolean;
  order: number;
  course: string;
  section: string;
  document_content?: string;
  resources?: unknown[];
  source?: File | null;
  thumbnail?: File | null;
}

export type InstructorLectureChanges = Partial<InstructorLecturePayload>;

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

export async function submitInstructorLecture(
  id: string,
): Promise<{ message: string; status: 'in-review' }> {
  return (await api.post(ENDPOINTS.LECTURE.SUBMIT(id))).data;
}

export async function createInstructorLecture(
  payload: InstructorLecturePayload,
): Promise<AdminLecture> {
  return (
    await api.post<AdminLecture>(
      ENDPOINTS.LECTURE.ADMIN_LIST,
      lectureRequestBody(payload),
    )
  ).data;
}

export async function updateInstructorLecture(
  id: string,
  payload: InstructorLecturePayload,
): Promise<AdminLecture> {
  return (
    await api.put<AdminLecture>(
      ENDPOINTS.LECTURE.ADMIN_DETAIL(id),
      lectureRequestBody(payload),
    )
  ).data;
}

export async function patchInstructorLecture(
  id: string,
  payload: InstructorLectureChanges,
): Promise<AdminLecture> {
  return (
    await api.patch<AdminLecture>(
      ENDPOINTS.LECTURE.ADMIN_DETAIL(id),
      lectureRequestBody(payload),
    )
  ).data;
}

export async function deleteInstructorLecture(
  id: string,
): Promise<{ message: string }> {
  return (
    await api.delete<{ message: string }>(ENDPOINTS.LECTURE.ADMIN_DETAIL(id))
  ).data;
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

function lectureRequestBody(
  payload: InstructorLectureChanges,
): InstructorLectureChanges | FormData {
  const files = [payload.source, payload.thumbnail].filter(
    (value): value is File => value instanceof File,
  );
  if (!files.length) return payload;

  const body = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (value === null) body.append(key, '');
    else if (value instanceof File) body.append(key, value);
    else if (typeof value === 'boolean' || typeof value === 'number')
      body.append(key, String(value));
    else if (Array.isArray(value)) body.append(key, JSON.stringify(value));
    else body.append(key, value);
  }
  return body;
}
