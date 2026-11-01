import type { User } from '../types/auth';
import { useCurrentUser } from './profile';

export type AppRole = 'admin' | 'instructor' | 'member';
export type AppPage =
  | 'home'
  | 'courses'
  | 'ratings'
  | 'coupons'
  | 'enrollments'
  | 'bank-accounts'
  | 'wallets'
  | 'sections'
  | 'lectures'
  | 'users'
  | 'categories'
  | 'localizations'
  | 'profile';

const pageByPath: Record<string, AppPage> = {
  '/': 'home',
  '/courses': 'courses',
  '/ratings': 'ratings',
  '/coupons': 'coupons',
  '/enrollments': 'enrollments',
  '/bank-accounts': 'bank-accounts',
  '/wallets': 'wallets',
  '/sections': 'sections',
  '/lectures': 'lectures',
  '/users': 'users',
  '/categories': 'categories',
  '/localizations': 'localizations',
  '/profile': 'profile',
};

const instructorPages: AppPage[] = [
  'home',
  'courses',
  'ratings',
  'coupons',
  'enrollments',
  'bank-accounts',
  'profile',
];

export function resolveAppRole(user: User | null | undefined): AppRole {
  const roles = normalizeUserRoles(user);

  if (
    user?.is_staff ||
    user?.is_superuser ||
    roles.some((role) =>
      ['admin', 'administrator', 'staff', 'superuser'].includes(role),
    )
  ) {
    return 'admin';
  }
  if (roles.includes('instructor')) return 'instructor';
  return 'member';
}

export function normalizeUserRoles(user: User | null | undefined): string[] {
  const rawRoles: unknown = user?.role;
  return (
    Array.isArray(rawRoles)
      ? rawRoles
      : typeof rawRoles === 'string'
        ? [rawRoles]
        : []
  )
    .filter((role): role is string => typeof role === 'string')
    .map((role) =>
      role
        .trim()
        .toLowerCase()
        .replace(/^role_/, ''),
    );
}

export function canAccessPage(role: AppRole, page: AppPage): boolean {
  if (role === 'member') return false;
  if (page === 'home' || page === 'profile') return true;
  if (role === 'admin') return true;
  return role === 'instructor' && instructorPages.includes(page);
}

export function canAccessPath(role: AppRole, path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0];
  const page = pageByPath[pathname];
  return page ? canAccessPage(role, page) : false;
}

export function getAccessibleDestination(
  user: User | null | undefined,
  destination: unknown,
): string {
  if (typeof destination !== 'string' || !destination.startsWith('/')) {
    return '/';
  }
  return canAccessPath(resolveAppRole(user), destination) ? destination : '/';
}

export function useAccessState() {
  const profile = useCurrentUser();
  const role = resolveAppRole(profile.data);
  return {
    ...profile,
    role,
    isAdmin: role === 'admin',
    isInstructor: role === 'instructor',
    canAccess: (page: AppPage) => canAccessPage(role, page),
  };
}
