import { afterEach, beforeEach, expect, it } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import {
  createInstructorCourse,
  patchInstructorCourse,
  getAdminCourse,
  listAdminCourses,
  patchAdminCourse,
  submitInstructorCourse,
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

it('creates an instructor course as authenticated multipart and returns the direct object', async () => {
  const payload = {
    title: 'Python',
    localization: '77777777-7777-4777-8777-777777777777',
    short_description: 'Learn Python',
    long_description: 'Introduction',
    requirements: 'A laptop\nBasic computer skills',
    learn_description_points: 'Variables\nFunctions',
    thumbnail: new File(['image'], 'thumbnail.png', { type: 'image/png' }),
    categories: ['22222222-2222-4222-8222-222222222222'],
    tags: ['Python', 'Beginner'],
    is_free: false,
    price: 999,
  };
  api.defaults.adapter = async (config) => {
    expect(config.method).toBe('post');
    expect(config.url).toBe('/api/v1/course/instructor/all/');
    expect(config.withCredentials).toBe(true);
    expect(config.headers.get('Content-Type')).toBe(false);
    const body = config.data as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('thumbnail')).toBe(payload.thumbnail);
    expect(body.getAll('categories')).toEqual(payload.categories);
    expect(body.get('tags')).toBe(JSON.stringify(payload.tags));
    expect(body.get('price')).toBe('999');
    expect(body.get('localization')).toBe(payload.localization);
    expect(body.get('is_free')).toBe('false');
    expect(body.get('requirements')).toBe(payload.requirements);
    expect(body.has('instructor')).toBe(false);
    expect(body.has('status')).toBe(false);
    return response({ id: 'course-uuid', ...payload }, config, 201);
  };
  expect(await createInstructorCourse(payload)).toEqual({
    id: 'course-uuid',
    ...payload,
  });
});

it('submits instructor courses for approval and returns workflow status/message', async () => {
  api.defaults.adapter = async (config) => {
    expect(config.method).toBe('post');
    expect(config.url).toBe(
      '/api/v1/course/instructor/all/course-uuid/submit/',
    );
    return response(
      {
        message: 'Course submitted for review.',
        status: 'in-review',
      },
      config,
    );
  };
  expect(await submitInstructorCourse('course-uuid')).toEqual({
    message: 'Course submitted for review.',
    status: 'in-review',
  });
});

it('patches instructor courses by UUID with only the changed fields', async () => {
  api.defaults.adapter = async (config) => {
    expect(config.method).toBe('patch');
    expect(config.url).toBe('/api/v1/course/instructor/all/course-uuid/');
    expect(JSON.parse(config.data)).toEqual({ price: 1299, tags: [] });
    return response({ id: 'course-uuid', price: 1299, tags: [] }, config);
  };
  expect(
    await patchInstructorCourse('course-uuid', { price: 1299, tags: [] }),
  ).toMatchObject({ id: 'course-uuid', price: 1299 });
});

it('uploads a replacement thumbnail and clears tags in multipart PATCH', async () => {
  const thumbnail = new File(['replacement'], 'new.png', { type: 'image/png' });
  api.defaults.adapter = async (config) => {
    expect(config.method).toBe('patch');
    expect(config.headers.get('Content-Type')).toBe(false);
    const body = config.data as FormData;
    expect(body.get('thumbnail')).toBe(thumbnail);
    expect(body.get('tags')).toBe('[]');
    expect(body.get('localization')).toBe('');
    expect(body.has('categories')).toBe(false);
    expect(body.has('title')).toBe(false);
    return response({ id: 'course-uuid' }, config);
  };
  await patchInstructorCourse('course-uuid', {
    thumbnail,
    tags: [],
    localization: null,
  });
});
