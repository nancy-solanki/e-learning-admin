import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { API_ROOT } from './config';
import { authEndpoints, ENDPOINTS } from './endpoints';
import {
  readTokens,
  saveTokens,
  clearTokens,
  getSessionVersion,
  type Tokens,
} from '../state/session';
type RetryConfig = AxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRetry?: boolean;
  _sessionVersion?: number;
};
export const api = axios.create({
  baseURL: API_ROOT,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
api.interceptors.request.use((config) => {
  (config as RetryConfig)._sessionVersion = getSessionVersion();
  const tokens = readTokens();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

let refreshRequest: Promise<Tokens> | null = null;
let refreshVersion = -1;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const tokens = readTokens();
    if (
      original?._sessionVersion !== undefined &&
      original._sessionVersion !== getSessionVersion()
    )
      return Promise.reject(error);
    if (
      original?.skipAuthRetry ||
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
    const version = getSessionVersion();
    original._retry = true;
    // A slower request may return 401 after another request already rotated tokens.
    if (original.headers?.Authorization !== `Bearer ${tokens.access}`) {
      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${tokens.access}`,
      };
      return api(original);
    }
    if (refreshVersion !== version) {
      refreshRequest = null;
      refreshVersion = version;
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
        if (version !== getSessionVersion())
          throw new Error('Session changed.');
        const refreshed = {
          access: data.access,
          refresh: data.refresh ?? tokens.refresh,
        };
        saveTokens(refreshed);
        return refreshed;
      })
      .finally(() => {
        if (version === getSessionVersion()) refreshRequest = null;
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
      if (version === getSessionVersion() && invalidSession) clearTokens();
      return Promise.reject(refreshError);
    }
  },
);
