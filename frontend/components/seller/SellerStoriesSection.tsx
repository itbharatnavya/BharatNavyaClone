"use client";

import React, { useEffect, useState } from "react";
import type { Story, StoryGroup } from "@/lib/types";
import { getHighlights, getActiveStories } from "@/lib/api";
import { useTr } from "@/components/discovery/hooks";
import { useToast } from "@/components/Toast";
import StoryViewer from "@/components/StoryViewer";

export interface SellerStoriesSectionProps {
  sellerId: string;
  sellerName: string;
  sellerSlug?: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  // Gates for each segment (backend feature flags `stories` / `storyHighlights`).
  // If only one is true, that segment renders alone with no toggle to switch away
  // from it.
  showNew?: boolean;
  showHighlights?: boolean;
}

// Same footprint as the Directory homepage StoryRail cards (components/StoryRail.tsx)
// — a horizontally-scrolling rail, not a wrapping grid, so any number of stories
// (a seller's highlights never expire, so that count only ever grows) stays a single
// swipeable row instead of an ever-taller page section.
const CARD_W = 108;
const CARD_RADIUS = 16;

type Segment = "new" | "highlights";

export default function SellerStoriesSection({
  sellerId,
  sellerName,
  sellerSlug,
  avatarUrl,
  isVerified,
  showNew = true,
  showHighlights = true,
}: SellerStoriesSectionProps) {
  const t = useTr();
  const { addToast } = useToast();
  const [segment, setSegment] = useState<Segment>(showNew ? "new" : "highlights");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAt, setOpenAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fetcher = segment === "new" ? getActiveStories : getHighlights;
    fetcher(sellerId, "seller")
      .then((s) => {
        if (!cancelled) setStories(s || []);
      })
      .catch((e) => {
        if (!cancelled) addToast(e instanceof Error ? e.message : "Failed to load stories", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sellerId, segment, addToast]);

  const showToggle = showNew && showHighlights;
  const group: StoryGroup = { sellerId, sellerName, sellerSlug, avatarUrl, isVerified, stories };

  return (
    <div>
      {showToggle && (
        <div
          role="tablist"
          aria-label={t("seller.stories.segmentLabel", "Story type")}
          style={{ display: "inline-flex", padding: 3, background: "var(--bg-subtle)", borderRadius: 999, marginBottom: 16 }}
        >
          {(["new", "highlights"] as Segment[]).map((seg) => (
            <button
              key={seg}
              type="button"
              role="tab"
              aria-selected={segment === seg}
              onClick={() => setSegment(seg)}
              style={{
                padding: "7px 18px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: segment === seg ? "#fff" : "transparent",
                color: segment === seg ? "var(--brand)" : "var(--muted)",
                boxShadow: segment === seg ? "0 1px 4px rgba(15,23,42,.12)" : "none",
                transition: "background 150ms ease, color 150ms ease, box-shadow 150ms ease",
              }}
            >
              {seg === "new" ? t("seller.stories.new", "New") : t("seller.stories.highlights", "Highlights")}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="no-scrollbar" style={{ display: "flex", gap: 14, overflowX: "auto", padding: "2px 2px 8px" }}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="skeleton"
              style={{ width: CARD_W, aspectRatio: "2 / 3", borderRadius: CARD_RADIUS, flexShrink: 0 }}
            />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="card card-flat card-pad" style={{ textAlign: "center", color: "var(--muted)" }}>
          {segment === "new"
            ? t("stories.active.empty", "No active stories right now.")
            : t("highlights.empty", "No highlights yet.")}
        </div>
      ) : (
        <div className="no-scrollbar" style={{ display: "flex", gap: 14, overflowX: "auto", padding: "2px 2px 8px" }}>
          {stories.map((s, i) => {
            const previewUrl = s.media?.type === "image" ? s.media.url : undefined;
            const isVideo = s.media?.type === "video";

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpenAt(i)}
                className="story-card"
                style={{
                  background: "linear-gradient(135deg, var(--brand), var(--action))",
                  border: "none",
                  cursor: "pointer",
                  padding: 3,
                  borderRadius: CARD_RADIUS + 3,
                  width: CARD_W + 6,
                  flexShrink: 0,
                }}
                aria-label={s.caption || `Story ${i + 1}`}
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
                      ? `var(--bg-subtle) url(${previewUrl}) center/cover`
                      : "linear-gradient(135deg,#DBEAFE,#FFE9D5)",
                  }}
                >
                  {isVideo && (
                    <span
                      aria-hidden
                      style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <span
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "999px",
                          background: "rgba(15,23,42,.55)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </span>
                  )}

                  {s.caption && (
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
                      <span className="line-clamp-1" style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#fff", textAlign: "left" }}>
                        {s.caption}
                      </span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {openAt !== null && (
        <StoryViewer groups={[group]} startIndex={0} startStoryIndex={openAt} onClose={() => setOpenAt(null)} />
      )}
    </div>
  );
}
