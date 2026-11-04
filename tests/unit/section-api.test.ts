import { afterEach, beforeEach, expect, it } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import {
  createAdminSection,
  getAdminSection,
  updateAdminSection,
  deleteAdminSection,
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

it('sends authenticated JSON writes and handles an empty deletion response', async () => {
  const requests: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    return response(
      config.method === 'delete' ? '' : { id: 'section-id' },
      config,
      config.method === 'delete' ? 204 : 200,
    );
  };
  const payload = {
    title: 'Introduction',
    description: 'Python basics',
    course: 'course-id',
    order: 1,
    status: 'draft' as const,
  };
  await createAdminSection(payload);
  await getAdminSection('section-id');
  await patchAdminSection('section-id', { title: 'Fundamentals', order: 2 });
  await updateAdminSection('section-id', payload);
  expect(await deleteAdminSection('section-id')).toBeUndefined();
  expect(requests.map((request) => request.method)).toEqual([
    'post',
    'get',
    'patch',
    'put',
    'delete',
  ]);
  expect(requests[0].url).toBe('/api/v1/section/instructor/all/');
  for (const request of requests.slice(1))
    expect(request.url).toBe('/api/v1/section/instructor/all/section-id/');
  for (const request of requests) {
    expect(request.withCredentials).toBe(true);
    if (request.method !== 'get')
      expect(request.headers.get('X-CSRFToken')).toBe('csrf');
    if (['post', 'put', 'patch'].includes(request.method!))
      expect(request.headers.get('Content-Type')).toBe('application/json');
  }
  expect(JSON.parse(requests[0].data)).toEqual(payload);
  expect(JSON.parse(requests[2].data)).toEqual({
    title: 'Fundamentals',
    order: 2,
  });
  expect(JSON.parse(requests[3].data)).toEqual(payload);
  expect(requests[4].data).toBeUndefined();
});
