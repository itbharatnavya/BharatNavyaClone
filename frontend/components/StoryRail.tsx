"use client";

import React, { useEffect, useState } from "react";
import type { StoryGroup } from "@/lib/types";
import { getStories } from "@/lib/api";
import StoryViewer from "./StoryViewer";

export interface StoryRailProps {
  groups?: StoryGroup[]; // if omitted, fetched from getStories()
  className?: string;
  // Rendered above the rail, but only once we know there's at least one
  // story to show — so a heading like "Fresh from sellers" never sits over
  // an empty/hidden rail. While still loading, both render together (we
  // don't yet know the outcome); once resolved to zero groups, both hide.
  heading?: React.ReactNode;
  // Optional truthful fallback for surfaces that need to preserve their
  // layout even when there are currently no active 24-hour statuses.
  emptyState?: React.ReactNode;
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

export default function StoryRail({ groups: provided, className = "", heading, emptyState }: StoryRailProps) {
  const [groups, setGroups] = useState<StoryGroup[]>(
    provided ? normalizeGroups(provided) : []
  );
  const [loading, setLoading] = useState(!provided);
  const [openAt, setOpenAt] = useState<number | null>(null);

  useEffect(() => {
    if (provided) {
      setGroups(normalizeGroups(provided));
      return;
    }
    let alive = true;
    getStories("seller")
      .then((g) => alive && setGroups(normalizeGroups(g)))
      .catch(() => alive && setGroups([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [provided]);

  if (!loading && groups.length === 0) {
    if (!emptyState) return null;
    return (
      <div className={className}>
        {heading}
        <div className="counter-story-empty">{emptyState}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      {heading}
      <div
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
          // Always left-aligned — a single story (or a short row on a wide
          // screen) should still start at the left edge like a normal list,
          // not center itself in the middle of the row.
          justifyContent: "flex-start",
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
