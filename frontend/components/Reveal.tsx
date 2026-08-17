"use client";

// Shared entrance primitive: fades + rises a block into view the first time it
// crosses the viewport (mount included, so above-the-fold content animates in
// too). Descendant CSS rules (.chat-bubble, .typing-dot in globals.css) key off
// the same `.is-visible` class instead of running their own observer.

import React, { useEffect, useRef, useState } from "react";

export interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  /** Entrance axis: "up" (default fade+rise), "left"/"right" (slide in — use
   * for content that should read as sliding into place next to something),
   * "scale" (grow in — reserve for the one featured element per page). */
  direction?: "up" | "left" | "right" | "scale";
  className?: string;
  style?: React.CSSProperties;
}

export default function Reveal({ children, delay = 0, direction = "up", className = "", style }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const directionClass = direction !== "up" ? `reveal-${direction}` : "";

  return (
    <div
      ref={ref}
      className={["reveal", directionClass, visible ? "is-visible" : "", className].filter(Boolean).join(" ")}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}
