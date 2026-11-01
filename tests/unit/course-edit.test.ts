import { expect, it } from 'vitest';
import {
  changedCourseFields,
  courseTextToHtml,
} from '../../src/pages/courses/courseEdit';
import type { AdminCourse } from '../../src/api/services/courses';
const course = {
  id: 'course-id',
  title: 'Python',
  price: 999,
  status: 'published',
  categories: ['a', 'b'],
  localization: 'english',
  tags: [{ id: 'tag', name: 'Python', slug: 'python' }],
  thumbnail: { id: 'image', url: '/image.png', name: 'image.png' },
} as AdminCourse;
it('omits unchanged selections, metadata, status, and thumbnail', () => {
  expect(
    changedCourseFields(course, {
      title: 'Python',
      price: 999,
      categories: ['b', 'a'],
      tags: ['Python'],
      localization: 'english',
    }),
  ).toEqual({});
});
it('sends only changed values and explicit selection clears', () => {
  expect(
    changedCourseFields(course, {
      title: 'Advanced Python',
      price: 999,
      tags: [],
      localization: null,
    }),
  ).toEqual({ title: 'Advanced Python', tags: [], localization: null });
});
it('includes a replacement image only when provided', () => {
  const thumbnail = new File(['image'], 'replacement.png', {
    type: 'image/png',
  });
  expect(changedCourseFields(course, { thumbnail })).toEqual({ thumbnail });
  expect(changedCourseFields(course, { thumbnail: undefined })).toEqual({});
});
it('escapes stored text before prefilling editable HTML while preserving line breaks', () => {
  expect(courseTextToHtml('<img src=x onerror=alert(1)>\nA & B')).toBe(
    '&lt;img src=x onerror=alert(1)&gt;<br>A &amp; B',
  );
});
