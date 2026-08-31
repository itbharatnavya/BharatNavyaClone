"use client";

import React from "react";

export type BadgeVariant =
  | "verified"
  | "sponsored"
  | "premium"
  | "new"
  | "neutral"
  | "custom";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const VARIANT_CLASS: Record<Exclude<BadgeVariant, "custom">, string> = {
  verified: "badge-verified",
  sponsored: "badge-sponsored",
  premium: "badge-premium",
  new: "badge-new",
  neutral: "badge-neutral",
};

export default function Badge({
  variant = "neutral",
  children,
  icon,
  className = "",
}: BadgeProps) {
  const variantClass = variant === "custom" ? "" : VARIANT_CLASS[variant];
  return (
    <span
      className={["badge", variantClass, className].filter(Boolean).join(" ")}
    >
      {icon}
      {children}
    </span>
  );
}
