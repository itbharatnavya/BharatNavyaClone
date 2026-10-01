"use client";

import { useEffect, useRef } from "react";

/** Whole number that counts up once when it scrolls into view. No React children:
 *  the text is owned by the effect so the animation never fights a re-render. */
export default function Count({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const format = (value: number) => Math.round(value).toLocaleString("en-IN");
    const final = () => { el.textContent = to ? format(to) : "–"; };
    final();
    if (!to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    el.textContent = "0";
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 1400);
        el.textContent = format(to * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); final(); };
  }, [to]);
  return <span ref={ref} />;
}
