import { queryClient } from './queryClient';
import type { User } from '../types/auth';
const TOKEN_KEY = 'learninfy.auth';
export const sessionTabId = crypto.randomUUID();
let sessionVersion = 0;
let user: User | null | undefined;
const listeners = new Set<() => void>();
export const subscribeAuth = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
export const getSessionUser = () => user;
export function getSessionVersion() {
  return sessionVersion;
}
export function clearSessionCache() {
  sessionVersion += 1;
  queryClient.clear();
}
export function setSessionUser(value: User | null) {
  user = value;
  listeners.forEach((listener) => listener());
}
export function clearSession() {
  clearSessionCache();
  setSessionUser(null);
}
// Migration only: discard the known legacy credential key, never preferences.
export function removeLegacyAuth() {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      window[name].removeItem(TOKEN_KEY);
    } catch {
      /* Storage may be disabled. */
    }
  }
}

export function broadcastSessionChange() {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel('learninfy-session');
  channel.postMessage({ source: sessionTabId });
  channel.close();
}
