import axios from 'axios';

function firstMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() ? value : undefined;
  if (Array.isArray(value)) return value.map(firstMessage).find(Boolean);
  if (value && typeof value === 'object')
    return Object.values(value).map(firstMessage).find(Boolean);
  return undefined;
}

export function apiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
  options: { includeFieldErrors?: boolean } = {},
): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data: unknown = error.response?.data;
  if (typeof data === 'string' || Array.isArray(data))
    return firstMessage(data) ?? fallback;
  if (!data || typeof data !== 'object') return fallback;
  const record = data as Record<string, unknown>;
  return (
    firstMessage(record.detail) ??
    firstMessage(record.message) ??
    firstMessage(record.non_field_errors) ??
    firstMessage(record.errors) ??
    Object.values(record)
      .map((value) =>
        typeof value === 'string' || options.includeFieldErrors
          ? firstMessage(value)
          : undefined,
      )
      .find(Boolean) ??
    fallback
  );
}

export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const data: unknown = error.response?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const record = data as Record<string, unknown>;
  const fields =
    record.errors &&
    typeof record.errors === 'object' &&
    !Array.isArray(record.errors)
      ? (record.errors as Record<string, unknown>)
      : record;
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, value]) => typeof value === 'string' || Array.isArray(value))
      .map(([key, value]) => [key, firstMessage(value)])
      .filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
  );
}
