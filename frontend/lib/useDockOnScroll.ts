"use client";

// useDockOnScroll — the reliable half of the search-dock mechanism (see
// searchDock.tsx for the shared progress/query state itself).
//
// This used to be copy-pasted per page with two different triggers: /search and
// /recruitment/jobs polled `getBoundingClientRect()` on scroll/resize (reliable,
// deterministic), while home/directory/recruitment used an IntersectionObserver
// with a threshold+rootMargin combo instead — IO callbacks aren't guaranteed to
// fire on every scroll frame and are throttled/batched by the browser, so that
// version intermittently missed the dock/undock transition ("sometimes it
// doesn't show on scroll down"). Standardised on the scroll/resize+rAF approach
// everywhere.
import { useEffect, useRef } from "react";

interface DockOnScrollOptions {
  /** Distance in px from the viewport top the anchor's bottom must cross to dock. Default 72 (navbar height). */
  threshold?: number;
  /** Don't dock while focus is inside the anchor (typing shouldn't yank the hero away) — queues the dock until blur instead. Default true. */
  guardFocus?: boolean;
}

export function useDockOnScroll<T extends HTMLElement = HTMLDivElement>(
  setProgress: (progress: number) => void,
  { threshold = 72, guardFocus = true }: DockOnScrollOptions = {}
) {
  const anchorRef = useRef<T | null>(null);
  const focusedRef = useRef(false);
  const pendingRef = useRef<boolean | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    let frame = 0;
    const evaluate = () => {
      const shouldDock = anchor.getBoundingClientRect().bottom <= threshold;
      if (guardFocus && focusedRef.current && shouldDock) { pendingRef.current = true; return; }
      pendingRef.current = null;
      setProgress(shouldDock ? 1 : 0);
    };
    const updateDock = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(evaluate);
    };
    updateDock();
    window.addEventListener("scroll", updateDock, { passive: true });
    window.addEventListener("resize", updateDock);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateDock);
      window.removeEventListener("resize", updateDock);
      setProgress(0);
    };
  }, [setProgress, threshold, guardFocus]);

  const focusHandlers = guardFocus
    ? {
        onFocusCapture: () => { focusedRef.current = true; },
        onBlurCapture: (event: React.FocusEvent<HTMLElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            focusedRef.current = false;
            if (pendingRef.current !== null) {
              setProgress(pendingRef.current ? 1 : 0);
              pendingRef.current = null;
            }
          }
        },
      }
    : undefined;

  return { anchorRef, focusHandlers };
}
