"use client";

// The "Products" switcher for the primary nav — the suite counterpart to the
// Directory-scoped CategoryMegaMenu. Same interaction model (hover/click to
// open, outside-click + Escape + route-change to close) and the same card/
// flyout styling, but it lists the four SUITE products with their SVG glyph and
// one-liner. Exports:
//   • default ProductsMenu       — desktop trigger + flyout panel
//   • MobileProductsList          — the same four products for the mobile menu

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRODUCTS, type SuiteProduct } from "./products";

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function BoxesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ProductRow({ product, onNavigate }: { product: SuiteProduct; onNavigate?: () => void }) {
  const soon = product.status === "soon";
  const { Icon } = product;
  return (
    <Link
      href={product.href}
      onClick={onNavigate}
      style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", borderRadius: 10, minWidth: 0 }}
      className="hover:bg-bg-subtle"
    >
      <span
        aria-hidden
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: soon ? "var(--bg-subtle)" : "var(--brand-tint)",
          color: soon ? "var(--faint)" : "var(--brand)",
        }}
      >
        <Icon size={20} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{product.name}</span>
          {soon && <span className="badge badge-neutral" style={{ fontSize: 10 }}>Soon</span>}
        </span>
        <span className="line-clamp-2" style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 2, lineHeight: 1.45 }}>
          {product.tagline}
        </span>
      </span>
    </Link>
  );
}

// ==================================================================
// DESKTOP — trigger + flyout
// ==================================================================
export default function ProductsMenu() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={onKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
        style={{ fontWeight: 500 }}
      >
        <BoxesIcon />
        Products
        <ChevronDown />
      </button>

      {open && (
        <div className="absolute left-0 top-full pt-2 z-50 animate-scale-in">
          <div
            className="card card-flat"
            style={{ width: "min(560px, calc(100vw - 32px))", padding: 10 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 2,
              }}
            >
              {PRODUCTS.map((p) => (
                <ProductRow key={p.key} product={p} onNavigate={() => setOpen(false)} />
              ))}
            </div>
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 10, paddingLeft: 12, paddingBottom: 2 }}>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                One BharatSource account works across every product.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================================================================
// MOBILE — flat list inside the hamburger overlay
// ==================================================================
export function MobileProductsList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div>
      <div className="px-3 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-faint">Products</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {PRODUCTS.map((p) => (
          <ProductRow key={p.key} product={p} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
