import { useEffect, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 700;

/** Keep inputs immediate while delaying work until the value stops changing.
 * Memoize object values before passing them to this hook.
 */
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedValue(() => value),
      delay,
    );
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
