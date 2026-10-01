import type { AxiosRequestConfig } from 'axios';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';

export type Localization = {
  id: string;
  language_name: string;
  country: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type LocalizationDraft = {
  language_name: string;
  country: string;
};

export type LocalizationFilters = {
  language_name?: string;
  country?: string;
  is_deleted?: boolean;
  search?: string;
  ordering: string;
  page: number;
  page_size: number;
};

export type LocalizationPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Localization[];
};

export async function listLocalizations(
  params: LocalizationFilters,
  signal?: AbortSignal,
) {
  return (
    await api.get<LocalizationPage>(ENDPOINTS.LOCALIZATION.LIST, {
      params,
      signal,
    })
  ).data;
}

export async function getLocalization(id: string) {
  return (await api.get<Localization>(ENDPOINTS.LOCALIZATION.DETAIL(id))).data;
}

export async function createLocalization(body: LocalizationDraft) {
  return (await api.post<Localization>(ENDPOINTS.LOCALIZATION.LIST, body)).data;
}

export async function replaceLocalization(id: string, body: LocalizationDraft) {
  return (await api.put<Localization>(ENDPOINTS.LOCALIZATION.DETAIL(id), body))
    .data;
}

export async function patchLocalization(
  id: string,
  body: Partial<LocalizationDraft>,
) {
  return (
    await api.patch<Localization>(ENDPOINTS.LOCALIZATION.DETAIL(id), body)
  ).data;
}

export async function toggleLocalization(id: string) {
  const config: AxiosRequestConfig & { skipAuthRetry: true } = {
    skipAuthRetry: true,
  };
  const response = await api.delete<{ message: string }>(
    ENDPOINTS.LOCALIZATION.DETAIL(id),
    config,
  );
  return response.status === 204 ? null : response.data;
}
