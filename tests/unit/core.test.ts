import { queryClient, queryKeys } from '../../src/state/queryClient';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';
import { api } from '../../src/api/axios';
import * as session from '../../src/state/session';
import * as profile from '../../src/state/profile';
import * as users from '../../src/api/services/users';
import * as endpoints from '../../src/api/endpoints';
import * as errors from '../../src/api/errors';
const client = {
  api,
  ...session,
  ...users,
  ...profile,
  ...endpoints,
  ...errors,
};
import { isAdmin } from '../../src/lib/permissions';
import {
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../src/lib/validation';
import { applyServerErrors } from '../../src/lib/form';
import type { User } from '../../src/types/auth';

const user: User = {
  id: '1',
  email: 'ada@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  full_name: 'Ada Lovelace',
  username: 'ada',
  phone_number: '',
  avatar: null,
  birth_date: null,
  gender: '',
  email_notifications: false,
  public_profile: false,
  search_engine_visibility: false,
  share_learning_activity: false,
  role: ['admin'],
  language: 'en',
  bio: '',
  status: 'AC',
};
const tokens = { access: 'access', refresh: 'refresh' };
function response(data: unknown, config: InternalAxiosRequestConfig) {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
  };
}
function failure(
  config: InternalAxiosRequestConfig,
  status = 401,
  data: unknown = {},
) {
  return new AxiosError('Request failed', undefined, config, undefined, {
    ...response(data, config),
    status,
  });
}
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), {
      location: { origin: 'http://localhost' },
    }),
  );
  client.clearTokens();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('validation and permissions', () => {
  it.each(['', 'bad', 'a@'])('rejects invalid email %s', (email) =>
    expect(forgotPasswordSchema.safeParse({ email }).success).toBe(false),
  );
  it('trims emails and validates password length', () => {
    expect(
      signInSchema.parse({ email: ' a@example.com ', password: 'password' })
        .email,
    ).toBe('a@example.com');
    expect(resetPasswordSchema.safeParse({ password: 'short' }).success).toBe(
      false,
    );
    expect(
      resetPasswordSchema.safeParse({ password: 'password' }).success,
    ).toBe(true);
  });
  it.each(['admin', ' ROLE_ADMIN ', 'superuser', 'staff', 'administrator'])(
    'accepts administrator role %s',
    (role) => expect(isAdmin({ ...user, role: [role] })).toBe(true),
  );
  it('handles flags, learners, and absent users', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin({ ...user, role: ['learner'] })).toBe(false);
    expect(isAdmin({ ...user, role: [], is_staff: true })).toBe(true);
    expect(isAdmin({ ...user, role: [], is_superuser: true })).toBe(true);
  });
});

