import { afterEach, beforeEach, expect, it } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import {
  getAdminLecture,
  listAdminLectures,
  patchAdminLecture,
} from '../../src/api/services/lectures';

const originalAdapter = api.defaults.adapter;
const originalAuthAdapter = authTransport.defaults.adapter;

function response(
  data: unknown,
  config: InternalAxiosRequestConfig,
  status = 200,
) {
  return {
    data,
    config,
    status,
    statusText: status === 204 ? 'No Content' : 'OK',
    headers: new AxiosHeaders(),
  };
}

beforeEach(() => {
  resetCsrf();
  authTransport.defaults.adapter = async (config) =>
    response({ csrfToken: 'csrf' }, config);
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  authTransport.defaults.adapter = originalAuthAdapter;
  resetCsrf();
});

it('uses the lecture instructor list endpoint with supported filters', async () => {
  const filters = {
    page: 'last' as const,
    search: 'audio basics',
    course: 'course-uuid',
    course_slug: 'audio-basics',
    section: 'section-uuid',
    section_slug: 'introduction',
    instructor: 'instructor-uuid',
    status: 'published' as const,
    lecture_type: 'video' as const,
    is_preview: false,
    ordering: 'order,-created_at',
  };
  api.defaults.adapter = async (config) => {
    expect(config.url).toBe('/api/v1/lecture/instructor/all/');
    expect(config.method).toBe('get');
    expect(config.data).toBeUndefined();
    expect(config.params).toEqual(filters);
    expect(config.params).not.toHaveProperty('page_size');
    expect(config.withCredentials).toBe(true);
    return response(
      { count: 0, next: null, previous: null, results: [] },
      config,
    );
  };
  expect(await listAdminLectures(filters)).toEqual({
    count: 0,
    next: null,
    previous: null,
    results: [],
  });
});

it('uses UUID details and limits lecture patches to status and rejection reason', async () => {
  const requests: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    return response(
      {
        id: 'lecture/uuid',
        instructor: 'john_doe',
        course: 'course-uuid',
        section: 'section-uuid',
        status: 'rejected',
        source: 'https://example.test/video.mp4',
        thumbnail: null,
        resources: null,
      },
      config,
    );
  };
  await getAdminLecture('lecture/uuid');
  await patchAdminLecture('lecture/uuid', 'rejected', 'Improve audio.');
  await patchAdminLecture('lecture/uuid', 'draft', 'must not be sent');
  await patchAdminLecture('lecture/uuid', 'rejected', '  ');
  expect(requests[0].url).toBe(
    '/api/v1/lecture/instructor/all/lecture%2Fuuid/',
  );
  expect(requests[0].method).toBe('get');
  expect(JSON.parse(requests[1].data)).toEqual({
    status: 'rejected',
    reject_reason: 'Improve audio.',
  });
  expect(JSON.parse(requests[2].data)).toEqual({ status: 'draft' });
  expect(JSON.parse(requests[3].data)).toEqual({ status: 'rejected' });
});
