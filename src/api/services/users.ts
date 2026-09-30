import { api } from '../axios';
import { API_ROOT } from '../config';
import { ENDPOINTS, userEndpoints } from '../endpoints';
import type { User } from '../../types/auth';
export type UserListResponse =
  User[] | { results: User[]; count?: number; next?: string | null };

export type UserListFilters = {
  status?: 'active' | 'pending' | 'suspended' | 'inactive';
  search?: string;
  ordering?: 'created_at' | '-created_at';
};

// Follow pagination within the backend-filtered result set.
export async function listUsers(
  filters: UserListFilters = {},
  signal?: AbortSignal,
): Promise<User[]> {
  const users: User[] = [];
  const base = new URL(
    API_ROOT || window.location.origin,
    window.location.origin,
  );
  let next: string | null = userEndpoints.list;
  const visited = new Set<string>();
  while (next) {
    const url: URL = new URL(next, base);
    if (
      url.origin !== base.origin ||
      url.pathname !== userEndpoints.list ||
      visited.has(url.href)
    ) {
      throw new Error('Invalid user pagination URL.');
    }
    for (const [key, value] of Object.entries(filters)) {
      if (value) url.searchParams.set(key, value);
    }
    if (visited.has(url.href)) throw new Error('Invalid user pagination URL.');
    visited.add(url.href);
    const page = await api.get<UserListResponse>(url.href, { signal });
    const data: UserListResponse = page.data;
    users.push(...(Array.isArray(data) ? data : data.results));
    next = Array.isArray(data) ? null : (data.next ?? null);
  }
  return users;
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
  const { data } = await api.put<User>(userEndpoints.modifyStatus(id), {
    status,
  });
  return data;
}

export async function updateUserAdminPrivileges(
  id: string,
  isAdmin: boolean,
): Promise<User> {
  const { data } = await api.put<User>(
    userEndpoints.modifyAdminPrivileges(id),
    { is_admin: isAdmin },
  );
  return data;
}

export async function updateCurrentUser(data: Partial<User>): Promise<User> {
  const { data: updatedUser } = await api.put<User>(ENDPOINTS.USER.ME, data);
  return updatedUser;
}

export async function uploadUserAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('avatar', file);
  const { data } = await api.put<User>(ENDPOINTS.USER.ME, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<User> {
  return (await api.get<User>(ENDPOINTS.USER.ME, { signal })).data;
}
