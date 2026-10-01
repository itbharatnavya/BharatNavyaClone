"use client";

import React from "react";
import Link from "next/link";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange?: (page: number) => void;
  hrefBuilder?: (page: number) => string;
  className?: string;
}

// Produces a compact page list with ellipses: 1 … 4 5 [6] 7 8 … 20
function pageList(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}

export default function Pagination({
  page,
  totalPages,
  onChange,
  hrefBuilder,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = pageList(page, totalPages);

  const cellStyle = (active: boolean): React.CSSProperties => ({
    minWidth: 44,
    height: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 10px",
    borderRadius: "var(--r-xs)",
    fontSize: "var(--fs-sm)",
    fontWeight: active ? 700 : 500,
    border: "1px solid",
    borderColor: active ? "var(--brand)" : "var(--border)",
    background: active ? "var(--brand)" : "#fff",
    color: active ? "#fff" : "var(--ink)",
    cursor: "pointer",
    userSelect: "none",
  });

  const renderCell = (p: number, active: boolean) => {
    if (hrefBuilder && !active) {
      return (
        <Link key={p} href={hrefBuilder(p)} style={cellStyle(false)}>
          {p}
        </Link>
      );
    }
    return (
      <button
        key={p}
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={() => !active && onChange?.(p)}
        style={cellStyle(active)}
      >
        {p}
      </button>
    );
  };

  const arrow = (target: number, label: string, disabled: boolean, icon: React.ReactNode) => {
    const style: React.CSSProperties = {
      ...cellStyle(false),
      color: disabled ? "var(--faint)" : "var(--muted)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
    };
    if (hrefBuilder && !disabled) {
      return (
        <Link href={hrefBuilder(target)} aria-label={label} style={style}>
          {icon}
        </Link>
      );
    }
    return (
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(target)}
        style={style}
      >
        {icon}
      </button>
    );
  };

  return (
    <nav
      aria-label="Pagination"
      className={className}
      style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
    >
      {arrow(page - 1, "Previous page", page <= 1, "‹")}
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`e-${i}`}
            style={{ padding: "0 6px", color: "var(--faint)" }}
          >
            …
          </span>
        ) : (
          renderCell(p, p === page)
        )
      )}
      {arrow(page + 1, "Next page", page >= totalPages, "›")}
    </nav>
  );
}
