import { useMutation, useQuery } from '@tanstack/react-query';
import * as localizationsApi from '../api/services/localizations';
import { queryClient, queryKeys } from './queryClient';
import { getSessionVersion } from './session';

export function useLocalizations(
  filters: localizationsApi.LocalizationFilters,
) {
  return useQuery({
    queryKey: [...queryKeys.localizations, 'list', filters],
    queryFn: ({ signal }) =>
      localizationsApi.listLocalizations(filters, signal),
  });
}

export function useLocalizationActions() {
  const version = getSessionVersion();
  const refresh = () =>
    version === getSessionVersion()
      ? queryClient.invalidateQueries({ queryKey: queryKeys.localizations })
      : Promise.resolve();

  const create = useMutation({
    mutationFn: localizationsApi.createLocalization,
    onSuccess: refresh,
  });
  const replace = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: localizationsApi.LocalizationDraft;
    }) => localizationsApi.replaceLocalization(id, body),
    onSuccess: refresh,
  });
  const toggle = useMutation({
    mutationFn: localizationsApi.toggleLocalization,
    onSuccess: refresh,
  });

  return {
    createLocalization: create.mutateAsync,
    replaceLocalization: (
      id: string,
      body: localizationsApi.LocalizationDraft,
    ) => replace.mutateAsync({ id, body }),
    toggleLocalization: toggle.mutateAsync,
  };
}
