"use client";

import React, { useEffect } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const WIDTH: Record<NonNullable<ModalProps["size"]>, number> = {
  sm: 420,
  md: 560,
  lg: 760,
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className = "",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 150,
        background: "rgba(15,23,42,.66)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      className="animate-fade-in"
    >
      <div
        className={["animate-scale-in", className].filter(Boolean).join(" ")}
        style={{
          width: WIDTH[size],
          maxWidth: "100%",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(16,24,40,.24)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: title ? "space-between" : "flex-end",
            gap: 12,
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {title && (
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
              {title}
            </div>
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              display: "inline-flex",
              padding: 4,
              borderRadius: 8,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div style={{ padding: 22, overflowY: "auto" }}>{children}</div>
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: "16px 22px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-subtle)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
