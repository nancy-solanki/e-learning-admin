import { afterEach, expect, it } from 'vitest';
import { api } from '../../src/api/axios';
import {
  listEnrollments,
  listCourseEnrollments,
  enrollmentDetail,
} from '../../src/api/services/enrollments';

const adapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = adapter;
});

it('requests paginated management and course roster data with supported filters', async () => {
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
    expect(config.data).toBeUndefined();
    if (config.url?.includes('/course/')) {
      expect(config.params).toEqual({ ...filters, page: 2 });
    } else if (config.url?.endsWith('/management/')) {
      expect(config.params).toEqual({ ...filters, page: 2 });
    } else {
      expect(config.params).toBeUndefined();
    }
    return {
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [
          { id: 'enrollment-id', user: { username: 'emma' }, progress: 0 },
        ],
      },
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
    };
  };
  await listEnrollments(filters, 2, signal);
  await listCourseEnrollments('my-course', filters, 2, signal);
  await enrollmentDetail('uuid/part', signal);
  expect(seen).toEqual([
    '/api/v1/enroll/management/',
    '/api/v1/enroll/course/my-course/',
    '/api/v1/enroll/management/uuid%2Fpart/',
  ]);
});
