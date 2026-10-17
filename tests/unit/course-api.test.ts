import { afterEach, expect, it } from 'vitest';
import { AxiosHeaders } from 'axios';
import { api } from '../../src/api/axios';
import { listAdminCourses } from '../../src/api/services/courses';

const originalAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = originalAdapter;
});

it('loads the read-only admin list with cookies, server filters, and pagination', async () => {
  const filters = {
    page: 2,
    search: '"Django basics", Python',
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
    previous: '/api/v1/course/admin/all/?page=1',
    results: [
      {
        id: 'course-id',
        deleted_at: '2026-10-17T10:00:00Z',
        instructor: 'instructor-id',
        categories: ['category-id'],
        price: 1000,
      },
    ],
  };
  api.defaults.adapter = async (config) => {
    expect(config.url).toBe('/api/v1/course/admin/all/');
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
});
