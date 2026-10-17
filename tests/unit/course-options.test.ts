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
        email: 'alex@example.test',
      },
    ],
  });
  expect(await listInstructorOptions()).toEqual([
    {
      value: 'instructor-id',
      label: 'Alex Morgan',
      description: 'alex@example.test',
    },
  ]);
});
