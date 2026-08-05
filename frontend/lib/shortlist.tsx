"use client";

// BharatSource — SHORTLIST (saved products).
// For a LOGGED-IN user this syncs with the server (/api/shortlist): it loads on
// mount and applies optimistic add/remove, reverting on failure. For a GUEST it
// falls back to a localStorage list under localStorage["bs_shortlist"].
//
// Exposes { ids, toggle(id), has(id), loading }. `ids` is the single source of
// truth the heart toggles (ListingCard / listing detail / shortlist page) read.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import * as api from "@/lib/api";

const STORAGE_KEY = "bs_shortlist";

interface ShortlistContextValue {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  loading: boolean;
}

const ShortlistContext = createContext<ShortlistContextValue | null>(null);

// Guest persistence helpers (SSR-guarded, defensive against corrupt values).
function readStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}
function writeStored(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load the shortlist once auth has resolved: from the server for a logged-in
  // user, from localStorage for a guest. Re-runs on login / logout.
  useEffect(() => {
    if (authLoading) return;
    let alive = true;

    if (user) {
      setLoading(true);
      api
        .getShortlist()
        .then((res) => {
          if (alive) setIds(Array.isArray(res.ids) ? res.ids : []);
        })
        .catch(() => {
          if (alive) setIds([]);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    } else {
      setIds(readStored());
      setLoading(false);
    }

    return () => {
      alive = false;
    };
  }, [user, authLoading]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      const wasSaved = ids.includes(id);
      const next = wasSaved ? ids.filter((x) => x !== id) : [...ids, id];

      // Optimistic update.
      setIds(next);

      if (user) {
        const req = wasSaved
          ? api.removeFromShortlist(id)
          : api.addToShortlist(id);
        req
          .then((res) => {
            // Reconcile with the server's authoritative id list when available.
            if (Array.isArray(res.ids)) setIds(res.ids);
          })
          .catch(() => {
            // Revert on failure.
            setIds((prev) =>
              wasSaved
                ? prev.includes(id)
                  ? prev
                  : [...prev, id]
                : prev.filter((x) => x !== id)
            );
            addToast("Could not update your shortlist. Please try again.", "error");
          });
      } else {
        // Guest → persist locally.
        writeStored(next);
      }
    },
    [ids, user, addToast]
  );

  const value = useMemo<ShortlistContextValue>(
    () => ({ ids, toggle, has, loading }),
    [ids, toggle, has, loading]
  );

  return (
    <ShortlistContext.Provider value={value}>
      {children}
    </ShortlistContext.Provider>
  );
}

export function useShortlist(): ShortlistContextValue {
  const ctx = useContext(ShortlistContext);
  if (!ctx) {
    throw new Error("useShortlist must be used within a ShortlistProvider");
  }
  return ctx;
}
