import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';
import { api } from '../../src/api/axios';
import {
  getCoupon,
  listCoupons,
  saveCoupon,
  toggleCoupon,
} from '../../src/api/services/coupons';
import { ENDPOINTS } from '../../src/api/endpoints';
import { emptyDraft } from '../../src/pages/coupons/model';
import { clearSessionCache, saveTokens } from '../../src/state/session';
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
  });
  clearSessionCache();
  saveTokens({ access: 'access', refresh: 'refresh' });
});
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  clearSessionCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('coupon API', () => {
  it('forwards list filters, bearer authentication, and cancellation', async () => {
    const filters = {
      search: 'SAVE & LEARN',
      is_deleted: false,
      ordering: '-created_at',
      page: 2,
      page_size: 9,
    };
    const signal = new AbortController().signal;
    const result = { count: 0, next: null, previous: null, results: [] };
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/coupon/management/');
      expect(config.params).toEqual(filters);
      expect(config.signal).toBe(signal);
      expect(config.headers.Authorization).toBe('Bearer access');
      return response(result, config);
    };
    expect(await listCoupons(filters, signal)).toEqual(result);
  });
  it('fetches an individual coupon', async () => {
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/coupon/management/id/');
      expect(config.method).toBe('get');
      return response({ id: 'id' }, config);
    };
    expect(await getCoupon('id')).toEqual({ id: 'id' });
  });
  it('creates with JSON and patches only the supplied changes', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response({ id: 'id' }, config),
    );
    api.defaults.adapter = adapter;
    const draft = {
      ...emptyDraft(true),
      code: 'SAVE20',
      course: '711e0b9f-3e61-4c8a-9cb4-a824ae2f47c3',
    };
    await saveCoupon(draft);
    await saveCoupon({ value: 25 }, 'id');
    const [create, update] = adapter.mock.calls.map(([config]) => config);
    expect(create.method).toBe('post');
    expect(create.url).toBe('/api/v1/coupon/management/');
    expect(create.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(create.data)).toEqual(draft);
    expect(update.method).toBe('patch');
    expect(update.url).toBe('/api/v1/coupon/management/id/');
    expect(JSON.parse(update.data)).toEqual({ value: 25 });
  });
  it('toggles deletion without a request body', async () => {
    api.defaults.adapter = async (config) => {
      expect(config.method).toBe('delete');
      expect(config.data).toBeUndefined();
      return response({ message: 'Coupon deleted successfully' }, config);
    };
    expect(await toggleCoupon('id')).toEqual({
      message: 'Coupon deleted successfully',
    });
  });
  it.each([401, 500])(
    'never retries deletion after HTTP %s',
    async (status) => {
      const refresh = vi.spyOn(axios, 'post');
      const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        throw new AxiosError('Failed', undefined, config, undefined, {
          ...response({}, config),
          status,
        });
      });
      api.defaults.adapter = adapter;
      await expect(toggleCoupon('id')).rejects.toBeInstanceOf(AxiosError);
      expect(adapter).toHaveBeenCalledOnce();
      expect(refresh).not.toHaveBeenCalled();
    },
  );
  it('encodes special characters in validation URLs', () => {
    expect(ENDPOINTS.COUPON.VALIDATE('SAVE/20 ?#')).toBe(
      '/api/v1/coupon/validate/SAVE%2F20%20%3F%23/',
    );
  });
});
