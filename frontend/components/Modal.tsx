"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  bodyClassName?: string;
}

const WIDTH: Record<NonNullable<ModalProps["size"]>, number> = {
  sm: 420,
  md: 560,
  lg: 760,
  xl: 980,
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className = "",
  bodyClassName = "",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('button, a[href], input, textarea, select')?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : "Dialog"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        isolation: "isolate",
        background: "rgba(15,23,42,.66)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflow: "auto",
        overscrollBehavior: "contain",
      }}
      className="animate-fade-in"
    >
      <div
        ref={dialogRef}
        className={["animate-scale-in", className].filter(Boolean).join(" ")}
        style={{
          width: WIDTH[size],
          maxWidth: "100%",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bn-surface, #fff)",
          borderRadius: "var(--r-lg)",
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
            <div id={titleId} style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>
              {title}
            </div>
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: "color-mix(in srgb, var(--ink) 7%, white)",
              border: "none",
              cursor: "pointer",
              color: "var(--ink)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              padding: 0,
              borderRadius: "50%",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className={bodyClassName} style={{ padding: 22, overflowY: "auto" }}>{children}</div>
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
    </div>,
    document.body,
  );
}
