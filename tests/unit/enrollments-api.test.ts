import { afterEach, expect, it } from 'vitest';
import { AxiosHeaders, AxiosError } from 'axios';
import { api } from '../../src/api/axios';
import {
  listEnrollments,
  enrollmentSummary,
  enrollmentCourses,
  exportEnrollments,
  enrollmentDetail,
} from '../../src/api/services/enrollments';
const adapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = adapter;
});
it('shares reporting filters, omits export pagination, and paginates unfiltered course options', async () => {
  const filters = {
    search: 'Emma design',
    course: 'course-uuid',
    course_slug: 'design',
    user: 'user-uuid',
    created_at_after: '2026-01-01',
    created_at_before: '2026-10-27',
    ordering: '-user__last_name' as const,
  };
  const signal = new AbortController().signal;
  const seen: string[] = [];
  api.defaults.adapter = async (config) => {
    seen.push(config.url!);
    expect(config.withCredentials).toBe(true);
    expect(config.signal).toBe(signal);
    expect(config.method).toBe('get');
    let data: unknown = {};
    if (config.url?.endsWith('/courses/')) {
      expect(Object.keys(config.params)).toEqual(['page']);
      data = {
        results: [{ id: String(config.params.page) }],
        next: config.params.page === 1 ? '?page=2' : null,
      };
    } else if (config.url?.endsWith('/management/'))
      expect(config.params).toEqual({ ...filters, page: 2 });
    else if (
      config.url?.endsWith('/summary/') ||
      config.url?.endsWith('/export/')
    )
      expect(config.params).toEqual(filters);
    if (config.url?.endsWith('/export/'))
      expect(config.responseType).toBe('blob');
    return {
      data,
      config,
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
    };
  };
  await listEnrollments(filters, 2, signal);
  await enrollmentSummary(filters, signal);
  await exportEnrollments(filters, signal);
  expect(await enrollmentCourses(signal)).toEqual([{ id: '1' }, { id: '2' }]);
  await enrollmentDetail('uuid/part', signal);
  expect(seen.at(-1)).toBe('/api/v1/enroll/management/uuid%2Fpart/');
});
it('rejects export errors and decodes blob validation errors', async () => {
  api.defaults.adapter = async (config) => {
    throw new AxiosError('Bad request', 'ERR_BAD_REQUEST', config, undefined, {
      data: new Blob([JSON.stringify({ course: ['Invalid UUID.'] })]),
      status: 400,
      statusText: 'Bad request',
      config,
      headers: new AxiosHeaders(),
    });
  };
  await expect(exportEnrollments({ course: 'bad' })).rejects.toMatchObject({
    response: { status: 400, data: { course: ['Invalid UUID.'] } },
  });
});
