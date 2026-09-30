import axios from 'axios';
export function apiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as
    | {
        detail?: string;
        message?: string;
        non_field_errors?: string[];
        [key: string]: unknown;
      }
    | undefined;
  const fieldMessage = data
    ? Object.values(data).find(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      )
    : undefined;
  return (
    data?.detail ??
    data?.message ??
    data?.non_field_errors?.[0] ??
    fieldMessage ??
    fallback
  );
}

export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error) || !error.response?.data) return {};
  const data = error.response.data as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(data)
      .filter(
        ([, value]) => Array.isArray(value) && typeof value[0] === 'string',
      )
      .map(([key, value]) => [key, (value as string[])[0]]),
  );
}
