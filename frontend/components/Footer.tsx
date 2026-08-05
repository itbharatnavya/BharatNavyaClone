"use client";

import React from "react";
import Link from "next/link";
import { useConfig } from "@/lib/config";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Products",
    links: [
      { label: "Directory", href: "/directory" },
      { label: "Consultations", href: "/consultations" },
      { label: "Credit Card", href: "/credit-card" },
      { label: "Mutual", href: "/mutual" },
    ],
  },
  {
    heading: "Categories",
    links: [
      { label: "Industrial Supplies", href: "/industrial-supplies" },
      { label: "Professional Services", href: "/professional-services" },
      { label: "Electronics", href: "/electronics" },
      { label: "Textiles & Apparel", href: "/textiles" },
      { label: "Brands", href: "/brands" },
      { label: "Collections", href: "/collections" },
      { label: "Shortlist", href: "/shortlist" },
      { label: "Explore all", href: "/search" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "What we offer", href: "/offer" },
      { label: "Blog", href: "/blog" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "For Sellers",
    links: [
      { label: "Start selling", href: "/sell" },
      { label: "Seller plans", href: "/pricing" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Post an RFQ", href: "/rfq" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Trust & Safety", href: "/trust" },
    ],
  },
];

// Split a camelCase brand into ink + accent halves for the wordmark.
function splitBrand(name: string): [string, string] {
  const m = name.match(/^(.*[a-z])([A-Z].*)$/);
  if (m) return [m[1], m[2]];
  return [name, ""];
}

export default function Footer() {
  const { branding, contact, footer } = useConfig();
  const siteName = branding.siteName || "BharatSource";
  const [head, tail] = splitBrand(siteName);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-bg-subtle">
      <div className="container-bs py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(5,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white"
                style={{ background: "linear-gradient(135deg,#F97316,#EA580C)", fontWeight: 800 }}
              >
                {siteName.charAt(0) || "B"}
              </span>
              <span className="text-[18px] font-extrabold tracking-tight text-ink">
                {head}
                {tail && <span className="text-action">{tail}</span>}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted max-w-[280px]">
              {footer.about}
            </p>

            {(contact.email || contact.phone || contact.address) && (
              <div className="mt-4 flex flex-col gap-1.5 text-sm text-muted">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="hover:text-ink transition-colors">
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="hover:text-ink transition-colors">
                    {contact.phone}
                  </a>
                )}
                {contact.address && <span className="text-faint">{contact.address}</span>}
              </div>
            )}
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <div className="text-xs font-semibold uppercase tracking-wide text-faint mb-3">
                {col.heading}
              </div>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted hover:text-ink transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider my-8" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-faint">© {year} {siteName}. All rights reserved.</span>
          <span className="text-sm text-faint">Made in India</span>
        </div>
      </div>
    </footer>
  );
}
