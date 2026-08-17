"use client";

// The suite-nav "Products" switcher for non-Directory pages (home, /recruitment,
// /about…) — deliberately separate from components/suite/ProductsMenu.tsx (which
// lists all four suite products and also drives the Footer). This one lists only
// the two modules with a real destination page today: Directory and Recruitment.
// Bharat Agent isn't included — it has no route yet (see BharatAgentPanel.tsx).
// Same interaction model as ProductsMenu: hover/click to open, outside-click +
// Escape + route-change to close.

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DirectoryIcon } from "./products";
import { RecruitmentIcon } from "@/components/home/icons";

interface NavModule {
  key: string;
  name: string;
  href: string;
  tagline: string;
  status: "live" | "soon";
  Icon: React.FC<{ size?: number }>;
}

const MODULES: NavModule[] = [
  {
    key: "directory",
    name: "Directory",
    href: "/directory",
    tagline: "Source verified products & suppliers across India.",
    status: "live",
    Icon: DirectoryIcon,
  },
  {
    key: "recruitment",
    name: "Recruitment",
    href: "/recruitment",
    tagline: "Post roles and connect with vetted candidates.",
    status: "soon",
    Icon: RecruitmentIcon,
  },
];

function ChevronDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ModuleRow({ module, onNavigate }: { module: NavModule; onNavigate?: () => void }) {
  const soon = module.status === "soon";
  const { Icon } = module;
  return (
    <Link
      href={module.href}
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
          background: soon ? "var(--tricolor-green-tint)" : "var(--brand-tint)",
          color: soon ? "var(--tricolor-green)" : "var(--brand)",
        }}
      >
        <Icon size={20} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{module.name}</span>
          {soon && <span className="badge badge-neutral" style={{ fontSize: 10 }}>Soon</span>}
        </span>
        <span className="line-clamp-2" style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 2, lineHeight: 1.45 }}>
          {module.tagline}
        </span>
      </span>
    </Link>
  );
}

// ==================================================================
// DESKTOP — trigger + flyout
// ==================================================================
export default function SuiteProductsMenu() {
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
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors"
      >
        Products
        <ChevronDown />
      </button>

      {open && (
        <div className="absolute left-0 top-full pt-2 z-50 animate-scale-in">
          <div className="card card-flat" style={{ width: "min(320px, calc(100vw - 32px))", padding: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {MODULES.map((m) => (
                <ModuleRow key={m.key} module={m} onNavigate={() => setOpen(false)} />
              ))}
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
export function MobileSuiteProductsList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div>
      <div className="px-3 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-faint">Products</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {MODULES.map((m) => (
          <ModuleRow key={m.key} module={m} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
