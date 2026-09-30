import { queryClient } from './queryClient';
export type Tokens = { access: string; refresh: string };
const TOKEN_KEY = 'learninfy.auth';
let sessionVersion = 0;
export function getSessionVersion() {
  return sessionVersion;
}
export function clearSessionCache() {
  sessionVersion += 1;
  queryClient.clear();
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
  clearSessionCache();
  localStorage.removeItem(TOKEN_KEY);
  notifyAuthChange();
}
