"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function BackToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const returningToTop = useRef(false);

  const updateVisibility = useCallback(() => {
    const main = document.getElementById("main-content");
    const topSection = main?.querySelector<HTMLElement>("section, header");
    const boundary = topSection
      ? topSection.getBoundingClientRect().bottom + window.scrollY
      : window.innerHeight;

    if (returningToTop.current) {
      setVisible(false);
      if (window.scrollY <= 1) returningToTop.current = false;
      return;
    }

    setVisible(window.scrollY > boundary);
  }, []);

  useEffect(() => {
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [updateVisibility]);

  useEffect(() => {
    returningToTop.current = false;
    setVisible(false);
    const frame = window.requestAnimationFrame(updateVisibility);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, updateVisibility]);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="back-to-top"
      aria-label="Back to top"
      onClick={() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        returningToTop.current = true;
        setVisible(false);
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      }}
    >
      <svg aria-hidden viewBox="0 0 24 24">
        <path d="m6.5 11.5 5.5-5.5 5.5 5.5M12 6v12" />
      </svg>
    </button>
  );
}
