import { useSyncExternalStore } from 'react';

export function useObjectUrl(file: File | null) {
  return useSyncExternalStore(
    (notify) => {
      if (!file) return () => {};
      const url = URL.createObjectURL(file);
      objectUrls.set(file, url);
      notify();
      return () => {
        URL.revokeObjectURL(url);
        objectUrls.delete(file);
      };
    },
    () => (file ? (objectUrls.get(file) ?? '') : ''),
    () => '',
  );
}

const objectUrls = new WeakMap<File, string>();
