import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import {
  fetchCurrentUser,
  updateCurrentUser as updateProfile,
  uploadUserAvatar as uploadAvatar,
} from '../api/services/users';
import { getSessionVersion } from './session';
import { queryClient, queryKeys } from './queryClient';
import type { User } from '../types/auth';
export function profileOptions() {
  const version = getSessionVersion();
  return {
    queryKey: queryKeys.profile,
    staleTime: Infinity,
    queryFn: async () => {
      const user = await fetchCurrentUser();
      if (version !== getSessionVersion()) throw new Error('Session changed.');
      return user;
    },
  };
}
export function useCurrentUser() {
  return useQuery(profileOptions());
}
export async function getCurrentUser(options: { force?: boolean } = {}) {
  const version = getSessionVersion();
  try {
    return await queryClient.fetchQuery({
      ...profileOptions(),
      staleTime: options.force ? 0 : Infinity,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401)
      throw error;
    if (version !== getSessionVersion())
      throw new Error('Session changed.', { cause: error });
    throw error;
  }
}
export function setCurrentUser(user: User) {
  queryClient.setQueryData(queryKeys.profile, user);
}
export async function updateCurrentUser(data: Partial<User>) {
  const version = getSessionVersion();
  const user = await updateProfile(data);
  if (version === getSessionVersion()) setCurrentUser(user);
  return user;
}
export async function uploadUserAvatar(file: File) {
  const version = getSessionVersion();
  const user = await uploadAvatar(file);
  if (version === getSessionVersion()) setCurrentUser(user);
  return user;
}
