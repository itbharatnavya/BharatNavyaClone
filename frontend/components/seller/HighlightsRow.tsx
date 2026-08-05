"use client";

import React, { useEffect, useState } from "react";
import type { Story, StoryGroup } from "@/lib/types";
import { getHighlights } from "@/lib/api";
import { useTr } from "@/components/discovery/hooks";
import { useToast } from "@/components/Toast";
import StoryViewer from "@/components/StoryViewer";

export interface HighlightsRowProps {
  sellerId: string;
  sellerName: string;
  sellerSlug?: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
}

export default function HighlightsRow({
  sellerId,
  sellerName,
  sellerSlug,
  avatarUrl,
  isVerified,
}: HighlightsRowProps) {
  const t = useTr();
  const { addToast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAt, setOpenAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHighlights(sellerId)
      .then((s) => {
        if (!cancelled) setStories(s || []);
      })
      .catch((e) => {
        if (!cancelled) addToast(e instanceof Error ? e.message : "Failed to load highlights", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sellerId, addToast]);

  if (loading) {
    return (
      <div style={{ display: "flex", gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton" style={{ width: 76, height: 76, borderRadius: 999 }} />
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="card card-flat card-pad" style={{ textAlign: "center", color: "var(--muted)" }}>
        {t("highlights.empty", "No highlights yet.")}
      </div>
    );
  }

  const group: StoryGroup = {
    sellerId,
    sellerName,
    sellerSlug,
    avatarUrl,
    isVerified,
    stories,
  };

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
        {stories.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setOpenAt(i)}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, textAlign: "center" }}
            aria-label={s.caption || `Highlight ${i + 1}`}
          >
            <span
              style={{
                display: "block",
                width: 76,
                height: 76,
                borderRadius: 999,
                padding: 3,
                background: "linear-gradient(135deg, var(--brand), var(--action))",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  borderRadius: 999,
                  overflow: "hidden",
                  border: "2px solid #fff",
                  background: "var(--bg-subtle)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.media.url}
                  alt={s.caption || "Highlight"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </span>
            </span>
            {s.caption && (
              <span
                className="line-clamp-1"
                style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 6, maxWidth: 76 }}
              >
                {s.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {openAt !== null && (
        <StoryViewer groups={[group]} startIndex={0} onClose={() => setOpenAt(null)} />
      )}
    </>
  );
}
