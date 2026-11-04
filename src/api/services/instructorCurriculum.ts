import { patchAdminSection } from './sections';

/** Enable only after the instructor lecture write contract is connected. */
export const lectureWritesEnabled = false;

function requireLectureApi(): never {
  throw new Error('Lecture saving is not available yet.');
}

/** Each PATCH is retryable if an earlier save stopped partway through. */
export async function saveCurriculumOrder(
  kind: 'sections' | 'lectures',
  ids: string[],
) {
  if (kind === 'lectures') requireLectureApi();
  for (const [index, id] of ids.entries()) {
    await patchAdminSection(id, { order: index + 1 });
  }
}

export async function saveInstructorLecture(_data: FormData, _id?: string) {
  void _data;
  void _id;
  requireLectureApi();
}

export async function deleteInstructorLecture(_id: string) {
  void _id;
  requireLectureApi();
}
