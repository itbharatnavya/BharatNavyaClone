"use client";

import React from "react";

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  ring?: boolean;
}

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

// Deterministic soft background from the name.
function bgFromName(name?: string): string {
  const palette = ["#EFF6FF", "#FFF7ED", "#ECFDF5", "#F5F3FF", "#FEF2F2", "#F0F9FF"];
  const fg = ["#1D4ED8", "#C2410C", "#15803D", "#6D28D9", "#B91C1C", "#0369A1"];
  let h = 0;
  const s = name || "?";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const idx = h % palette.length;
  return `${palette[idx]}|${fg[idx]}`;
}

export default function Avatar({
  src,
  name,
  size = 40,
  className = "",
  ring = false,
}: AvatarProps) {
  const [bg, fg] = bgFromName(name).split("|");
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "999px",
    flexShrink: 0,
    boxShadow: ring ? "0 0 0 2px #fff, 0 0 0 3px #E5E7EB" : undefined,
  };

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className={className}
        style={{ ...common, objectFit: "cover" }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        ...common,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        color: fg,
        fontWeight: 600,
        fontSize: Math.round(size * 0.4),
        lineHeight: 1,
      }}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
