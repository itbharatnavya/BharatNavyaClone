"use client";

// components/AdSlider.tsx — rotating carousel of sponsored ad creatives.
//
// Renders active ad bookings for a placement (category_top / search_top /
// home_hero …) as an auto-advancing slider that matches the site's light design
// system (.card / .badge, --brand/--action/--ink/--muted/--border). Behaviour:
//   • auto-advance every ~5s, paused on hover / keyboard focus
//   • left/right arrows, clickable dots, ← / → keyboard control
//   • degrades gracefully: 1 ad ⇒ no arrows/dots, 0 ads ⇒ renders nothing
//   • fully responsive, never causes horizontal overflow (min-width: 0)
//
// Data comes from getAds(placement, categorySlug) (public /api/ads) unless a
// pre-fetched `ads` array is supplied by the parent.

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAds } from "@/lib/api";
import { useTr } from "@/components/discovery/hooks";

export interface AdCreative {
  id?: string;
  creativeImageUrl?: string;
  headline?: string;
  targetUrl?: string;
}

export interface AdSliderProps {
  /** Placement slot, e.g. "category_top" | "search_top" | "home_hero". */
  placement: string;
  /** Category slug used to target category-scoped ads (empty targeting = all). */
  categorySlug?: string;
  /** Optional pre-fetched creatives; when omitted the slider fetches via getAds(). */
  ads?: AdCreative[];
  /** Auto-advance interval in ms (default 5000). */
  intervalMs?: number;
  className?: string;
  /** Fill the parent's height (100%) instead of the fixed clamp() height, and
   *  skip the bottom margin — for embedding inside a CSS Grid row with
   *  stretch alignment so the ad card matches sibling cards' height exactly
   *  (e.g. PromoBanner). Default false keeps the original fixed-height
   *  standalone banner sizing (e.g. category pages). */
  fillHeight?: boolean;
}

const OVERLAY_GRADIENT =
  "linear-gradient(to top, rgba(15,23,42,0.72), rgba(15,23,42,0))";

export default function AdSlider({
  placement,
  categorySlug,
  ads: adsProp,
  intervalMs = 5000,
  className,
  fillHeight = false,
}: AdSliderProps) {
  const t = useTr();
  const controlled = adsProp !== undefined;

  const [internal, setInternal] = useState<AdCreative[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Fetch when uncontrolled. Re-fetch on placement / category change.
  useEffect(() => {
    if (controlled) return;
    let alive = true;
    setInternal([]);
    getAds(placement, categorySlug)
      .then((rows: AdCreative[]) => {
        if (alive) setInternal(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (alive) setInternal([]);
      });
    return () => {
      alive = false;
    };
  }, [controlled, placement, categorySlug]);

  const source = controlled ? adsProp || [] : internal;
  const ads = source.filter((a) => a && a.creativeImageUrl);
  const count = ads.length;

  // Keep the active index in range whenever the set of ads changes.
  useEffect(() => {
    setIndex((i) => (count === 0 ? 0 : i % count));
  }, [count]);

  // Auto-advance (skipped while paused, or with a single ad).
  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [paused, count, intervalMs]);

  const goTo = useCallback((i: number) => setIndex(i), []);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + count) % count),
    [count]
  );
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (count <= 1) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };

  if (count === 0) return null;

  const active = Math.min(index, count - 1);
  const multi = count > 1;

  const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    top: "50%",
    [side]: 8,
    transform: "translateY(-50%)",
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    border: "none",
    background: "rgba(15,23,42,0.55)",
    color: "#fff",
    fontSize: 20,
    lineHeight: 1,
    cursor: "pointer",
    zIndex: 3,
  });

  return (
    <div
      className={className}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("ads.sponsored", "Sponsored")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
      style={{ marginBottom: fillHeight ? 0 : 24, minWidth: 0, height: fillHeight ? "100%" : undefined, minHeight: fillHeight ? 152 : undefined }}
    >
      <div
        className="card card-flat"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: 0,
          minWidth: 0,
          height: fillHeight ? "100%" : "clamp(120px, 42vw, 180px)",
          minHeight: fillHeight ? 152 : undefined,
        }}
      >
        {ads.map((ad, i) => {
          const isActive = i === active;
          return (
            <Link
              key={ad.id ?? i}
              href={ad.targetUrl || "#"}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              aria-label={ad.headline || t("ads.sponsored", "Sponsored")}
              style={{
                position: "absolute",
                inset: 0,
                display: "block",
                opacity: isActive ? 1 : 0,
                transition: "opacity 0.5s ease",
                pointerEvents: isActive ? "auto" : "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.creativeImageUrl}
                alt={ad.headline || ""}
                loading={isActive ? "eager" : "lazy"}
                decoding="async"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {ad.headline && (
                <div
                  className="line-clamp-2"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: multi ? "12px 16px 40px" : "12px 16px 20px", // multi: clear the indicator row
                    background: OVERLAY_GRADIENT,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {ad.headline}
                </div>
              )}
            </Link>
          );
        })}

        <span
          className="badge"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(15,23,42,0.6)",
            color: "#fff",
            border: "none",
            zIndex: 3,
          }}
        >
          {t("ads.label", "Ad")}
        </span>

        {multi && (
          <>
            <button
              type="button"
              aria-label={t("ads.prev", "Previous ad")}
              onClick={prev}
              style={arrowStyle("left")}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={t("ads.next", "Next ad")}
              onClick={next}
              style={arrowStyle("right")}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 8,
                display: "flex",
                justifyContent: "center",
                gap: 6,
                zIndex: 3,
              }}
            >
              {ads.map((ad, i) => (
                <button
                  key={ad.id ?? i}
                  type="button"
                  aria-label={t("ads.goTo", "Go to ad") + ` ${i + 1}`}
                  aria-current={i === active}
                  onClick={() => goTo(i)}
                  style={{
                    width: 44,
                    height: 44,
                    padding: 0,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    background: "transparent",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <span
                    className="ad-slider-indicator"
                    aria-hidden
                    style={{
                      width: 18,
                      height: 7,
                      borderRadius: 999,
                      background: i === active ? "#fff" : "rgba(255,255,255,0.55)",
                      transform: `scaleX(${i === active ? 1 : 0.39})`,
                      transition: "transform 0.3s ease, background-color 0.3s ease",
                    }}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