describe('sessions', () => {
  it.each([
    'broken',
    'null',
    '{}',
    '{"access":42,"refresh":"r"}',
    '{"access":"a","refresh":""}',
  ])('rejects malformed stored tokens %s', (value) => {
    localStorage.setItem('learninfy.auth', value);
    expect(client.readTokens()).toBeNull();
  });
  it('saves tokens, rejects invalid responses and emits logout', () => {
    expect(client.readTokens()).toBeNull();
    client.saveTokens(tokens);
    expect(client.readTokens()).toEqual(tokens);
    expect(() => client.saveTokens({ access: '', refresh: '' })).toThrow();
    const listener = vi.fn();
    window.addEventListener(client.AUTH_EVENT, listener);
    client.clearTokens();
    expect(listener).toHaveBeenCalledOnce();
    expect(client.readTokens()).toBeNull();
  });
  it('deduplicates and caches current-user requests', async () => {
    const adapter = vi.fn(async (config) => response(user, config));
    client.api.defaults.adapter = adapter;
    await Promise.all([client.getCurrentUser(), client.getCurrentUser()]);
    await client.getCurrentUser();
    expect(adapter).toHaveBeenCalledOnce();
    await client.getCurrentUser({ force: true });
    expect(adapter).toHaveBeenCalledTimes(2);
  });
  it('does not restore a cached profile after logout', async () => {
    let resolve!: (value: ReturnType<typeof response>) => void;
    client.api.defaults.adapter = (config) =>
      new Promise((done) => {
        resolve = (data) => done(response(data.data, config));
      });
    const pending = client.getCurrentUser();
    await vi.waitFor(() => expect(resolve).toBeDefined());
    client.clearTokens();
    resolve(response(user, {} as InternalAxiosRequestConfig));
    await expect(pending).rejects.toThrow('Session changed');
  });
  it('shares refresh requests and preserves non-rotating refresh tokens', async () => {
    client.saveTokens(tokens);
    const refresh = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { access: 'new' } });
    client.api.defaults.adapter = async (config) => {
      if (config.headers.Authorization !== 'Bearer new') throw failure(config);
      return response(user, config);
    };
    await Promise.all([
      client.api.get('/protected'),
      client.api.get('/protected'),
    ]);
    expect(refresh).toHaveBeenCalledOnce();
    expect(client.readTokens()).toEqual({ access: 'new', refresh: 'refresh' });
  });
  it('clears tokens and cached identity on refresh rejection', async () => {
    client.saveTokens(tokens);
    client.setCurrentUser(user);
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('Expired'));
    client.api.defaults.adapter = async (config) => {
      throw failure(config);
    };
    await expect(client.api.get('/protected')).rejects.toThrow('Expired');
    expect(client.readTokens()).toBeNull();
    client.api.defaults.adapter = async (config) =>
      response({ ...user, id: '2' }, config);
    expect((await client.getCurrentUser()).id).toBe('2');
  });
  it('does not resurrect tokens when refresh completes after logout', async () => {
    client.saveTokens(tokens);
    let resolve!: (value: unknown) => void;
    vi.spyOn(axios, 'post').mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    client.api.defaults.adapter = async (config) => {
      throw failure(config);
    };
    const pending = client.api.get('/protected');
    await vi.waitFor(() => expect(resolve).toBeDefined());
    client.clearTokens();
    resolve({ data: tokens });
    await expect(pending).rejects.toThrow('Session changed');
    expect(client.readTokens()).toBeNull();
  });
  it('stops retrying after a second 401', async () => {
    client.saveTokens(tokens);
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: tokens });
    client.api.defaults.adapter = async (config) => {
      throw failure(config);
    };
    await expect(client.api.get('/protected')).rejects.toBeInstanceOf(
      AxiosError,
    );
    expect(refresh).toHaveBeenCalledOnce();
    expect(client.readTokens()).toBeNull();
  });
  it.each(['/api/v1/auth/staff/sign-in/', '/api/v1/auth/refresh/'])(
    'does not refresh public authentication requests %s',
    async (url) => {
      client.saveTokens(tokens);
      const refresh = vi.spyOn(axios, 'post');
      client.api.defaults.adapter = async (config) => {
        throw failure(config);
      };
      await expect(client.api.post(url)).rejects.toBeInstanceOf(AxiosError);
      expect(refresh).not.toHaveBeenCalled();
    },
  );
  it('passes through network and non-401 errors', async () => {
    client.api.defaults.adapter = async () => {
      throw new Error('Offline');
    };
    await expect(client.api.get('/protected')).rejects.toThrow('Offline');
  });
});

