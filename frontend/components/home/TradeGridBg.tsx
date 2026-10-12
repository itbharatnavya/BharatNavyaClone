"use client";

// Mounts the Trade Grid canvas (components/home/tradeGrid.ts) behind the home hero's content.
// It finds the hero, its headline and its product-card row from where it sits in the DOM, so
// the map keeps labels and chips clear of them. Styles: .bn-tradegrid in counter-soft-system.css.

import { useEffect, useRef } from "react";
import { startTradeGrid } from "./tradeGrid";

export default function TradeGridBg() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvas.current;
    const hero = cv?.closest(".bn-home-hero") as HTMLElement | null;
    const h1 = hero?.querySelector("h1");
    const cards = hero?.querySelector(".bn-hstage");
    if (!cv || !hero || !h1 || !cards) return;
    return startTradeGrid(cv, hero, h1, cards);
  }, []);
  return <>
    <canvas ref={canvas} className="bn-tradegrid" aria-hidden />
    <span className="bn-tradegrid-veil" aria-hidden />
  </>;
}
