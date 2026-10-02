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
  const applyUser = async (updated: User) => {
    if (version !== getSessionVersion()) return;
    await queryClient.cancelQueries({ queryKey: queryKeys.users });
    if (version !== getSessionVersion()) return;
    queryClient.setQueriesData<User[]>({ queryKey: queryKeys.users }, (users) =>
      users?.map((user) =>
        user.id === updated.id ? { ...user, ...updated } : user,
      ),
    );
    // The backend determines search matches and filtered result membership.
    await queryClient.invalidateQueries({
      queryKey: queryKeys.users,
      predicate: (query) => {
        const filters = query.queryKey[1] as
          usersApi.UserListFilters | undefined;
        return Boolean(filters?.search || filters?.status);
      },
    });
  };
  const removeUser = async (_: void, id: string) => {
    if (version !== getSessionVersion()) return;
    await queryClient.cancelQueries({ queryKey: queryKeys.users });
    if (version !== getSessionVersion()) return;
    queryClient.setQueriesData<User[]>({ queryKey: queryKeys.users }, (users) =>
      users?.filter((user) => user.id !== id),
    );
  };
  const invite = useMutation({
    mutationFn: usersApi.inviteUser,
    onSuccess: refresh,
  });
  const resendInvite = useMutation({
    mutationFn: usersApi.resendUserInvitation,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      usersApi.updateUser(id, data),
    onSuccess: applyUser,
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      usersApi.updateUserStatus(id, value),
    onSuccess: applyUser,
  });
  const privileges = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      usersApi.updateUserAdminPrivileges(id, value),
    onSuccess: applyUser,
  });
  const remove = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: removeUser,
  });
  return {
    inviteUser: invite.mutateAsync,
    resendUserInvitation: resendInvite.mutateAsync,
    updateUser: (id: string, data: Partial<User>) =>
      update.mutateAsync({ id, data }),
    updateUserStatus: (id: string, value: string) =>
      status.mutateAsync({ id, value }),
    updateUserAdminPrivileges: (id: string, value: boolean) =>
      privileges.mutateAsync({ id, value }),
    deleteUser: remove.mutateAsync,
  };
}
