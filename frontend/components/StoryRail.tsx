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
        <div className="counter-story-empty">
          <span className="counter-story-empty-mark" aria-hidden>24h</span>
          {emptyState}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {heading}
      <div
        className="counter-story-list no-scrollbar"
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="counter-story-skeleton skeleton"
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
                  className={`story-card${unseen ? " is-unseen" : ""}`}
                >
                  <span
                    className="story-card-avatar"
                    style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
                  >
                    {!previewUrl && (
                      <span className="story-card-initials">
                        {initials(g.sellerName)}
                      </span>
                    )}
                  </span>
                  <span className="story-card-name line-clamp-2">{g.sellerName}</span>
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
