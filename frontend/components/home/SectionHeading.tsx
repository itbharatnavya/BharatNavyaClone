"use client";

import React from "react";
import Link from "next/link";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  actionHref,
  className = "",
}: SectionHeadingProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 28,
      }}
    >
      <div style={{ maxWidth: 640 }}>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h2 style={{ fontSize: "var(--fs-xl)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: 8 }}>{subtitle}</p>
        )}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className=""
          style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--brand)", whiteSpace: "nowrap" }}
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}
