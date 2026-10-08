import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { API_ROOT } from './config';
import { ENDPOINTS } from './endpoints';
import {
  clearSession,
  getSessionVersion,
  getSessionUser,
  setSessionUser,
} from '../state/session';
type RetryConfig = AxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRetry?: boolean;
  _sessionVersion?: number;
  _generation?: number;
};
export const api = axios.create({
  baseURL: API_ROOT,
  timeout: 15000,
  withCredentials: true,
});
// Separate transport prevents CSRF initialization and refresh from recursing.
export const authTransport = axios.create({
  baseURL: API_ROOT,
  timeout: 15000,
  withCredentials: true,
});
let csrfToken: string | undefined;
let csrfPromise: Promise<string> | undefined;
let refreshPromise: Promise<unknown> | undefined;
let generation = 0;
export function resetCsrf() {
  csrfToken = undefined;
}
async function ensureCsrf() {
  if (csrfToken) return csrfToken;
  csrfPromise ??= authTransport
    .get<{ csrfToken: string }>(ENDPOINTS.AUTH.CSRF)
    .then(({ data }) => {
      if (!data.csrfToken || typeof data.csrfToken !== 'string')
        throw new Error('Could not initialize CSRF');
      csrfToken = data.csrfToken;
      return csrfToken;
    })
    .finally(() => {
      csrfPromise = undefined;
    });
  return csrfPromise;
}
api.interceptors.request.use(async (config) => {
  const request = config as RetryConfig;
  request._sessionVersion ??= getSessionVersion();
  request._generation = generation;
  config.withCredentials = true;
  if (!['get', 'head', 'options'].includes(config.method ?? 'get')) {
    config.headers.set('X-CSRFToken', await ensureCsrf());
  }
  if (config.data instanceof FormData) config.headers.setContentType(false);
  return config;
});
async function refresh() {
  const rotate = async () => {
    // Another tab may have rotated while we waited for the browser-wide lock.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      try {
        await authTransport.get(ENDPOINTS.USER.ME);
        return;
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 401)
          throw error;
      }
    }
    await authTransport.post(ENDPOINTS.AUTH.REFRESH, undefined, {
      headers: { 'X-CSRFToken': await ensureCsrf() },
    });
  };
  if (typeof navigator !== 'undefined' && navigator.locks) {
    await navigator.locks.request(`learninfy-auth:${API_ROOT}`, rotate);
  } else await rotate();
  generation += 1;
}
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (
      !original ||
      original._sessionVersion !== getSessionVersion() ||
      original.skipAuthRetry ||
      error.response?.status !== 401 ||
      /\/auth\//.test(original.url ?? '')
    )
      throw error;
    if (original._retry) {
      expireSession();
      throw error;
    }
    original._retry = true;
    const version = getSessionVersion();
    try {
      if (original._generation === generation) {
        refreshPromise ??= refresh().finally(() => {
          refreshPromise = undefined;
        });
        await refreshPromise;
      }
      if (version !== getSessionVersion()) throw new Error('Session changed.');
      return await api(original);
    } catch (refreshError) {
      if (
        version === getSessionVersion() &&
        axios.isAxiosError(refreshError) &&
        refreshError.response?.status === 401
      )
        expireSession();
      throw refreshError;
    }
  },
);

export async function withAuthLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(`learninfy-auth:${API_ROOT}`, action);
  }
  return action();
}

function expireSession() {
  // Do not cancel the startup profile query before its 401 reaches the gate.
  if (getSessionUser()) clearSession();
  else setSessionUser(null);
}
