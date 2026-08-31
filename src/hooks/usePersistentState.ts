import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) as T : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private browsing and test environments.
    }
  }, [key, value]);

  const setPersistentValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue((current) => {
      const resolved = typeof next === 'function' ? (next as (value: T) => T)(current) : next;
      try {
        window.localStorage?.setItem(key, JSON.stringify(resolved));
      } catch {
        // State still updates when storage is unavailable.
      }
      return resolved;
    });
  }, [key]);

  return [value, setPersistentValue] as const;
}
