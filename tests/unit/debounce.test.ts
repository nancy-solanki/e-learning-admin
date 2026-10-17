import { afterEach, expect, it, vi } from 'vitest';

// Exercise the hook's effect lifecycle without requiring a DOM renderer.
const harness = vi.hoisted(() => ({
  value: undefined as unknown,
  cleanup: undefined as undefined | (() => void),
  publish: vi.fn(),
}));
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    if (harness.value === undefined) harness.value = initial;
    return [
      harness.value,
      (update: () => unknown) => {
        harness.value = update();
        harness.publish(harness.value);
      },
    ];
  },
  useEffect: (effect: () => () => void) => {
    harness.cleanup?.();
    harness.cleanup = effect();
  },
}));
import {
  SEARCH_DEBOUNCE_MS,
  useDebouncedValue as renderValue,
} from '../../src/hooks/useDebouncedValue';
afterEach(() => {
  harness.cleanup?.();
  harness.cleanup = undefined;
  harness.value = undefined;
  harness.publish.mockClear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('only publishes the final search after a full idle interval', () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', globalThis);
  renderValue('');
  for (const text of ['j', 'ja', 'jav', 'java', 'javascript']) {
    renderValue(text);
    vi.advanceTimersByTime(400);
    expect(harness.publish).not.toHaveBeenCalled();
  }
  vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 400);
  expect(harness.publish).toHaveBeenCalledExactlyOnceWith('javascript');
});
it('cancels pending work on unmount', () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', globalThis);
  renderValue('unfinished');
  harness.cleanup?.();
  vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  expect(harness.publish).not.toHaveBeenCalled();
});
