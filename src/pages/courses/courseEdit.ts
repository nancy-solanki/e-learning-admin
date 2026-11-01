import type {
  AdminCourse,
  CreateCoursePayload,
} from '../../api/services/courses';

/** Keep untouched fields out of PATCH, including status and existing images. */
export function changedCourseFields(
  course: AdminCourse,
  values: Partial<CreateCoursePayload>,
): Partial<CreateCoursePayload> {
  const original = {
    ...course,
    localization: course.localization ?? null,
    tags: course.tags.map((tag) => tag.name),
  };
  return Object.fromEntries(
    Object.entries(values).filter(([key, value]) => {
      if (value === undefined) return false;
      if (key === 'thumbnail') return true;
      const before = original[key as keyof typeof original];
      if (Array.isArray(value) && Array.isArray(before))
        return (
          JSON.stringify([...value].sort()) !==
          JSON.stringify([...before].sort())
        );
      return value !== before;
    }),
  );
}

/** Course descriptions are plain text. Escape before loading a rich text control. */
export function courseTextToHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replace(/\r?\n/g, '<br>');
}