describe('API operations', () => {
  it('sends backend filters on every page and forwards cancellation', async () => {
    const urls: URL[] = [];
    const controller = new AbortController();
    client.api.defaults.adapter = async (config) => {
      urls.push(new URL(config.url!));
      expect(config.signal).toBe(controller.signal);
      return response(
        {
          results: [user],
          next: urls.length === 1 ? '/api/v1/users/?page=2' : null,
        },
        config,
      );
    };
    await client.listUsers(
      { status: 'suspended', search: 'nancy & team', ordering: '-created_at' },
      controller.signal,
    );
    expect(urls).toHaveLength(2);
    for (const url of urls) {
      expect(url.searchParams.get('status')).toBe('suspended');
      expect(url.searchParams.get('search')).toBe('nancy & team');
      expect(url.searchParams.get('ordering')).toBe('-created_at');
    }
    expect(urls[1].searchParams.get('page')).toBe('2');
  });

  it('loads all pages and supports unpaginated responses', async () => {
    client.api.defaults.adapter = async (config) =>
      response(
        config.url?.includes('page=2')
          ? { results: [{ ...user, id: '2' }], next: null }
          : { results: [user], next: '/api/v1/users/?page=2', count: 2 },
        config,
      );
    expect(await client.listUsers()).toHaveLength(2);
    client.api.defaults.adapter = async (config) => response([user], config);
    expect(await client.listUsers()).toEqual([user]);
  });
  it.each(['https://evil.example/api/v1/users/', '/api/v1/users/'])(
    'rejects unsafe or looping pagination %s',
    async (next) => {
      client.api.defaults.adapter = async (config) =>
        response({ results: [user], next }, config);
      await expect(client.listUsers()).rejects.toThrow(
        'Invalid user pagination',
      );
    },
  );
  it('uses the expected methods and payloads for user operations', async () => {
    const adapter = vi.fn(async (config) => response(user, config));
    client.api.defaults.adapter = adapter;
    await client.getUser('1');
    await client.updateUser('1', { first_name: 'Ada' });
    await client.deleteUser('1');
    await client.updateUserStatus('1', 'SA');
    await client.updateUserAdminPrivileges('1', true);
    await client.updateCurrentUser({ first_name: 'Ada' });
    await client.uploadUserAvatar(
      new File(['x'], 'a.png', { type: 'image/png' }),
    );
    expect(adapter.mock.calls.map(([config]) => config.method)).toEqual([
      'get',
      'put',
      'delete',
      'put',
      'put',
      'put',
      'put',
    ]);
    expect(JSON.parse(adapter.mock.calls[3][0].data)).toEqual({ status: 'SA' });
    expect(JSON.parse(adapter.mock.calls[4][0].data)).toEqual({
      is_admin: true,
    });
    expect(adapter.mock.calls[6][0].data.get('avatar').name).toBe('a.png');
    expect(await client.getCurrentUser()).toEqual(user);
  });
  it.each([
    ['profile', () => client.updateUser('1', { first_name: 'Ada' })],
    ['status', () => client.updateUserStatus('1', 'SA')],
    ['admin privileges', () => client.updateUserAdminPrivileges('1', true)],
  ] as const)(
    'fetches the affected user after a %s acknowledgement',
    async (_name, update) => {
      const updatedUser = { ...user, status: 'SA' };
      const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
        response(
          config.method === 'put' ? { message: 'Updated' } : updatedUser,
          config,
        ),
      );
      client.api.defaults.adapter = adapter;

      expect(await update()).toEqual(updatedUser);
      expect(
        adapter.mock.calls.map(([config]) => [config.method, config.url]),
      ).toEqual([
        ['put', expect.any(String)],
        ['get', client.userEndpoints.detail('1')],
      ]);
    },
  );
  it('maps API messages and field errors safely', () => {
    const config = {} as InternalAxiosRequestConfig;
    for (const data of [
      { detail: 'Denied' },
      { message: 'Denied' },
      { non_field_errors: ['Denied'] },
      { error: 'Denied' },
    ])
      expect(client.apiErrorMessage(failure(config, 400, data))).toBe('Denied');
    expect(client.apiErrorMessage(new Error(), 'Fallback')).toBe('Fallback');
    expect(client.apiErrorMessage(failure(config, 400, {}), 'Fallback')).toBe(
      'Fallback',
    );
    expect(client.apiFieldErrors(new Error())).toEqual({});
    const error = failure(config, 400, {
      email: ['Invalid email'],
      ignored: 42,
    });
    expect(client.apiFieldErrors(error)).toEqual({ email: 'Invalid email' });
    const setError = vi.fn();
    applyServerErrors(error, setError);
    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Invalid email',
    });
  });
});

