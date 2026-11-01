import { listCourseLocalizations } from '../../src/api/services/courses';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../../src/api/axios';
import {
  listCategoryOptions,
  listInstructorOptions,
} from '../../src/api/services/options';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('loads all category pages and uses UUID values with title labels', async () => {
  vi.stubGlobal('window', { location: { origin: 'https://example.test' } });
  const get = vi
    .spyOn(api, 'get')
    .mockResolvedValueOnce({
      data: {
        results: [{ id: 'category-b', title: 'Science' }],
        next: '/api/v1/category/?page=2',
      },
    })
    .mockResolvedValueOnce({
      data: { results: [{ id: 'category-a', title: 'Art' }], next: null },
    });
  expect(await listCategoryOptions()).toEqual([
    { value: 'category-a', label: 'Art' },
    { value: 'category-b', label: 'Science' },
  ]);
  expect(get).toHaveBeenCalledTimes(2);
});
it('only includes instructors and keeps IDs separate from display names', async () => {
  vi.stubGlobal('window', { location: { origin: 'https://example.test' } });
  vi.spyOn(api, 'get').mockResolvedValue({
    data: [
      { id: 'student-id', role: ['student'], full_name: 'Student' },
      {
        id: 'instructor-id',
        role: ['ROLE_INSTRUCTOR'],
        first_name: 'Alex',
        last_name: 'Morgan',
        username: 'alex',
        email: 'alex@example.test',
      },
    ],
  });
  expect(await listInstructorOptions()).toEqual([
    {
      value: 'instructor-id',
      label: 'Alex Morgan',
      description: 'alex@example.test',
      username: 'alex',
    },
  ]);
});

it('loads instructor localization options across pages with language and country labels', async () => {
  vi.stubGlobal('window', { location: { origin: 'https://example.test' } });
  const get = vi
    .spyOn(api, 'get')
    .mockResolvedValueOnce({
      data: {
        results: [
          { id: 'english', language_name: 'English', country: 'India' },
        ],
        next: '/api/v1/course/localizations/?page=2',
      },
    })
    .mockResolvedValueOnce({
      data: {
        results: [{ id: 'french', language_name: 'French', country: 'France' }],
        next: null,
      },
    });
  const signal = new AbortController().signal;
  expect(await listCourseLocalizations(signal)).toEqual([
    { value: 'english', label: 'English · India' },
    { value: 'french', label: 'French · France' },
  ]);
  expect(get).toHaveBeenCalledTimes(2);
  expect(get.mock.calls[1][0]).toContain(
    '/api/v1/course/localizations/?page=2',
  );
  expect(get.mock.calls[1][1]).toEqual({ signal });
});

it('rejects localization pagination outside the instructor options endpoint', async () => {
  vi.stubGlobal('window', { location: { origin: 'https://example.test' } });
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { results: [], next: 'https://untrusted.test/collect' },
  });
  await expect(listCourseLocalizations()).rejects.toThrow(
    'Invalid localization pagination URL.',
  );
});
