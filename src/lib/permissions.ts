import type { User } from '../types/auth';
export function isAdmin(user: User | null): boolean {
  return Boolean(
    user &&
    (user.is_staff ||
      user.is_superuser ||
      user.role?.some((role) =>
        ['admin', 'administrator', 'staff', 'superuser'].includes(
          role
            .trim()
            .toLowerCase()
            .replace(/^role_/, ''),
        ),
      )),
  );
}
