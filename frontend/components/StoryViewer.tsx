"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { StoryGroup } from "@/lib/types";
import { viewStory } from "@/lib/api";
import Avatar from "./Avatar";

export interface StoryViewerProps {
  groups: StoryGroup[];
  startIndex?: number;
  // Which story within that starting group to open on — e.g. SellerStoriesSection
  // opens a single group holding one seller's rail, so the clicked card needs to
  // land on its own story, not always the group's first one.
  startStoryIndex?: number;
  onClose: () => void;
}

const STORY_MS = 5000;

export default function StoryViewer({
  groups,
  startIndex = 0,
  startStoryIndex = 0,
  onClose,
}: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(startIndex);
  const [storyIdx, setStoryIdx] = useState(startStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const viewed = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const group = groups[groupIdx];
  const story = group?.stories?.[storyIdx];

  // Full-bleed on phones, centred card on larger screens.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const goNext = useCallback(() => {
    setProgress(0);
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [group, storyIdx, groupIdx, groups.length, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      const prev = groups[groupIdx - 1];
      setGroupIdx((g) => g - 1);
      setStoryIdx(Math.max(0, (prev?.stories.length || 1) - 1));
    } else {
      onClose();
    }
  }, [storyIdx, groupIdx, groups, onClose]);

  // register a view once per story
  useEffect(() => {
    if (!story) return;
    if (!viewed.current.has(story.id)) {
      viewed.current.add(story.id);
      void viewStory(story.id).catch(() => {});
    }
  }, [story]);

  // auto-advance timer
  useEffect(() => {
    if (!story) return;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = Math.min(1, elapsed / STORY_MS);
      setProgress(p);
      if (p >= 1) {
        goNext();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [story, goNext]);

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, goNext, goPrev]);

  if (!group || !story) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(8,12,20,.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: isMobile ? "100vw" : "min(420px, 100vw)",
          height: isMobile ? "100dvh" : "min(92vh, 760px)",
          maxWidth: "100%",
          background: "#000",
          borderRadius: isMobile ? 0 : 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* top scrim for progress + header legibility over bright media */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 96,
            zIndex: 1,
            background: "linear-gradient(rgba(0,0,0,.55), transparent)",
            pointerEvents: "none",
          }}
        />

        {/* progress bars */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 3, display: "flex", gap: 4 }}>
          {group.stories.map((s, i) => (
            <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 3, background: "rgba(255,255,255,.35)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  background: "#fff",
                  width: i < storyIdx ? "100%" : i === storyIdx ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div style={{ position: "absolute", top: 22, left: 12, right: 12, zIndex: 3, display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar src={group.avatarUrl} name={group.sellerName} size={34} />
          <Link
            href={group.sellerSlug ? `/seller/${group.sellerSlug}` : "#"}
            style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}
          >
            {group.sellerName}
          </Link>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#fff", cursor: "pointer", lineHeight: 0, padding: 0 }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* media */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#111", overflow: "hidden" }}>
          {!story.media?.url ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                textAlign: "center",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                background: "linear-gradient(135deg,#1D4ED8,#F97316)",
              }}
            >
              {story.caption || group.sellerName}
            </div>
          ) : story.media.type === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={story.media.url} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.media.url} alt={story.caption || group.sellerName} decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>

        {/* caption — pointer-events off so taps pass through to nav zones,
            re-enabled only on the interactive link */}
        {(story.caption || story.linkListingId) && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 4,
              padding: "48px 16px 20px",
              background: "linear-gradient(transparent, rgba(0,0,0,.72))",
              color: "#fff",
              fontSize: 14,
              pointerEvents: "none",
            }}
          >
            {story.caption && <div>{story.caption}</div>}
            {story.linkListingId && (
              <Link
                href={`/listing/${story.linkListingId}`}
                className="btn btn-primary btn-sm"
                style={{ marginTop: 10, display: "inline-flex", pointerEvents: "auto" }}
              >
                View listing
              </Link>
            )}
          </div>
        )}

        {/* tap zones */}
        <button aria-label="Previous" onClick={goPrev} style={{ position: "absolute", left: 0, top: 60, bottom: 0, width: "35%", background: "transparent", border: "none", cursor: "pointer", zIndex: 2 }} />
        <button aria-label="Next" onClick={goNext} style={{ position: "absolute", right: 0, top: 60, bottom: 0, width: "45%", background: "transparent", border: "none", cursor: "pointer", zIndex: 2 }} />
      </div>
    </div>
  );
}
