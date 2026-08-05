"use client";

import React from "react";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  rounded?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Skeleton({
  width,
  height,
  circle = false,
  rounded,
  className = "",
  style,
}: SkeletonProps) {
  return (
    <span
      className={["skeleton", className].filter(Boolean).join(" ")}
      style={{
        display: "block",
        width,
        height,
        borderRadius: circle ? "999px" : rounded,
        ...style,
      }}
    />
  );
}

/** Convenience: a stack of text lines. */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}
