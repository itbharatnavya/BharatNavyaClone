"use client";

// useAdRotation — the one rotation engine behind every ad slot (ApiAdvertisingSlot).
//
//  - advances every AD_ROTATE_MS (4s); the dwell restarts after any manual change
//  - holds while the pointer is over the ad, focus is inside it, the tab is hidden, the ad is
//    scrolled out of view, or the visitor pressed pause
//  - "reduce motion" only removes the fade (CSS); it never stops the rotation, a pause button
//    is the accessible control instead
//  - start position is random per page view and each slot of the same placement starts one ad
//    further along, so the rail / in-feed / bottom slots of one page don't show the same ad
//  - swipe left / right on touch screens

import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";

export const AD_ROTATE_MS = 4000;

// Per-placement bookkeeping, module level so slots on the same page can see each other.
const mounted: Record<string, number> = {};
const base: Record<string, number> = {};

function claimSlot(key: string): number {
  const seq = mounted[key] || 0;
  if (seq === 0) base[key] = Math.random();
  mounted[key] = seq + 1;
  return seq;
}
function releaseSlot(key: string) {
  mounted[key] = Math.max(0, (mounted[key] || 1) - 1);
}

export function useAdRotation(count: number, placementKey: string, intervalMs: number = AD_ROTATE_MS) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [inView, setInView] = useState(true);
  const seq = useRef(-1);
  const wrapRef = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);

  // Claim a slot number for this placement while mounted.
  useEffect(() => {
    seq.current = claimSlot(placementKey);
    return () => releaseSlot(placementKey);
  }, [placementKey]);

  // Pick the starting ad once the list is known (and again if its size changes).
  useEffect(() => {
    if (count <= 0) return setIndex(0);
    const s = seq.current < 0 ? 0 : seq.current;
    setIndex((Math.floor((base[placementKey] ?? 0) * count) + s) % count);
  }, [count, placementKey]);

  // Pause while the tab is hidden.
  useEffect(() => {
    const sync = () => setTabHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // Pause while the slot is scrolled out of view. The wrapper may be `display: contents`
  // (no box), so observe its first element child; the slot root remounts per ad, hence [index].
  useEffect(() => {
    const root = wrapRef.current;
    const target = root ? (root.firstElementChild as Element | null) || root : null;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setInView(entries.some((e) => e.isIntersecting)), { threshold: 0.15 });
    io.observe(target);
    return () => io.disconnect();
  }, [index, count]);

  const holding = hovered || focused || userPaused || tabHidden || !inView;

  useEffect(() => {
    if (count <= 1 || holding) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => window.clearTimeout(t);
  }, [count, holding, index, intervalMs]);

  const goTo = useCallback((i: number) => setIndex(count ? ((i % count) + count) % count : 0), [count]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const handlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    // Only KEYBOARD focus holds the ad. After a mouse/touch click the button keeps focus, and that
    // must not freeze the rotation (matches :focus-visible).
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      let keyboard = true;
      try { keyboard = (e.target as HTMLElement).matches(":focus-visible"); } catch { /* old browser: treat as keyboard */ }
      setFocused(keyboard);
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
    },
    onTouchStart: (e: TouchEvent<HTMLElement>) => {
      touchX.current = e.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (e: TouchEvent<HTMLElement>) => {
      const start = touchX.current;
      touchX.current = null;
      const end = e.changedTouches[0]?.clientX;
      if (start == null || end == null) return;
      const dx = end - start;
      if (Math.abs(dx) > 45) (dx < 0 ? next : prev)();
    },
  };

  return {
    index,
    goTo,
    next,
    prev,
    userPaused,
    togglePause: () => setUserPaused((p) => !p),
    handlers,
    wrapRef: (el: HTMLElement | null) => {
      wrapRef.current = el;
    },
  };
}
