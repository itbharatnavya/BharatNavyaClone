"use client";

import React from "react";
import Button from "@/components/Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

function DefaultIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  actionHref,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={["card card-flat card-pad", className].filter(Boolean).join(" ")}
      style={{
        textAlign: "center",
        padding: "56px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--brand-tint)",
          color: "var(--brand)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        {icon || <DefaultIcon />}
      </div>
      <h3 style={{ fontSize: "var(--fs-lg)", fontWeight: 700, color: "var(--ink)" }}>{title}</h3>
      {message && (
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", maxWidth: 420 }}>{message}</p>
      )}
      {actionLabel && (actionHref || onAction) && (
        <div style={{ marginTop: 14 }}>
          {actionHref ? (
            <Button variant="brand" href={actionHref}>
              {actionLabel}
            </Button>
          ) : (
            <Button variant="brand" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
