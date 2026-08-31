"use client";

// RouteProgress — a slim top-of-viewport progress bar giving instant visual
// feedback that a click registered and navigation is underway. Deliberately
// NOT a full-page loading overlay: it never blocks interaction or covers
// content, it just makes an in-flight wait visible instead of a click
// looking like it did nothing (see the click-unresponsiveness investigation
// this addresses — a fetch-storm or a first-time dev-server route compile
// can both make navigation take a visible moment with zero feedback
// otherwise, since no loading.tsx exists anywhere in the app).
//
// Starts the instant an internal <a href> is clicked — before Next's own
// navigation/data-fetch/compile resolves — and completes when the route
// actually changes. A safety timeout auto-hides it if a click never leads
// to a route change (e.g. it opened a menu, not a link, or only the query
// string changed on the same path — see the usePathname()-only note below).
//
// Deliberately uses usePathname() only, not useSearchParams(): the latter
// requires a Suspense boundary in the App Router, and mounting this at the
// root layout (app/layout.tsx) would push that requirement onto every page.
// A query-only navigation (same path, e.g. /search?q=a -> /search?q=b) is
// the one case this won't catch as "done" — it just rides out the safety
// timeout instead of snapping to 100% immediately, which is an acceptable
// trade-off for not touching every other page's rendering behavior.

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const SAFETY_TIMEOUT_MS = 8000;
const DONE_HOLD_MS = 260;

type Phase = "idle" | "loading" | "done";

export default function RouteProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href) && !href.startsWith(window.location.origin)) return;

      setPhase("loading");
      if (safetyRef.current) clearTimeout(safetyRef.current);
      safetyRef.current = setTimeout(() => setPhase("idle"), SAFETY_TIMEOUT_MS);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Route actually changed — snap the bar to 100% then fade it out.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPhase((p) => (p === "idle" ? p : "done"));
    if (safetyRef.current) clearTimeout(safetyRef.current);
    const t = setTimeout(() => setPhase("idle"), DONE_HOLD_MS);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 200,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          background: "linear-gradient(90deg, var(--brand), var(--action))",
          width: phase === "idle" ? 0 : phase === "loading" ? "85%" : "100%",
          opacity: phase === "done" ? 0 : 1,
          transition:
            phase === "loading"
              ? "width 8s cubic-bezier(0.16,1,0.3,1)"
              : phase === "done"
                ? "width 200ms ease, opacity 200ms ease 60ms"
                : "none",
        }}
      />
    </div>
  );
}
