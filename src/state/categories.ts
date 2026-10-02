import { useMutation, useQuery } from '@tanstack/react-query';
import * as categoriesApi from '../api/services/categories';
import { queryClient, queryKeys } from './queryClient';
import { getSessionVersion } from './session';

export function useCategories(
  filters: Parameters<typeof categoriesApi.listCategories>[0],
) {
  return useQuery({
    staleTime: 0,
    queryKey: [...queryKeys.categories, 'list', filters],
    queryFn: ({ signal }) => categoriesApi.listCategories(filters, signal),
  });
}
export function useCategoryActions() {
  const version = getSessionVersion();
  const refresh = () =>
    version === getSessionVersion()
      ? queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      : Promise.resolve();
  const save = useMutation({
    mutationFn: ({ body, slug }: { body: FormData; slug?: string }) =>
      categoriesApi.saveCategory(body, slug),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: categoriesApi.deleteCategory,
    onSuccess: refresh,
  });
  return {
    saveCategory: (body: FormData, slug?: string) =>
      save.mutateAsync({ body, slug }),
    deleteCategory: remove.mutateAsync,
  };
}
export function getCategory(slug: string) {
  return queryClient.fetchQuery({
    queryKey: [...queryKeys.categories, 'detail', slug],
    queryFn: () => categoriesApi.getCategory(slug),
    staleTime: 0,
  });
}
