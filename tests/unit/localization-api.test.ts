import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';
import { api } from '../../src/api/axios';
import { ENDPOINTS } from '../../src/api/endpoints';
import {
  createLocalization,
  getLocalization,
  listLocalizations,
  patchLocalization,
  replaceLocalization,
  toggleLocalization,
} from '../../src/api/services/localizations';
import { clearSessionCache, saveTokens } from '../../src/state/session';

const originalAdapter = api.defaults.adapter;

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
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
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

describe('localization API', () => {
  it('forwards list filters, authentication, and cancellation', async () => {
    const filters = {
      language_name: 'English',
      country: 'India',
      is_deleted: false,
      search: 'eng',
      ordering: 'language_name,-country',
      page: 2,
      page_size: 10,
    };
    const signal = new AbortController().signal;
    const result = { count: 0, next: null, previous: null, results: [] };
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/localization/');
      expect(config.params).toEqual(filters);
      expect(config.signal).toBe(signal);
      expect(config.headers.Authorization).toBe('Bearer access');
      return response(result, config);
    };
    expect(await listLocalizations(filters, signal)).toEqual(result);
  });

  it('uses encoded UUID detail URLs', async () => {
    const id = 'uuid/part ?#';
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/api/v1/localization/uuid%2Fpart%20%3F%23/');
      return response({ id }, config);
    };
    expect(await getLocalization(id)).toEqual({ id });
    expect(ENDPOINTS.LOCALIZATION.DETAIL(id)).toBe(
      '/api/v1/localization/uuid%2Fpart%20%3F%23/',
    );
  });

  it('sends JSON-only create, replace, and partial update payloads', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response({ id: 'uuid' }, config),
    );
    api.defaults.adapter = adapter;
    const draft = { language_name: 'English', country: 'India' };
    await createLocalization(draft);
    await replaceLocalization('uuid', draft);
    await patchLocalization('uuid', { country: 'United Kingdom' });

    const [create, replace, patch] = adapter.mock.calls.map(
      ([config]) => config,
    );
    expect(create.method).toBe('post');
    expect(create.url).toBe('/api/v1/localization/');
    expect(create.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(create.data)).toEqual(draft);
    expect(replace.method).toBe('put');
    expect(replace.url).toBe('/api/v1/localization/uuid/');
    expect(JSON.parse(replace.data)).toEqual(draft);
    expect(patch.method).toBe('patch');
    expect(JSON.parse(patch.data)).toEqual({ country: 'United Kingdom' });
  });

  it('handles both delete and restore responses without retrying DELETE', async () => {
    const requests: InternalAxiosRequestConfig[] = [];
    api.defaults.adapter = async (config) => {
      requests.push(config);
      return requests.length === 1
        ? response('', config, 204)
        : response({ message: 'Activated successfully' }, config, 200);
    };
    expect(await toggleLocalization('uuid')).toBeNull();
    expect(await toggleLocalization('uuid')).toEqual({
      message: 'Activated successfully',
    });
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.method).toBe('delete');
      expect(request.url).toBe('/api/v1/localization/uuid/');
      expect(request.data).toBeUndefined();
      expect(request.skipAuthRetry).toBe(true);
    }
  });

  it('does not retry a failed toggle DELETE', async () => {
    const refresh = vi.spyOn(axios, 'post');
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('Failed', undefined, config, undefined, {
        ...response({}, config),
        status: 401,
      });
    });
    api.defaults.adapter = adapter;
    await expect(toggleLocalization('uuid')).rejects.toBeInstanceOf(AxiosError);
    expect(adapter).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });
});
