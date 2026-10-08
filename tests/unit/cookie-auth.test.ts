import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';
import { api, authTransport, resetCsrf } from '../../src/api/axios';
import {
  clearSession,
  getSessionUser,
  removeLegacyAuth,
  setSessionUser,
} from '../../src/state/session';
import type { User } from '../../src/types/auth';
const profile = { id: '1' } as User;
function response(config: InternalAxiosRequestConfig, data: unknown = {}) {
  return {
    config,
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
  };
}
function failure(config: InternalAxiosRequestConfig, status: number) {
  return new AxiosError('Failed', undefined, config, undefined, {
    ...response(config),
    status,
  });
}
beforeEach(() => {
  vi.stubGlobal('navigator', {});
  clearSession();
  resetCsrf();
  authTransport.defaults.adapter = async (config) =>
    response(config, { csrfToken: 'csrf' });
});
it('includes credentials, deduplicates CSRF, and never sends bearer headers', async () => {
  const transport = vi.fn(async (config) =>
    response(config, { csrfToken: 'csrf' }),
  );
  authTransport.defaults.adapter = transport;
  api.defaults.adapter = async (config) => {
    expect(config.withCredentials).toBe(true);
    expect(config.headers.Authorization).toBeUndefined();
    expect(config.headers.get('X-CSRFToken')).toBe('csrf');
    return response(config);
  };
  await Promise.all([api.post('/mutation', {}), api.delete('/mutation')]);
  expect(transport).toHaveBeenCalledOnce();
});
it('shares refresh, retries once, and handles token-free refresh responses', async () => {
  let refreshed = false;
  const refresh = vi.fn();
  authTransport.defaults.adapter = async (config) => {
    if (config.url?.endsWith('/refresh/')) {
      refresh();
      expect(config.data).toBeUndefined();
      expect(config.headers.get('X-CSRFToken')).toBe('csrf');
      refreshed = true;
    }
    return response(config, { csrfToken: 'csrf' });
  };
  api.defaults.adapter = async (config) => {
    if (!refreshed) throw failure(config, 401);
    return response(config, profile);
  };
  await Promise.all([api.get('/protected'), api.get('/protected')]);
  expect(refresh).toHaveBeenCalledOnce();
});
it.each([403, 500])('never refreshes on %s', async (status) => {
  const transport = vi.fn();
  authTransport.defaults.adapter = transport;
  api.defaults.adapter = async (config) => {
    throw failure(config, status);
  };
  await expect(api.get('/protected')).rejects.toMatchObject({
    response: { status },
  });
  expect(transport).not.toHaveBeenCalled();
});
it.each([401, 403, 503])(
  'only signs out for refresh 401, not %s otherwise',
  async (status) => {
    setSessionUser(profile);
    authTransport.defaults.adapter = async (config) => {
      if (config.url?.endsWith('/refresh/')) throw failure(config, status);
      return response(config, { csrfToken: 'csrf' });
    };
    api.defaults.adapter = async (config) => {
      throw failure(config, 401);
    };
    await expect(api.get('/protected')).rejects.toMatchObject({
      response: { status },
    });
    expect(getSessionUser()).toEqual(status === 401 ? null : profile);
  },
);
it('does not recurse on auth endpoints and stops after a second resource 401', async () => {
  const transport = vi.fn(async (config) =>
    response(config, { csrfToken: 'csrf' }),
  );
  authTransport.defaults.adapter = transport;
  api.defaults.adapter = async (config) => {
    throw failure(config, 401);
  };
  await expect(api.get('/api/v1/auth/test/')).rejects.toBeInstanceOf(
    AxiosError,
  );
  expect(transport).not.toHaveBeenCalled();
  await expect(api.get('/protected')).rejects.toBeInstanceOf(AxiosError);
  expect(
    transport.mock.calls.filter(([config]) => config.url.endsWith('/refresh/')),
  ).toHaveLength(1);
});
it('removes only the legacy auth key from both storage areas', () => {
  const removeItem = vi.fn();
  vi.stubGlobal('window', {
    localStorage: { removeItem },
    sessionStorage: { removeItem },
  });
  removeLegacyAuth();
  expect(removeItem.mock.calls).toEqual([
    ['learninfy.auth'],
    ['learninfy.auth'],
  ]);
  vi.unstubAllGlobals();
});

afterEach(() => vi.unstubAllGlobals());
it('reuses a refresh completed before a delayed 401 arrives', async () => {
  let rejectSlow!: (error: unknown) => void;
  let slowConfig!: InternalAxiosRequestConfig;
  let refreshed = false;
  const rotations = vi.fn();
  authTransport.defaults.adapter = async (config) => {
    if (config.url?.endsWith('/refresh/')) {
      rotations();
      refreshed = true;
    }
    return response(config, { csrfToken: 'csrf' });
  };
  api.defaults.adapter = async (config) => {
    if (refreshed) return response(config);
    if (config.url === '/slow')
      return new Promise((_resolve, reject) => {
        rejectSlow = reject;
        slowConfig = config;
      });
    throw failure(config, 401);
  };
  const slow = api.get('/slow');
  await vi.waitFor(() => expect(rejectSlow).toBeDefined());
  await api.get('/fast');
  rejectSlow(failure(slowConfig, 401));
  await slow;
  expect(rotations).toHaveBeenCalledOnce();
});
it('probes the cookie session under a cross-tab lock before rotating', async () => {
  const request = vi.fn(async (_name, action) => action());
  vi.stubGlobal('navigator', { locks: { request } });
  let ready = false;
  authTransport.defaults.adapter = async (config) => {
    expect(config.url).toBe('/api/v1/users/me/');
    ready = true;
    return response(config, profile);
  };
  api.defaults.adapter = async (config) => {
    if (!ready) throw failure(config, 401);
    return response(config);
  };
  await api.get('/protected');
  expect(request).toHaveBeenCalledOnce();
});
