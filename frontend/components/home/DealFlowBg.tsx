"use client";

// Mounts the Deal Flow canvas (components/home/dealFlow.ts) behind the home hero's content.
// It finds the hero, its headline and its product-card row from where it sits in the DOM, so
// the drifting cards fade behind the headline. Styles: .bn-herobg in counter-soft-system.css.

import { useEffect, useRef } from "react";
import { startDealFlow } from "./dealFlow";

export default function DealFlowBg() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvas.current;
    const hero = cv?.closest(".bn-home-hero") as HTMLElement | null;
    const h1 = hero?.querySelector("h1");
    const cards = hero?.querySelector(".bn-hstage");
    if (!cv || !hero || !h1 || !cards) return;
    return startDealFlow(cv, hero, h1, cards);
  }, []);
  return <>
    <canvas ref={canvas} className="bn-herobg" aria-hidden />
    <span className="bn-herobg-veil" aria-hidden />
  </>;
}
