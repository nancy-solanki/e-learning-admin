import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});
export const queryKeys = {
  profile: ['profile'] as const,
  users: ['users'] as const,
  categories: ['categories'] as const,
  localizations: ['localizations'] as const,
};
