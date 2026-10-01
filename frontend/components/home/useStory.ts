"use client";

// Mounts a GSAP matchMedia context scoped to `scope`. `build` runs once per
// media state (reduced-motion / wide viewport) and may return a cleanup; GSAP
// reverts every tween and ScrollTrigger it created when the state changes or the
// component unmounts. GSAP is loaded on demand so it never blocks first paint.

import { useEffect, type RefObject } from "react";

type Gsap = typeof import("gsap").gsap;
type Trigger = typeof import("gsap/ScrollTrigger").ScrollTrigger;

export interface StoryKit {
  gsap: Gsap;
  ScrollTrigger: Trigger;
  q: <T extends HTMLElement = HTMLElement>(selector: string) => T[];
  motion: boolean; // false under prefers-reduced-motion
  wide: boolean; // roomy enough to pin a full section
  fine: boolean; // mouse-like pointer with hover
}

export function useStory(scope: RefObject<HTMLElement>, build: (kit: StoryKit) => void | (() => void)) {
  useEffect(() => {
    let dead = false;
    let media: { revert: () => void } | undefined;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      const root = scope.current;
      if (dead || !root) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia(root);
      media = mm;
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 1024px) and (min-height: 700px)", fine: "(hover: hover) and (pointer: fine)" },
        (context) => {
          const { motion, wide, fine } = context.conditions as { motion: boolean; wide: boolean; fine: boolean };
          if (!motion) return; // static, fully readable fallback
          return build({ gsap, ScrollTrigger, q: (selector) => gsap.utils.toArray(selector, root), motion, wide, fine });
        },
      );
    })();
    return () => { dead = true; media?.revert(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
