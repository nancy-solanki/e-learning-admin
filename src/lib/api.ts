import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import { ENDPOINTS } from '../config/endpoints';
import type { User } from '../types/auth';

export type Tokens = { access: string; refresh: string };

export const API_ROOT =
  import.meta.env.VITE_API_ROOT_URL ?? 'http://localhost:8000';
const TOKEN_KEY = 'learninfy.auth';

type RetryConfig = AxiosRequestConfig & { _retry?: boolean };

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

export type UserListResponse = User[] | { results: User[]; count?: number };

export async function listUsers(): Promise<UserListResponse> {
  const { data } = await api.get<UserListResponse>(userEndpoints.list);
  return data;
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
  const { data } = await api.patch<User>(userEndpoints.modifyStatus(id), {
    status,
  });
  return data;
}

export async function updateUserAdminPrivileges(
  id: string,
  isAdmin: boolean,
): Promise<User> {
  const { data } = await api.patch<User>(
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
    return tokens.access && tokens.refresh ? tokens : null;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: Tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: API_ROOT,
  headers: { 'Content-Type': 'application/json' },
});

let currentUser: User | null = null;
let currentUserRequest: Promise<User> | null = null;

export function getCurrentUser(
  options: { force?: boolean } = {},
): Promise<User> {
  if (currentUser && !options.force) return Promise.resolve(currentUser);
  currentUserRequest ??= api
    .get<User>(ENDPOINTS.USER.ME)
    .then(({ data }) => {
      currentUser = data;
      return data;
    })
    .finally(() => {
      currentUserRequest = null;
    });
  return currentUserRequest;
}

export function setCurrentUser(user: User) {
  currentUser = user;
}

export function clearCurrentUser() {
  currentUser = null;
  currentUserRequest = null;
}

api.interceptors.request.use((config) => {
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
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      !tokens?.refresh ||
      original.url?.includes(authEndpoints.refresh)
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    refreshRequest ??= axios
      .post<Tokens>(`${API_ROOT}${ENDPOINTS.AUTH.REFRESH}`, {
        refresh: tokens.refresh,
      })
      .then(({ data }) => {
        saveTokens(data);
        return data;
      })
      .finally(() => {
        refreshRequest = null;
      });

    try {
      const refreshed = await refreshRequest;
      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${refreshed.access}`,
      };
      return api(original);
    } catch (refreshError) {
      clearTokens();
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
    data?.detail ?? data?.message ?? data?.non_field_errors?.[0] ?? fieldMessage ?? fallback
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
