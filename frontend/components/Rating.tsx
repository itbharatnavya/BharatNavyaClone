"use client";

import React from "react";

export interface RatingProps {
  value: number; // 0..5
  count?: number; // review count
  size?: number; // star px
  showValue?: boolean;
  className?: string;
}

function Star({ fill, size }: { fill: number; size: number }) {
  // fill: 0..1 fraction
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#3B6CF5" />
          <stop offset={`${fill * 100}%`} stopColor="#E5E7EB" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

export default function Rating({
  value,
  count,
  size = 15,
  showValue = true,
  className = "",
}: RatingProps) {
  const v = Math.max(0, Math.min(5, value || 0));
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <span style={{ display: "inline-flex", gap: 1 }} aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size} fill={Math.max(0, Math.min(1, v - i))} />
        ))}
      </span>
      {showValue && (
        <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--ink)" }}>
          {v.toFixed(1)}
        </span>
      )}
      {typeof count === "number" && (
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)" }}>({count})</span>
      )}
    </span>
  );
}
