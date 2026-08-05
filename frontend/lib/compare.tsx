"use client";

// BharatSource — client-side COMPARE tray.
// A tiny localStorage-backed store of listing ids the buyer wants to compare
// side by side. No login needed. Capped at MAX (4); adding a 5th is a no-op with
// a gentle toast. Persisted under localStorage["bs_compare"] and synced across tabs.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useToast } from "@/components/Toast";

const STORAGE_KEY = "bs_compare";
const MAX = 4;

interface CompareContextValue {
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  full: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

// Read the persisted ids (SSR-guarded, defensive against corrupt values).
function readStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids an SSR/client markup mismatch).
  useEffect(() => {
    setIds(readStored());
    setHydrated(true);
  }, []);

  // Persist whenever the selection changes (only once hydrated, so we never clobber
  // stored ids with the empty initial state before hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [ids, hydrated]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setIds(readStored());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const remove = useCallback((id: string) => {
    setIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => setIds([]), []);

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= MAX) {
          addToast(`You can compare up to ${MAX} products at a time.`, "info");
          return prev;
        }
        return [...prev, id];
      });
    },
    [addToast]
  );

  const value = useMemo<CompareContextValue>(
    () => ({ ids, toggle, remove, clear, has, full: ids.length >= MAX }),
    [ids, toggle, remove, clear, has]
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return ctx;
}

export const COMPARE_MAX = MAX;