it('ignores a late 401 from an old session without clearing the new login', async () => {
  client.saveTokens(tokens);
  let reject!: (error: unknown) => void;
  let oldConfig!: InternalAxiosRequestConfig;
  client.api.defaults.adapter = (config) =>
    new Promise((_resolve, fail) => {
      oldConfig = config;
      reject = fail;
    });
  const pending = client.api.get('/protected');
  await vi.waitFor(() => expect(reject).toBeDefined());
  client.clearTokens();
  const newTokens = { access: 'new-login', refresh: 'new-refresh' };
  client.saveTokens(newTokens);
  reject(failure(oldConfig));
  await expect(pending).rejects.toBeInstanceOf(AxiosError);
  expect(client.readTokens()).toEqual(newTokens);
});

it('requires a sign-in password without applying new-password strength rules', () => {
  expect(
    signInSchema.safeParse({ email: 'a@example.com', password: '' }).success,
  ).toBe(false);
  for (const password of ['x', '123', ' password ', ' ']) {
    expect(
      signInSchema.parse({ email: 'a@example.com', password }).password,
    ).toBe(password);
  }
  expect(resetPasswordSchema.safeParse({ password: 'x' }).success).toBe(false);
});

it('reuses rotated tokens for a delayed 401 without a second refresh', async () => {
  client.saveTokens(tokens);
  let rejectSlow!: (error: unknown) => void;
  let slowConfig!: InternalAxiosRequestConfig;
  const refresh = vi
    .spyOn(axios, 'post')
    .mockResolvedValue({ data: { access: 'fresh', refresh: 'rotated' } });
  client.api.defaults.adapter = (config) => {
    if (config.headers.Authorization === 'Bearer fresh')
      return Promise.resolve(response(user, config));
    if (config.url === '/slow')
      return new Promise((_resolve, reject) => {
        slowConfig = config;
        rejectSlow = reject;
      });
    return Promise.reject(failure(config));
  };
  const slow = client.api.get('/slow');
  await vi.waitFor(() => expect(rejectSlow).toBeDefined());
  await client.api.get('/fast');
  rejectSlow(failure(slowConfig));
  await slow;
  expect(refresh).toHaveBeenCalledOnce();
  expect(client.readTokens()).toEqual({ access: 'fresh', refresh: 'rotated' });
});

it.each([undefined, 503])(
  'keeps the session on transient refresh failure %s',
  async (status) => {
    client.saveTokens(tokens);
    const error = status
      ? failure({} as InternalAxiosRequestConfig, status)
      : new AxiosError('Network unavailable', 'ERR_NETWORK');
    vi.spyOn(axios, 'post').mockRejectedValue(error);
    client.api.defaults.adapter = async (config) => {
      throw failure(config);
    };
    await expect(client.api.get('/protected')).rejects.toBe(error);
    expect(client.readTokens()).toEqual(tokens);
  },
);

describe('shared server-state isolation', () => {
  it('clears profile, users, and categories on logout', () => {
    client.setCurrentUser(user);
    queryClient.setQueryData([...queryKeys.users, { search: '' }], [user]);
    queryClient.setQueryData([...queryKeys.categories, 'list', { page: 1 }], {
      results: [{ id: 'private' }],
    });
    client.clearTokens();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
  it('does not restore an old profile when a write finishes after an account change', async () => {
    let finish!: () => void;
    client.api.defaults.adapter = (config) =>
      new Promise((resolve) => {
        finish = () => resolve(response(user, config));
      });
    const pending = client.updateCurrentUser({ first_name: 'Old account' });
    await vi.waitFor(() => expect(finish).toBeDefined());
    session.clearSessionCache();
    const nextUser = { ...user, id: 'next-account' };
    client.setCurrentUser(nextUser);
    finish();
    await pending;
    expect(queryClient.getQueryData(queryKeys.profile)).toEqual(nextUser);
  });
});
