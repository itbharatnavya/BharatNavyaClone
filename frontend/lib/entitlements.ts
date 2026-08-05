"use client";

// lib/entitlements.ts — client-side runtime gating helpers.
//
// Reads the composed matrix from GET /api/entitlements (the single source of
// truth) and answers "is this feature allowed for this tier?". The catalog is
// fetched once and cached at module level so every gate on a page shares one
// network round-trip; useEntitlements() subscribes a component to that cache.

import { useEffect, useState } from "react";
import { getEntitlements, type Entitlements } from "./api";
import type { User } from "./types";

/** The seller's plan tier (defaults to "free" for buyers / no seller profile). */
export function tierOf(user?: User | null): string {
  return user?.sellerProfile?.planTier || "free";
}

/**
 * True when `featureId` exists in the catalog AND its `plans` include `tier`.
 * Unknown feature ids return false — callers decide whether that means "gate"
 * or "don't gate" (see AdvertiseTab for the defensive pattern).
 */
export function featureAllowed(
  entitlements: Entitlements | null | undefined,
  featureId: string,
  tier: string
): boolean {
  if (!entitlements) return false;
  const f = entitlements.features.find((x) => x.id === featureId);
  if (!f) return false;
  return (f.plans || []).includes(tier);
}

/** Whether a feature id exists in the catalog at all (for defensive gating). */
export function featureExists(
  entitlements: Entitlements | null | undefined,
  featureId: string
): boolean {
  return !!entitlements?.features.some((f) => f.id === featureId);
}

// ---- lightweight module-level cache (shared across all consumers) ----
let _cache: Entitlements | null = null;
let _inflight: Promise<Entitlements> | null = null;

/** Fetch (or reuse) the entitlements catalog. `force` bypasses the cache. */
export function loadEntitlements(force = false): Promise<Entitlements> {
  if (_cache && !force) return Promise.resolve(_cache);
  if (_inflight && !force) return _inflight;
  _inflight = getEntitlements()
    .then((e) => {
      _cache = e;
      _inflight = null;
      return e;
    })
    .catch((err) => {
      _inflight = null;
      throw err;
    });
  return _inflight;
}

/** Prime the cache with fresh data (e.g. after an admin save) so gates update. */
export function primeEntitlementsCache(e: Entitlements): void {
  _cache = e;
}

export interface UseEntitlements {
  entitlements: Entitlements | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Fetch-once hook: returns the cached catalog and re-renders when it arrives. */
export function useEntitlements(): UseEntitlements {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(_cache);
  const [loading, setLoading] = useState<boolean>(_cache == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (_cache) {
      setEntitlements(_cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadEntitlements()
      .then((e) => {
        if (!alive) return;
        setEntitlements(e);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load entitlements");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function reload() {
    setLoading(true);
    loadEntitlements(true)
      .then((e) => {
        setEntitlements(e);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load entitlements");
        setLoading(false);
      });
  }

  return { entitlements, loading, error, reload };
}
