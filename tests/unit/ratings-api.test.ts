import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import { ENDPOINTS } from '../../src/api/endpoints';
import {
  deleteRating,
  getRating,
  listRatings,
  updateRating,
  type Rating,
} from '../../src/api/services/ratings';
import { clearSessionCache } from '../../src/state/session';

const originalAdapter = api.defaults.adapter;

function response(data: unknown, config: InternalAxiosRequestConfig) {
  return {
    data,
    config,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
  };
}

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  clearSessionCache();
  resetCsrf();
  authTransport.defaults.adapter = async (config) =>
    response({ csrfToken: 'csrf' }, config);
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  clearSessionCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ratings API', () => {
  it('forwards list filters, cookie authentication, and cancellation', async () => {
    const filters = {
      course: 'course-id',
      user: 'user-id',
      rating: '4',
      rating_min: '3',
      rating_max: '5',
      created_at_after: '2026-01-01',
      created_at_before: '2026-10-26',
      search: 'helpful',
      ordering: '-created_at' as const,
      page: 2,
    };
    const signal = new AbortController().signal;
    const result = { count: 0, next: null, previous: null, results: [] };
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/rating/management/');
      expect(config.params).toEqual(filters);
      expect(config.signal).toBe(signal);
      expect(config.headers.Authorization).toBeUndefined();
      expect(config.withCredentials).toBe(true);
      return response(result, config);
    };

    expect(await listRatings(filters, signal)).toEqual(result);
  });

  it('retrieves one rating using an encoded UUID detail URL', async () => {
    const id = 'rating/part ?#';
    const rating: Rating = {
      id,
      course: 'course-id',
      course_title: 'Course title',
      rating: 4,
      comment: 'Helpful',
      response: null,
      user: 'user-id',
      created_at: '2026-10-26T12:00:00Z',
      updated_at: null,
    };
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe(
        '/api/v1/rating/management/rating%2Fpart%20%3F%23/',
      );
      expect(config.method).toBe('get');
      return response(rating, config);
    };

    expect(await getRating(id)).toEqual(rating);
    expect(ENDPOINTS.RATING.DETAIL(id)).toBe(
      '/api/v1/rating/management/rating%2Fpart%20%3F%23/',
    );
  });

  it('patches only comment and response without submitting immutable fields', async () => {
    const update = {
      comment: 'Updated review',
      response: null,
    };
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/rating/management/rating-id/');
      expect(config.method).toBe('patch');
      expect(JSON.parse(config.data)).toEqual(update);
      expect(config.data).not.toContain('rating');
      expect(config.data).not.toContain('user');
      expect(config.data).not.toContain('course');
      return response(
        {
          id: 'rating-id',
          ...update,
          course: 'course-id',
          course_title: 'Course title',
          user: 'user-id',
          created_at: null,
          updated_at: null,
        },
        config,
      );
    };
    expect(await updateRating('rating-id', update)).toMatchObject({
      id: 'rating-id',
      ...update,
    });
  });

  it('deletes a rating without sending a request body', async () => {
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/rating/management/rating-id/');
      expect(config.method).toBe('delete');
      expect(config.data).toBeUndefined();
      return {
        data: '',
        config,
        status: 204,
        statusText: 'No Content',
        headers: new AxiosHeaders(),
      };
    };
    await expect(deleteRating('rating-id')).resolves.toBeUndefined();
  });
});
