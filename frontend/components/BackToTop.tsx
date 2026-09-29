"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const REVEAL_DISTANCE = 600;

export default function BackToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const updateVisibility = useCallback(() => {
    const pageIsLongEnough =
      document.documentElement.scrollHeight > window.innerHeight + REVEAL_DISTANCE;
    setVisible(pageIsLongEnough && window.scrollY > REVEAL_DISTANCE);
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
      title="Back to top"
      onClick={() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      }}
    >
      <svg aria-hidden viewBox="0 0 24 24">
        <path d="m6.5 11.5 5.5-5.5 5.5 5.5M12 6v12" />
      </svg>
      <span>Back to top</span>
    </button>
  );
}
