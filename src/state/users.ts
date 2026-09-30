import { useMutation, useQuery } from '@tanstack/react-query';
import * as usersApi from '../api/services/users';
import type { User } from '../types/auth';
import { queryClient, queryKeys } from './queryClient';
import { getSessionVersion } from './session';

export function useUsers(filters: usersApi.UserListFilters) {
  return useQuery({
    queryKey: [...queryKeys.users, filters],
    queryFn: ({ signal }) => usersApi.listUsers(filters, signal),
  });
}
export function useUserActions() {
  const version = getSessionVersion();
  const refresh = () =>
    version === getSessionVersion()
      ? queryClient.invalidateQueries({ queryKey: queryKeys.users })
      : Promise.resolve();
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      usersApi.updateUser(id, data),
    onSuccess: refresh,
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      usersApi.updateUserStatus(id, value),
    onSuccess: refresh,
  });
  const privileges = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      usersApi.updateUserAdminPrivileges(id, value),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: refresh,
  });
  return {
    updateUser: (id: string, data: Partial<User>) =>
      update.mutateAsync({ id, data }),
    updateUserStatus: (id: string, value: string) =>
      status.mutateAsync({ id, value }),
    updateUserAdminPrivileges: (id: string, value: boolean) =>
      privileges.mutateAsync({ id, value }),
    deleteUser: remove.mutateAsync,
  };
}
