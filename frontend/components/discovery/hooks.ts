"use client";

// Thin, defensive wrappers over the shared config + i18n hooks (owned by the
// shared-additions agent: lib/config.tsx, lib/i18n.tsx). We cast to a permissive
// local shape so the discovery/home pages compile and degrade gracefully no
// matter the exact runtime shape of the admin config or the dictionary.

import { useConfig } from "@/lib/config";
import { useT } from "@/lib/i18n";
import type { ListingFilterState } from "@/components/Filters";
import type { ListingType } from "@/lib/types";

export interface AppBranding {
  siteName?: string;
  tagline?: string;
  logoUrl?: string | null;
}

export interface AppHomepage {
  heroTitle?: string;
  heroSubtitle?: string;
  heroExamples?: string[];
  featuredCategorySlugs?: string[];
  trendingCity?: string;
  // section on/off toggles (admin no-code). Undefined ⇒ shown.
  showStories?: boolean;
  showCategoryGrid?: boolean;
  showTrending?: boolean;
  showFeaturedSellers?: boolean;
  showHowItWorks?: boolean;
  showSellCta?: boolean;
  // Directory homepage additions (frontend-design-guide.md v8).
  showCategoryGroups?: boolean;
  showTrendingSearches?: boolean;
  showPopularSearches?: boolean;
  showRecentActivity?: boolean;
}

export interface AppConfig {
  branding?: AppBranding;
  homepage?: AppHomepage;
  featureFlags?: Record<string, boolean>;
  contact?: Record<string, unknown>;
  footer?: Record<string, unknown>;
}

/** Config as a permissive, always-defined object. */
export function useAppConfig(): AppConfig {
  const raw = useConfig() as unknown as AppConfig | null | undefined;
  return raw || {};
}

/** Feature-flag check (opt-in: must be explicitly true). */
export function useFlag(name: string): boolean {
  const config = useAppConfig();
  return !!config.featureFlags && config.featureFlags[name] === true;
}

/**
 * Translation helper that ALWAYS yields readable copy: if the dictionary is
 * missing the key (returns the key unchanged or empty), we fall back to the
 * supplied English string. Signature: tr("some.key", "English fallback").
 * useT() returns the full language context ({ t, lang, setLang, toggle }).
 */
export function useTr(): (key: string, fallback: string) => string {
  const { t } = useT();
  return (key: string, fallback: string) => {
    const v = t(key);
    return !v || v === key ? fallback : v;
  };
}

/** A section is shown unless the admin explicitly turned it off (false). */
export function shown(value?: boolean): boolean {
  return value !== false;
}

// ------------------------------------------------------------------
// AI-hero search → discovery seed
// The hero routes to `/<categorySlug>?city=&type=&budget=&q=` (any subset).
// Backend `navigateTo.filters` may use `budgetMax`; we also accept `maxPrice`.
// This turns those params into the removable filter state + free-text query
// that DiscoveryResults seeds and displays.
// ------------------------------------------------------------------
export interface DiscoverySeed {
  initialFilters: ListingFilterState;
  query: string;
}

type ParamBag = { get(key: string): string | null };

function toNum(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parseDiscoverySeed(sp: ParamBag): DiscoverySeed {
  const typeParam = sp.get("type");
  const type: ListingType | undefined =
    typeParam === "product" || typeParam === "service" ? typeParam : undefined;

  const budget =
    toNum(sp.get("budget")) ??
    toNum(sp.get("budgetMax")) ??
    toNum(sp.get("maxPrice"));

  const initialFilters: ListingFilterState = {
    city: sp.get("city") || undefined,
    type,
    priceMax: budget,
    verified: sp.get("verified") === "true" || undefined,
    featured: sp.get("featured") === "true" || undefined,
    category: sp.get("category") || undefined,
  };

  return { initialFilters, query: sp.get("q") || "" };
}
