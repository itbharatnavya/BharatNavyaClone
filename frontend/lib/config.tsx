"use client";

// BharatSource — site config context. Loads the admin-editable site config
// (branding, homepage hero copy, feature on/off flags, contact, footer) once on
// mount from GET /api/config. Pages read it via useConfig() and gate every
// optional feature behind its flag. Safe defaults are provided so pages can
// render immediately, before (or even if) the config load resolves.

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getConfig } from "./api";
import type {
  Branding,
  HomepageConfig,
  ContactConfig,
  FooterConfig,
  FeatureFlags,
  SiteConfig,
} from "./api";

interface ConfigContextValue {
  branding: Branding;
  homepage: HomepageConfig;
  featureFlags: FeatureFlags;
  contact: ContactConfig;
  footer: FooterConfig;
  loading: boolean;
}

// Every optional feature defaults to ON so pages render fully before config
// loads; admin config only turns things OFF.
const DEFAULT_FLAGS: FeatureFlags = {
  chat: true,
  ai: true,
  voiceSearch: true,
  aiAutofill: true,
  stories: true,
  storyHighlights: true,
  blogs: true,
  referral: true,
  follow: true,
  notifications: true,
  reviews: true,
  reports: true,
  nearMe: true,
  multiLanguage: true,
  ads: true,
  featuredListings: true,
  // Inverted on purpose (every other flag above defaults ON): Recruitment is still
  // being finished, so an unfinished product must never accidentally go live just
  // because a config fetch failed. Flip via the admin panel (Site Config), or force it
  // from the environment with backend/.env's RECRUITMENT_LIVE (env wins over admin —
  // see backend/routes/config.js) — RECRUITMENT.md §5.
  recruitmentLive: false,
  // Same reasoning as recruitmentLive above — Consultations isn't a promoted
  // suite product this phase (see CLAUDE.md §1). Flip via the admin panel
  // (Site Config's "+ Add flag" grid), or force it from the environment with
  // backend/.env's CONSULTATIONS_LIVE.
  consultationsLive: false,
};

const DEFAULT_BRANDING: Branding = {
  siteName: "Bharat Navya",
  tagline: "Companies, work and opportunity—connected.",
  logoText: "Bharat Navya",
};

const DEFAULT_HOMEPAGE: HomepageConfig = {
  heroTitle: "Find any vendor. Sell anything.",
  heroSubtitle:
    "Describe what you need and let AI find the right vendor across every Indian industry.",
  heroExamples: [],
  featuredCategorySlugs: [],
  showStories: true,
  showTrending: true,
  showFeaturedSellers: true,
  showCategoryGrid: true,
};

const DEFAULT_CONTACT: ContactConfig = {};
const DEFAULT_FOOTER: FooterConfig = {
  about:
    "One account for sourcing and hiring: verified suppliers on Directory, vetted candidates on Recruitment. A mediator platform, we never process payments or hold inventory.",
};

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getConfig()
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch(() => {
        /* keep safe defaults */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ConfigContextValue>(
    () => ({
      // Merge fetched config over defaults so any missing key falls back safely.
      // Public migration contract: the backend still carries the legacy
      // suite name, while the frontend brand is Bharat Navya. Keep the API
      // shape and every other remotely-managed branding field compatible.
      branding: {
        ...DEFAULT_BRANDING,
        ...(config?.branding || {}),
        siteName: "Bharat Navya",
        logoText: "Bharat Navya",
        tagline: "Companies, work and opportunity—connected.",
      },
      homepage: { ...DEFAULT_HOMEPAGE, ...(config?.homepage || {}) },
      featureFlags: { ...DEFAULT_FLAGS, ...(config?.featureFlags || {}) },
      contact: { ...DEFAULT_CONTACT, ...(config?.contact || {}) },
      footer: { ...DEFAULT_FOOTER, ...(config?.footer || {}) },
      loading,
    }),
    [config, loading]
  );

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    // Fall back to safe defaults instead of throwing, so a component rendered
    // outside the provider (e.g. in isolation) still works.
    return {
      branding: DEFAULT_BRANDING,
      homepage: DEFAULT_HOMEPAGE,
      featureFlags: DEFAULT_FLAGS,
      contact: DEFAULT_CONTACT,
      footer: DEFAULT_FOOTER,
      loading: false,
    };
  }
  return ctx;
}
