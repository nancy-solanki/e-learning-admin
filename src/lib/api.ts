import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import { ENDPOINTS } from '../config/endpoints';
import type { User } from '../types/auth';

export type Tokens = { access: string; refresh: string };

export const API_ROOT = (import.meta.env.VITE_API_ROOT_URL ?? '').replace(
  /\/$/,
  '',
);
const TOKEN_KEY = 'learninfy.auth';

type RetryConfig = AxiosRequestConfig & {
  _retry?: boolean;
  _sessionVersion?: number;
};

export const authEndpoints = {
  signIn: ENDPOINTS.AUTH.SIGN_IN,
  signOut: ENDPOINTS.AUTH.SIGN_OUT,
  refresh: ENDPOINTS.AUTH.REFRESH,
  sendResetPasswordEmail: ENDPOINTS.AUTH.SEND_RESET_PASSWORD_EMAIL,
  activateAccount: '/api/v1/auth/activate-account/',
  resetPassword: '/api/v1/auth/reset-password/',
  changePassword: ENDPOINTS.AUTH.CHANGE_PASSWORD,
};
export const userEndpoints = {
  me: ENDPOINTS.USER.ME,
  list: ENDPOINTS.USER.LIST,
  detail: ENDPOINTS.USER.DETAIL,
  modifyAdminPrivileges: ENDPOINTS.USER.MODIFY_ADMIN_PRIVILEGES,
  modifyStatus: ENDPOINTS.USER.MODIFY_USER_STATUS,
};

export type UserListResponse =
  User[] | { results: User[]; count?: number; next?: string | null };

export type UserListFilters = {
  status?: 'active' | 'pending' | 'suspended' | 'inactive';
  search?: string;
  ordering?: 'created_at' | '-created_at';
};

// Follow pagination within the backend-filtered result set.
export async function listUsers(
  filters: UserListFilters = {},
  signal?: AbortSignal,
): Promise<User[]> {
  const users: User[] = [];
  const base = new URL(
    API_ROOT || window.location.origin,
    window.location.origin,
  );
  let next: string | null = userEndpoints.list;
  const visited = new Set<string>();
  while (next) {
    const url: URL = new URL(next, base);
    if (
      url.origin !== base.origin ||
      url.pathname !== userEndpoints.list ||
      visited.has(url.href)
    ) {
      throw new Error('Invalid user pagination URL.');
    }
    for (const [key, value] of Object.entries(filters)) {
      if (value) url.searchParams.set(key, value);
    }
    if (visited.has(url.href)) throw new Error('Invalid user pagination URL.');
    visited.add(url.href);
    const page = await api.get<UserListResponse>(url.href, { signal });
    const data: UserListResponse = page.data;
    users.push(...(Array.isArray(data) ? data : data.results));
    next = Array.isArray(data) ? null : (data.next ?? null);
  }
  return users;
}

export async function getUser(id: string): Promise<User> {
  const { data } = await api.get<User>(userEndpoints.detail(id));
  return data;
}

export async function updateUser(
  id: string,
  data: Partial<User>,
): Promise<User> {
  const { data: updatedUser } = await api.put<User>(
    ENDPOINTS.USER.DETAIL(id),
    data,
  );
  return updatedUser;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(userEndpoints.detail(id));
}

export async function updateUserStatus(
  id: string,
  status: string,
): Promise<User> {
  const { data } = await api.put<User>(userEndpoints.modifyStatus(id), {
    status,
  });
  return data;
}

export async function updateUserAdminPrivileges(
  id: string,
  isAdmin: boolean,
): Promise<User> {
  const { data } = await api.put<User>(
    userEndpoints.modifyAdminPrivileges(id),
    { is_admin: isAdmin },
  );
  return data;
}

export async function updateCurrentUser(data: Partial<User>): Promise<User> {
  const { data: updatedUser } = await api.put<User>(ENDPOINTS.USER.ME, data);
  setCurrentUser(updatedUser);
  return updatedUser;
}

export async function uploadUserAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('avatar', file);
  const { data } = await api.put<User>(ENDPOINTS.USER.ME, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  setCurrentUser(data);
  return data;
}

