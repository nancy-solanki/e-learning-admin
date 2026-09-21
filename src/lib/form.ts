import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { apiFieldErrors } from './api';

export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
) {
  Object.entries(apiFieldErrors(error)).forEach(([name, message]) => {
    setError(name as Path<T>, { type: 'server', message });
  });
}
