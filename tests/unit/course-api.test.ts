import { afterEach, beforeEach, expect, it } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import {
  getAdminCourse,
  listAdminCourses,
  patchAdminCourse,
} from '../../src/api/services/courses';

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

it('loads the read-only admin list with cookies, server filters, and pagination', async () => {
  const filters = {
    page: 2,
    search: '"Django basics", Python',
    category: 'category-uuid',
    instructor: 'instructor-uuid',
    status: 'rejected' as const,
    price_min: 0,
    is_free: false,
    is_best_seller: true,
    ordering: '-price,title',
  };
  const signal = new AbortController().signal;
  const data = {
    count: 21,
    next: null,
    previous: '/api/v1/course/instructor/all/?page=1',
    results: [
      {
        id: 'course-id',
        deleted_at: '2026-10-17T10:00:00Z',
        instructor: 'instructor-id',
        categories: ['category-id'],
        tags: ['tag-id'],
        thumbnail: 'thumbnail-file-id',
        price: 1000,
      },
    ],
  };
  api.defaults.adapter = async (config) => {
    expect(config.url).toBe('/api/v1/course/instructor/all/');
    expect(config.method).toBe('get');
    expect(config.data).toBeUndefined();
    expect(config.params).toEqual(filters);
    expect(config.params).not.toHaveProperty('page_size');
    expect(config.withCredentials).toBe(true);
    expect(config.signal).toBe(signal);
    return {
      data,
      config,
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
    };
  };
  expect(await listAdminCourses(filters, signal)).toEqual(data);
  expect(data.results[0]).toMatchObject({
    thumbnail: 'thumbnail-file-id',
    instructor: 'instructor-id',
    categories: ['category-id'],
    tags: ['tag-id'],
  });
});

it('uses UUID detail routes and sends allowlisted status moderation payloads', async () => {
  const calls: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = async (config) => {
    calls.push(config);
    return response({ id: 'course/uuid', status: 'rejected' }, config);
  };
  await getAdminCourse('course/uuid');
  await patchAdminCourse('course/uuid', 'rejected', 'Improve the description.');
  expect(calls[0].url).toBe('/api/v1/course/instructor/all/course%2Fuuid/');
  expect(calls[0].method).toBe('get');
  expect(calls[1].method).toBe('patch');
  expect(JSON.parse(calls[1].data)).toEqual({
    status: 'rejected',
    reject_reason: 'Improve the description.',
  });
  await patchAdminCourse('course/uuid', 'published', 'must not be included');
  expect(JSON.parse(calls[2].data)).toEqual({ status: 'published' });
  await patchAdminCourse('course/uuid', 'rejected', '  ');
  expect(JSON.parse(calls[3].data)).toEqual({ status: 'rejected' });
});
