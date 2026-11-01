import type { User } from '../types/auth';
import { canAccessPage, resolveAppRole } from '../state/access';

export function isAdmin(user: User | null): boolean {
  return resolveAppRole(user) === 'admin';
}

export function isInstructor(user: User | null): boolean {
  return resolveAppRole(user) === 'instructor';
}

export function canAccessEnrollments(user: User | null): boolean {
  return canAccessPage(resolveAppRole(user), 'enrollments');
}
