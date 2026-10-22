import { afterEach, beforeEach, expect, it } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import {
  listAdminSections,
  patchAdminSection,
} from '../../src/api/services/sections';

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

it('loads sections from the instructor management endpoint with server filters', async () => {
  const filters = {
    page: 2,
    search: 'introduction',
    course: 'course-id',
    course_slug: 'python-basics',
    instructor: 'instructor-uuid',
    status: 'published' as const,
    ordering: 'order,-created_at',
  };
  api.defaults.adapter = async (config) => {
    expect(config.url).toBe('/api/v1/section/instructor/all/');
    expect(config.method).toBe('get');
    expect(config.data).toBeUndefined();
    expect(config.params).toEqual(filters);
    expect(config.params).not.toHaveProperty('page_size');
    expect(config.withCredentials).toBe(true);
    return response(
      {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 'section-id',
            instructor: 'john_doe',
            course_title: 'Python Basics',
            course: 'course-id',
            title: 'Introduction',
            slug: null,
            description: '',
            status: 'published',
            order: 1,
            created_at: null,
            updated_at: null,
            deleted_at: null,
          },
        ],
      },
      config,
    );
  };
  expect(await listAdminSections(filters)).toMatchObject({
    count: 1,
    results: [{ instructor: 'john_doe', course: 'course-id' }],
  });
});

it('patches only the section publication status', async () => {
  const requests: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    return response({ id: 'section-id', status: 'rejected' }, config);
  };
  await patchAdminSection('section-id', 'rejected');
  expect(requests[0].method).toBe('patch');
  expect(requests[0].url).toBe('/api/v1/section/instructor/all/section-id/');
  expect(JSON.parse(requests[0].data)).toEqual({ status: 'rejected' });
});
