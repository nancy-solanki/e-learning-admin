import { API_ROOT } from '../api/config';
import type { User } from '../types/auth';
export function avatarUrl(avatar: User['avatar'] | undefined) {
  const value = typeof avatar === 'string' ? avatar : avatar?.url;
  if (!value) return undefined;
  try {
    return new URL(value, new URL(API_ROOT || '/', window.location.origin))
      .href;
  } catch {
    return undefined;
  }
}
