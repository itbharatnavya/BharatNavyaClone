"use client";

// HomeHero — thin wrapper that owns the search box's scroll-docking state
// (useSearchDock + the IntersectionObserver below) and hands the actual
// search bar down as `searchSlot` into HeroBrandCard, which renders the
// whole visible hero: headline, search, trust stats, and auth-aware CTAs,
// all inside one navy card. Keeping the docking plumbing here (rather than
// inside the card) means HeroBrandCard doesn't need to know anything about
// scroll position — it just renders whatever node it's given.
//
// Scroll docking: once the hero search scrolls out of view, a compact copy
// of it docks inside the sticky main navbar itself (see lib/searchDock.tsx +
// Navbar.tsx) so search + city stay reachable without scrolling back up.
// Both instances share showCity for the city selector.

import React, { useEffect, useRef } from "react";
import DirectorySearchBar from "@/components/DirectorySearchBar";
import HeroBrandCard from "@/components/home/HeroBrandCard";
import { useSearchDock } from "@/lib/searchDock";
import { PAN_INDIA_LABEL, detectNearestCity } from "@/lib/indiaGeo";

export interface HomeHeroProps {
  title: string;
  examples: string[];
}

// India-market defaults, kept for the docking-progress signal below (still
// consumed by the navbar's docked copy) even though this bar no longer shows
// example chips itself.
const DEFAULT_EXAMPLES = [
  "CA in Pune for GST filing",
  "Stainless steel sheets, 2mm, Mumbai",
  "Bulk cotton fabric suppliers",
  "Wedding photographer in Jaipur",
];

export default function HomeHero({ title, examples }: HomeHeroProps) {
  const searchRef = useRef<HTMLDivElement>(null);
  const { progress, setProgress, query, setQuery, city, setCity } = useSearchDock();
  const chips = examples && examples.length ? examples : DEFAULT_EXAMPLES;

  // Live ref so the async geolocation callback below can check the CURRENT
  // city (not the one captured when the effect first ran) before overriding
  // it — if the visitor manually picks a city while the browser's location
  // prompt is still up, their choice wins.
  const cityRef = useRef(city);
  useEffect(() => {
    cityRef.current = city;
  }, [city]);

  // Auto-detect the visitor's city from the browser's Geolocation API, only
  // if they haven't already picked one. Silent no-op on denial/unsupported/
  // no-close-match — this is a convenience, never a blocker, and never shows
  // an error. Matched entirely client-side against a local city-coordinate
  // table (lib/indiaGeo.ts) — no external reverse-geocoding service.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (cityRef.current !== PAN_INDIA_LABEL) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cityRef.current !== PAN_INDIA_LABEL) return;
        const match = detectNearestCity(pos.coords.latitude, pos.coords.longitude);
        if (match) setCity(match);
      },
      () => {},
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tell the navbar how far a compact search bar should be docked inside
  // itself as the hero search scrolls out of view, so
  // search + city stay reachable without scrolling back to the top. Many
  // intersection thresholds turn intersectionRatio into a near-continuous
  // 0→1 signal (rather than a single isIntersecting flip) so the docked bar
  // visibly slides/fades in over the same scroll distance the hero bar takes
  // to scroll past the sticky header, instead of snapping in one frame.
  // Reset on unmount so leaving the Directory homepage doesn't leave the
  // navbar stuck mid-dock.
  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    const thresholds = Array.from({ length: 41 }, (_, i) => i / 40);
    const io = new IntersectionObserver(
      ([entry]) => setProgress(1 - entry.intersectionRatio, chips),
      { rootMargin: "-64px 0px 0px 0px", threshold: thresholds }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setProgress(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      style={{
        position: "relative",
        // The search box below has a `transform` (for the docking fade/lift
        // effect), which creates its own stacking context and traps the
        // suggestions dropdown's z-index inside it — without this, later
        // sibling sections (PromoBanner, CategoryIconGrid) paint over the
        // open dropdown since they're simply later in DOM order. Giving the
        // whole hero section an explicit stacking context above them fixes
        // it regardless of what any child does internally.
        zIndex: 30,
        borderBottom: "1px solid var(--border)",
        background: "linear-gradient(180deg, var(--brand-tint) 0%, var(--canvas) 100%)",
      }}
    >
      <div
        className="container-bs"
        style={{
          paddingTop: "clamp(16px, 2.6vw, 26px)",
          paddingBottom: "clamp(16px, 2.6vw, 26px)",
        }}
      >
        <HeroBrandCard
          guestTitle={title}
          searchSlot={
            // Search — as it nears the sticky header it fully fades and lifts
            // away (not just to half-opacity in place), in sync with the
            // docked copy sliding UP into the navbar from just below its
            // resting spot (see Navbar.tsx) — both moving the same direction
            // at the same progress value, so it reads as one bar physically
            // travelling from here to there rather than one element fading
            // out while an unrelated one fades in.
            <div
              ref={searchRef}
              style={{
                scrollMarginTop: 96,
                opacity: 1 - progress,
                transform: `translateY(${progress * -26}px) scale(${1 - progress * 0.04})`,
                transition: "opacity 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)",
                // Once mostly faded, hand off interaction to the docked copy —
                // otherwise this box would sit invisibly behind the sticky
                // header, still clickable/tabbable.
                pointerEvents: progress > 0.5 ? "none" : "auto",
              }}
            >
              <DirectorySearchBar
                size="hero"
                showCity
                query={query}
                onQueryChange={setQuery}
                city={city}
                onCityChange={setCity}
              />
            </div>
          }
        />
      </div>
    </section>
  );
}
