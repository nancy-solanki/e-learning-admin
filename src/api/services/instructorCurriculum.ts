import {
  createInstructorLecture,
  deleteInstructorLecture as deleteLecture,
  patchInstructorLecture,
  type InstructorLecturePayload,
} from './lectures';
import { patchInstructorSection } from './sections';

/** Each PATCH is retryable if an earlier save stopped partway through. */
export async function saveCurriculumOrder(
  kind: 'sections' | 'lectures',
  ids: string[],
) {
  for (const [index, id] of ids.entries()) {
    if (kind === 'lectures')
      await patchInstructorLecture(id, { order: index + 1 });
    else await patchInstructorSection(id, { order: index + 1 });
  }
}

export async function saveInstructorLecture(data: FormData, id?: string) {
  const rawType = data.get('lecture_type');
  if (rawType !== 'video' && rawType !== 'document')
    throw new Error('Invalid lecture type.');
  const order = Number(data.get('order'));
  if (!Number.isInteger(order) || order < 1)
    throw new Error('Lecture order must be a positive number.');
  const payload: InstructorLecturePayload = {
    title: String(data.get('title') ?? ''),
    description: String(data.get('description') ?? ''),
    lecture_type: rawType,
    is_preview: data.get('is_preview') === 'true',
    order,
    course: String(data.get('course') ?? ''),
    section: String(data.get('section') ?? ''),
    resources: [],
  };
  const content = String(data.get('document_content') ?? '');
  if (content) payload.document_content = content;
  const source = data.get('source');
  if (source instanceof File && source.size > 0) payload.source = source;
  const thumbnail = data.get('thumbnail');
  if (thumbnail instanceof File && thumbnail.size > 0)
    payload.thumbnail = thumbnail;
  if (!id) return createInstructorLecture(payload);
  const changes = { ...payload };
  delete changes.resources;
  return patchInstructorLecture(id, changes);
}

export async function deleteInstructorLecture(id: string) {
  return deleteLecture(id);
}