export function readTokens(): Tokens | null {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    const tokens = JSON.parse(stored) as Tokens;
    return typeof tokens?.access === 'string' &&
      tokens.access.length > 0 &&
      typeof tokens.refresh === 'string' &&
      tokens.refresh.length > 0
      ? tokens
      : null;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: Tokens) {
  if (
    !tokens ||
    typeof tokens.access !== 'string' ||
    !tokens.access ||
    typeof tokens.refresh !== 'string' ||
    !tokens.refresh
  )
    throw new Error('Invalid authentication response.');
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export const AUTH_EVENT = 'learninfy:auth';
export function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}
export function clearTokens() {
  clearCurrentUser();
  localStorage.removeItem(TOKEN_KEY);
  notifyAuthChange();
}

export const api = axios.create({
  baseURL: API_ROOT,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let sessionVersion = 0;
let currentUser: User | null = null;
let currentUserRequest: Promise<User> | null = null;

export function getCurrentUser(
  options: { force?: boolean } = {},
): Promise<User> {
  if (currentUser && !options.force) return Promise.resolve(currentUser);
  const version = sessionVersion;
  currentUserRequest ??= api
    .get<User>(ENDPOINTS.USER.ME)
    .then(({ data }) => {
      if (version !== sessionVersion) throw new Error('Session changed.');
      currentUser = data;
      return data;
    })
    .finally(() => {
      if (version === sessionVersion) currentUserRequest = null;
    });
  return currentUserRequest;
}

export function setCurrentUser(user: User) {
  currentUser = user;
}

export function getSessionVersion() {
  return sessionVersion;
}

export function clearCurrentUser() {
  sessionVersion += 1;
  refreshRequest = null;
  currentUser = null;
  currentUserRequest = null;
}

api.interceptors.request.use((config) => {
  (config as RetryConfig)._sessionVersion = sessionVersion;
  const tokens = readTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

let refreshRequest: Promise<Tokens> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const tokens = readTokens();
    if (
      original?._sessionVersion !== undefined &&
      original._sessionVersion !== sessionVersion
    )
      return Promise.reject(error);
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      !tokens?.refresh ||
      original.url?.includes(authEndpoints.refresh)
    ) {
      if (error.response?.status === 401 && original?._retry) clearTokens();
      return Promise.reject(error);
    }

    if (
      [
        authEndpoints.signIn,
        authEndpoints.signOut,
        authEndpoints.sendResetPasswordEmail,
        authEndpoints.activateAccount,
        authEndpoints.resetPassword,
      ].some((path) => original.url?.includes(path))
    )
      return Promise.reject(error);
    const version = sessionVersion;
    original._retry = true;
    // A slower request may return 401 after another request already rotated tokens.
    if (original.headers?.Authorization !== `Bearer ${tokens.access}`) {
      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${tokens.access}`,
      };
      return api(original);
    }
    refreshRequest ??= axios
      .post<Tokens>(
        `${API_ROOT}${ENDPOINTS.AUTH.REFRESH}`,
        {
          refresh: tokens.refresh,
        },
        { timeout: 15000 },
      )
      .then(({ data }) => {
        if (version !== sessionVersion) throw new Error('Session changed.');
        const refreshed = {
          access: data.access,
          refresh: data.refresh ?? tokens.refresh,
        };
        saveTokens(refreshed);
        return refreshed;
      })
      .finally(() => {
        if (version === sessionVersion) refreshRequest = null;
      });

    try {
      const refreshed = await refreshRequest;
      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${refreshed.access}`,
      };
      return api(original);
    } catch (refreshError) {
      const status = axios.isAxiosError(refreshError)
        ? refreshError.response?.status
        : undefined;
      const invalidSession =
        !axios.isAxiosError(refreshError) ||
        status === 400 ||
        status === 401 ||
        status === 403;
      if (version === sessionVersion && invalidSession) clearTokens();
      return Promise.reject(refreshError);
    }
  },
);

export function apiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as
    | {
        detail?: string;
        message?: string;
        non_field_errors?: string[];
        [key: string]: unknown;
      }
    | undefined;
  const fieldMessage = data
    ? Object.values(data).find(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      )
    : undefined;
  return (
    data?.detail ??
    data?.message ??
    data?.non_field_errors?.[0] ??
    fieldMessage ??
    fallback
  );
}

export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error) || !error.response?.data) return {};
  const data = error.response.data as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(data)
      .filter(
        ([, value]) => Array.isArray(value) && typeof value[0] === 'string',
      )
      .map(([key, value]) => [key, (value as string[])[0]]),
  );
}
