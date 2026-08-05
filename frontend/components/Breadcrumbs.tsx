"use client";

import React from "react";
import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={className}
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${i}`}>
            {item.href && !last ? (
              <Link
                href={item.href}
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  transition: "color 150ms ease",
                }}
                className="hover:text-brand"
              >
                {item.label}
              </Link>
            ) : (
              <span
                style={{
                  fontSize: 13,
                  color: last ? "var(--ink)" : "var(--muted)",
                  fontWeight: last ? 600 : 400,
                }}
                aria-current={last ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!last && (
              <span style={{ color: "var(--faint)", fontSize: 13 }} aria-hidden>
                /
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
