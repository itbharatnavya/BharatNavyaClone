"use client";

import React, { useEffect, useState } from "react";
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

// Deterministic soft gradient per seller so empty avatars still look intentional.
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

export default function StoryRail({ groups: provided, className = "" }: StoryRailProps) {
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
    getStories()
      .then((g) => alive && setGroups(normalizeGroups(g)))
      .catch(() => alive && setGroups([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [provided]);

  if (!loading && groups.length === 0) return null;

  return (
    <div className={className}>
      <div
        className="no-scrollbar"
        style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 4 }}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <span className="skeleton" style={{ width: 66, height: 66, borderRadius: "999px" }} />
                <span className="skeleton" style={{ width: 48, height: 10 }} />
              </div>
            ))
          : groups.map((g, i) => (
              <button
                key={g.sellerId || i}
                type="button"
                onClick={() => setOpenAt(i)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  width: 74,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: "999px",
                    padding: 2.5,
                    background: g.hasUnseen === false
                      ? "var(--border-strong)"
                      : "linear-gradient(135deg, #F97316, #2563EB)",
                    display: "inline-flex",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "999px",
                      border: "2px solid #fff",
                      background: g.avatarUrl
                        ? `#f1f5f9 url(${g.avatarUrl}) center/cover`
                        : gradientFor(g.sellerId || g.sellerName || ""),
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#1D4ED8",
                      fontWeight: 800,
                      fontSize: 20,
                      overflow: "hidden",
                    }}
                  >
                    {!g.avatarUrl && initials(g.sellerName)}
                  </span>
                </span>
                <span
                  className="line-clamp-1"
                  style={{ fontSize: 12, color: "var(--muted)", maxWidth: 72, textAlign: "center" }}
                >
                  {g.sellerName}
                </span>
              </button>
            ))}
      </div>

      {openAt !== null && (
        <StoryViewer groups={groups} startIndex={openAt} onClose={() => setOpenAt(null)} />
      )}
    </div>
  );
}
