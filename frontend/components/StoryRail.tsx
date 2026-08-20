"use client";

import React, { useEffect, useRef, useState } from "react";
import type { StoryGroup } from "@/lib/types";
import { getStories } from "@/lib/api";
import StoryViewer from "./StoryViewer";

export interface StoryRailProps {
  groups?: StoryGroup[]; // if omitted, fetched from getStories()
  className?: string;
}

// The backend groups stories under a nested `seller` object
// ({ seller: { id, name, slug, avatarUrl }, stories: [...] }) while the rest of
// the UI consumes the flat StoryGroup shape ({ sellerId, sellerName, ... }).
// Normalise here so both shapes render correctly and nothing comes through
// blank (no name, "?" avatar, dead links).
type RawStoryGroup = Partial<StoryGroup> & {
  seller?: {
    id?: string;
    name?: string;
    slug?: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
  } | null;
  stories?: StoryGroup["stories"];
};

function normalizeGroup(g: RawStoryGroup): StoryGroup {
  const s = g.seller || undefined;
  return {
    sellerId: g.sellerId ?? s?.id ?? "",
    sellerName: g.sellerName ?? s?.name ?? "",
    sellerSlug: g.sellerSlug ?? s?.slug,
    avatarUrl: g.avatarUrl ?? s?.avatarUrl ?? null,
    isVerified: g.isVerified ?? s?.isVerified,
    stories: g.stories ?? [],
    hasUnseen: g.hasUnseen,
  };
}

function normalizeGroups(list: RawStoryGroup[]): StoryGroup[] {
  return list
    .map(normalizeGroup)
    .filter((g) => g.stories.length > 0);
}

function initials(name?: string | null): string {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return parts || (name || "?").trim().charAt(0).toUpperCase() || "?";
}

// Deterministic soft gradient per seller so cards with no media still look intentional.
const GRADIENTS = [
  "linear-gradient(135deg,#DBEAFE,#FFE9D5)",
  "linear-gradient(135deg,#E9D5FF,#DBEAFE)",
  "linear-gradient(135deg,#FFE4E6,#FEF3C7)",
  "linear-gradient(135deg,#D1FAE5,#DBEAFE)",
  "linear-gradient(135deg,#FDE68A,#FBCFE8)",
  "linear-gradient(135deg,#CFFAFE,#E9D5FF)",
];
function gradientFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

const CARD_W = 108;
const CARD_RADIUS = 16;

export default function StoryRail({ groups: provided, className = "" }: StoryRailProps) {
  const [groups, setGroups] = useState<StoryGroup[]>(
    provided ? normalizeGroups(provided) : []
  );
  const [loading, setLoading] = useState(!provided);
  const [openAt, setOpenAt] = useState<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [centered, setCentered] = useState(false);

  useEffect(() => {
    if (provided) {
      setGroups(normalizeGroups(provided));
      return;
    }
    let alive = true;
    getStories()
      .then((g) => alive && setGroups(normalizeGroups(g)))
      .catch(() => alive && setGroups([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [provided]);

  // Center the row when every card fits without scrolling; once it overflows,
  // fall back to left-aligned so the native horizontal scroll feels normal.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const check = () => setCentered(el.scrollWidth <= el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [groups]);

  if (!loading && groups.length === 0) return null;

  return (
    <div className={className}>
      <div
        ref={railRef}
        className="no-scrollbar"
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          // overflowX:auto implicitly clips the Y axis too, and the hover
          // lift (translateY + scale in .story-card) pushes cards a few px
          // past their box — extra top/bottom padding keeps that lift from
          // getting clipped instead of chasing it by shrinking the animation.
          padding: "10px 2px 8px",
          justifyContent: centered ? "center" : "flex-start",
        }}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="skeleton"
                style={{ width: CARD_W, aspectRatio: "2 / 3", borderRadius: CARD_RADIUS, flexShrink: 0 }}
              />
            ))
          : groups.map((g, i) => {
              // Most recent story in the group stands in as the card's thumbnail.
              const preview = g.stories[g.stories.length - 1];
              const previewUrl = preview?.media?.type === "image" ? preview.media.url : undefined;
              const unseen = g.hasUnseen !== false;

              return (
                <button
                  key={g.sellerId || i}
                  type="button"
                  onClick={() => setOpenAt(i)}
                  className="story-card"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 3,
                    borderRadius: CARD_RADIUS + 3,
                    width: CARD_W + 6,
                    flexShrink: 0,
                    backgroundImage: unseen
                      ? "linear-gradient(135deg, #F97316, #2563EB)"
                      : "none",
                    backgroundColor: unseen ? undefined : "var(--border-strong)",
                  }}
                >
                  <span
                    style={{
                      position: "relative",
                      display: "block",
                      width: CARD_W,
                      aspectRatio: "2 / 3",
                      borderRadius: CARD_RADIUS,
                      overflow: "hidden",
                      border: "2.5px solid #fff",
                      background: previewUrl
                        ? `#f1f5f9 url(${previewUrl}) center/cover`
                        : gradientFor(g.sellerId || g.sellerName || ""),
                    }}
                  >
                    {!previewUrl && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#1D4ED8",
                          fontWeight: 800,
                          fontSize: 22,
                        }}
                      >
                        {initials(g.sellerName)}
                      </span>
                    )}

                    {g.isVerified && (
                      <span
                        aria-label="Verified seller"
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          width: 18,
                          height: 18,
                          borderRadius: "999px",
                          background: "var(--brand)",
                          border: "1.5px solid #fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}

                    {/* bottom scrim + seller name — the WhatsApp/Reels-shelf preview
                        this replaces used the seller's name as a caption under a round
                        avatar; here the story's own image carries that weight instead. */}
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: "16px 8px 8px",
                        background: "linear-gradient(transparent, rgba(15,23,42,.82))",
                      }}
                    >
                      <span
                        className="line-clamp-1"
                        style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#fff", textAlign: "left" }}
                      >
                        {g.sellerName}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
      </div>

      {openAt !== null && (
        <StoryViewer
          groups={groups}
          startIndex={openAt}
          startStoryIndex={Math.max(0, (groups[openAt]?.stories.length || 1) - 1)}
          onClose={() => setOpenAt(null)}
        />
      )}
    </div>
  );
}
