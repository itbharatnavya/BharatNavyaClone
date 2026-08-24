"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useConfig } from "@/lib/config";
import { DirectoryIcon } from "./suite/products";
import { RecruitmentIcon } from "./home/icons";

// Kept in lockstep with SuiteNavMenu's MODULES — the two suite modules with a
// real destination page today. Consultations/Credit Card/Mutual are future
// placeholders (see components/suite/products.tsx) and deliberately excluded
// here, same as the header nav. Recruitment's status tracks
// featureFlags.recruitmentLive (RECRUITMENT.md §5) rather than being hardcoded.
interface FooterModule {
  key: string;
  name: string;
  href: string;
  tagline: string;
  status: "live" | "soon";
  Icon: React.FC<{ size?: number }>;
}

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "What we offer", href: "/offer" },
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Trust & Safety", href: "/trust" },
];

// Split a camelCase brand into ink + accent halves for the wordmark.
function splitBrand(name: string): [string, string] {
  const m = name.match(/^(.*[a-z])([A-Z].*)$/);
  if (m) return [m[1], m[2]];
  return [name, ""];
}

function ColumnLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <span className="text-xs font-semibold uppercase tracking-wide text-faint">{children}</span>
    </div>
  );
}

export default function Footer() {
  const { branding, contact, footer, featureFlags } = useConfig();
  const modules: FooterModule[] = useMemo(
    () => [
      {
        key: "directory",
        name: "Directory",
        href: "/directory",
        tagline: "Source verified products & suppliers.",
        status: "live",
        Icon: DirectoryIcon,
      },
      {
        key: "recruitment",
        name: "Recruitment",
        href: "/recruitment",
        tagline: "Post roles, meet vetted candidates.",
        status: featureFlags.recruitmentLive ? "live" : "soon",
        Icon: RecruitmentIcon,
      },
    ],
    [featureFlags.recruitmentLive]
  );
  const siteName = branding.siteName || "BharatSource";
  const [head, tail] = splitBrand(siteName);
  const year = new Date().getFullYear();

  return (
    <footer className="bg-bg-subtle footer-tricolor">
      <div className="container-bs py-12">
        <div className="flex flex-wrap justify-between gap-x-14 gap-y-10">
          <div className="max-w-[320px] min-w-[240px]">
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
            {branding.tagline && (
              <p className="mt-3 text-sm font-medium text-ink">{branding.tagline}</p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-muted">{footer.about}</p>

            {(contact.email || contact.phone || contact.address) && (
              <div className="mt-5 flex flex-col gap-2 text-sm text-muted">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 hover:text-ink transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0 text-faint">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m4 7 8 6 8-6" />
                    </svg>
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 hover:text-ink transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0 text-faint">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
                    </svg>
                    {contact.phone}
                  </a>
                )}
                {contact.address && (
                  <span className="inline-flex items-start gap-2 text-faint">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0 mt-0.5">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {contact.address}
                  </span>
                )}
              </div>
            )}

            <Link href="/contact" className="btn btn-secondary btn-sm mt-5">
              Get in touch
            </Link>
          </div>

          <div className="min-w-[220px]">
            <ColumnLabel color="var(--brand)">Products</ColumnLabel>
            <ul className="flex flex-col gap-3">
              {modules.map((m) => {
                const { Icon } = m;
                return (
                  <li key={m.key}>
                    <Link href={m.href} className="group flex items-start gap-3">
                      <span
                        aria-hidden
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: m.status === "soon" ? "var(--tricolor-green-tint)" : "var(--brand-tint)",
                          color: m.status === "soon" ? "var(--tricolor-green)" : "var(--brand)",
                        }}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink group-hover:text-brand transition-colors">
                            {m.name}
                          </span>
                          {m.status === "soon" && (
                            <span className="badge badge-neutral" style={{ fontSize: 10 }}>Soon</span>
                          )}
                        </span>
                        <span className="block text-xs text-muted mt-0.5">{m.tagline}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="min-w-[140px]">
            <ColumnLabel color="var(--action)">Company</ColumnLabel>
            <ul className="flex flex-col gap-2.5">
              {COMPANY_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted hover:text-ink transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="divider my-8" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-faint">© {year} {siteName}. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="text-sm text-faint hover:text-ink transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
          <span className="text-sm text-faint">Made in India</span>
        </div>
      </div>
    </footer>
  );
}
