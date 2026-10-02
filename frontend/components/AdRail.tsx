"use client";

// AdRail — sponsored-content pieces shared by the search & brand product
// listing pages:
//   • useAds(placement) — fetch active ad bookings for a slot (skips the
//     fetch entirely when placement is null, e.g. adRail=false pages).
//   • AdCard — compact stacked card for the desktop sidebar rail (up to 3,
//     below the RFQ card — see AsideRfqCard in DiscoveryResults.tsx).
//   • InFeedAd — full-width native ad row/tile inserted into the mobile/
//     tablet list or grid itself (desktop already has the sidebar; the two
//     are mutually exclusive by breakpoint, never both at once).
//
// Same data source as AdSlider.tsx (GET /api/ads via getAds()), just
// rendered as distinct stacked cards instead of one rotating carousel slot —
// so "how many ads are active" is visible at a glance instead of hidden
// behind a slider.
//
// Sidebar overflow (more than 3 active ads): rather than a static top-3-by-
// priority that locks the same 3 sponsors into every visitor's sidebar
// forever, useAds() shuffles the fetched list once per page load, weighted
// by `priority` (higher priority = more likely to land in the visible 3,
// not guaranteed). The same shuffled order also feeds the in-feed cycling
// below, so both surfaces rotate together rather than always favoring
// whichever ads happen to sort first.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAds } from "@/lib/api";

export interface AdCreative {
  id?: string;
  creativeImageUrl?: string;
  headline?: string;
  targetUrl?: string;
  priority?: number;
}

// Weighted random shuffle (no replacement) — repeatedly draws one item from
// the remaining pool with probability proportional to its weight. Priority
// <= 0 or missing still gets weight 1, so every ad has *some* chance rather
// than being excluded outright.
function weightedShuffle(items: AdCreative[]): AdCreative[] {
  const pool = items.map((ad) => ({ ad, weight: Math.max(1, ad.priority ?? 1) }));
  const out: AdCreative[] = [];
  while (pool.length > 0) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    out.push(pool.splice(idx, 1)[0].ad);
  }
  return out;
}

export function useAds(placement: string | null): AdCreative[] {
  const [ads, setAds] = useState<AdCreative[]>([]);
  useEffect(() => {
    if (!placement) {
      setAds([]);
      return;
    }
    let alive = true;
    getAds(placement)
      .then((rows: AdCreative[]) => {
        if (!alive) return;
        const valid = (Array.isArray(rows) ? rows : []).filter((a) => a && a.creativeImageUrl);
        setAds(weightedShuffle(valid));
      })
      .catch(() => alive && setAds([]));
    return () => {
      alive = false;
    };
  }, [placement]);
  return ads;
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// Sidebar stacked card — image + "Ad" tag + headline, no CTA button (the
// whole card is the link, matching AdSlider's click behavior).
export function AdCard({ ad }: { ad: AdCreative }) {
  return (
    <Link
      href={ad.targetUrl || "#"}
      className="card card-flat"
      style={{ display: "block", overflow: "hidden", textDecoration: "none", position: "relative" }}
    >
      <div
        style={{
          aspectRatio: "16 / 9",
          backgroundImage: `url(${ad.creativeImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "var(--bg-subtle)",
        }}
      />
      <span
        className="badge"
        style={{ position: "absolute", top: 8, right: 8, background: "rgba(15,23,42,0.6)", color: "#fff", border: "none" }}
      >
        Ad
      </span>
      {ad.headline && (
        <div
          className="line-clamp-2"
          style={{ padding: "10px 12px", fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--ink)", lineHeight: 1.35 }}
        >
          {ad.headline}
        </div>
      )}
    </Link>
  );
}

// In-feed native ad — a full-width banner row/tile, visually distinct from
// a product card (tinted background, "Ad" eyebrow) so it isn't mistaken for
// a listing while still sitting in the same flow.
export function InFeedAd({ ad }: { ad: AdCreative }) {
  return (
    <Link
      href={ad.targetUrl || "#"}
      className="card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 12,
        textDecoration: "none",
        background: "linear-gradient(135deg, var(--brand-tint), var(--bg-subtle))",
      }}
    >
      <div
        style={{
          width: 88,
          height: 68,
          borderRadius: "var(--r-xs)",
          flexShrink: 0,
          backgroundImage: `url(${ad.creativeImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--brand)" }}>
          Ad
        </span>
        <div className="line-clamp-2" style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)", marginTop: 2, lineHeight: 1.35 }}>
          {ad.headline}
        </div>
      </div>
      <span style={{ color: "var(--brand)", flexShrink: 0 }} aria-hidden>
        <ArrowIcon />
      </span>
    </Link>
  );
}

// Splices an in-feed ad after the 3rd item, then every 6 after that (3, 9,
// 15…) — early enough to be seen, spaced out enough that ads don't crowd
// out the actual listings. Cycles through `ads` if there are fewer ads than
// slots. Returns `items` unchanged when there are no ads to show.
export function interleaveAds<T>(items: T[], ads: AdCreative[]): (T | { adSlot: AdCreative })[] {
  if (ads.length === 0) return items;
  const out: (T | { adSlot: AdCreative })[] = [];
  let cursor = 0;
  items.forEach((item, i) => {
    out.push(item);
    if (i >= 2 && (i - 2) % 6 === 0) {
      out.push({ adSlot: ads[cursor % ads.length] });
      cursor++;
    }
  });
  return out;
}

export function isAdSlot<T>(entry: T | { adSlot: AdCreative }): entry is { adSlot: AdCreative } {
  return !!entry && typeof entry === "object" && "adSlot" in (entry as object);
}
