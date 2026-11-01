import { describe, expect, it } from 'vitest';
import type { User } from '../../src/types/auth';
import {
  canAccessPath,
  canAccessPage,
  getAccessibleDestination,
  resolveAppRole,
} from '../../src/state/access';

const user: User = {
  id: 'user-1',
  email: 'user@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  full_name: 'Ada Lovelace',
  username: 'ada',
  phone_number: '',
  avatar: null,
  birth_date: null,
  gender: '',
  email_notifications: true,
  public_profile: false,
  search_engine_visibility: false,
  share_learning_activity: false,
  role: [],
  language: 'en',
  bio: '',
};

describe('application role access', () => {
  it('resolves instructor role values from the current-user response', () => {
    expect(resolveAppRole({ ...user, role: [' ROLE_Instructor '] })).toBe(
      'instructor',
    );
    expect(resolveAppRole({ ...user, role: 'instructor' })).toBe('instructor');
    expect(resolveAppRole({ ...user, role: ['staff'] })).toBe('admin');
  });

  it('limits instructors to their management pages', () => {
    for (const page of [
      'home',
      'courses',
      'ratings',
      'coupons',
      'enrollments',
      'bank-accounts',
    ] as const) {
      expect(canAccessPage('instructor', page)).toBe(true);
    }
    for (const page of [
      'users',
      'categories',
      'sections',
      'lectures',
      'wallets',
      'localizations',
    ] as const) {
      expect(canAccessPage('instructor', page)).toBe(false);
    }
  });

  it('does not allow learner or unknown roles into any application page', () => {
    const pages = [
      'home',
      'courses',
      'ratings',
      'coupons',
      'enrollments',
      'bank-accounts',
      'wallets',
      'sections',
      'lectures',
      'users',
      'categories',
      'localizations',
      'profile',
    ] as const;
    for (const page of pages) {
      expect(canAccessPage('member', page)).toBe(false);
    }
  });

  it('preserves allowed destinations and rejects inaccessible or unknown ones', () => {
    const instructor = { ...user, role: ['instructor'] };
    const admin = { ...user, role: ['admin'] };
    expect(getAccessibleDestination(instructor, '/courses?search=design')).toBe(
      '/courses?search=design',
    );
    expect(getAccessibleDestination(instructor, '/enrollments')).toBe(
      '/enrollments',
    );
    expect(getAccessibleDestination(instructor, '/sections')).toBe('/');
    expect(getAccessibleDestination(instructor, 'https://example.com')).toBe(
      '/',
    );
    expect(canAccessPath('admin', '/courses/course-id/curriculum')).toBe(false);
    expect(canAccessPath('instructor', '/courses/course-id/curriculum')).toBe(
      true,
    );
    expect(canAccessPath('admin', '/courses/course-id/edit')).toBe(false);
    expect(canAccessPath('admin', '/courses/create')).toBe(false);
    expect(
      getAccessibleDestination(admin, '/courses/course-id/curriculum'),
    ).toBe('/');
  });
});
