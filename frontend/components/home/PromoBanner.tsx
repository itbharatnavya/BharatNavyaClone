"use client";

// PromoBanner — the promo row shown right under the hero search: a big
// slot on the left + four smaller tinted promo cards (each linking to a
// real, already-working Directory route) on the right. This banner is
// Directory-scoped (it only renders on app/directory/page.tsx) — Recruitment
// is a co-equal suite product, not a Directory feature, so it doesn't belong
// here even "Soon"-badged; it gets its own promotion at the suite level
// (SuiteNavMenu.tsx, Footer.tsx, the homepage hero) instead. See CLAUDE.md.
//
// The big slot is real seller advertising (ad-bookings, placement
// "home_hero" — the same self-serve campaigns sellers create from
// Dashboard → Advertise, components/dashboard/AdvertiseTab.tsx) rendered
// via AdSlider, matching the "category_top" AdSlider already used on
// category pages (components/discovery/CategoryLanding.tsx). It used to
// hardcode a static "Post a requirement" RFQ banner in this spot — that
// banner now only shows as a fallback when there's no active sponsored
// content, so the ad slot doesn't sit empty on a fresh install.
// Local /demo images only, per CLAUDE.md's "never hot-link external images"
// rule.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AdSlider, { type AdCreative } from "@/components/AdSlider";
import { getAds } from "@/lib/api";

interface PromoCard {
  title: string;
  subtitle: string;
  href: string;
  image: string;
  overlay: string;
  dot: string;
}

const CARDS: PromoCard[] = [
  {
    title: "B2B Sourcing",
    subtitle: "Quick quotes from verified sellers",
    href: "/categories",
    image: "industry-2",
    overlay: "linear-gradient(160deg, rgba(26,79,174,0.90) 0%, rgba(18,59,135,0.96) 100%)",
    dot: "#1a4fae",
  },
  {
    title: "Become a Seller",
    subtitle: "List your business, free",
    href: "/register",
    image: "business-3",
    overlay: "linear-gradient(160deg, rgba(22,48,92,0.90) 0%, rgba(10,26,53,0.96) 100%)",
    dot: "#16305c",
  },
  {
    title: "Shop by Brand",
    subtitle: "Browse trusted, well-known brands",
    href: "/brands",
    image: "retail-2",
    overlay: "linear-gradient(160deg, rgba(245,130,31,0.88) 0%, rgba(196,94,10,0.95) 100%)",
    dot: "#f5821f",
  },
  {
    title: "Verified Suppliers",
    subtitle: "Browse trusted businesses",
    href: "/search",
    image: "retail-1",
    overlay: "linear-gradient(160deg, rgba(22,163,74,0.88) 0%, rgba(13,110,50,0.95) 100%)",
    dot: "#16a34a",
  },
];

function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export default function PromoBanner() {
  // null = still loading. Rendered as a skeleton — NOT the RFQ fallback —
  // so visitors never see "Post a requirement" flash and then get replaced
  // by a sponsored ad a moment later.
  const [ads, setAds] = useState<AdCreative[] | null>(null);

  useEffect(() => {
    let alive = true;
    getAds("home_hero")
      .then((rows) => alive && setAds(Array.isArray(rows) ? rows : []))
      .catch(() => alive && setAds([]));
    return () => {
      alive = false;
    };
  }, []);

  const bigSlotClassName = "col-span-2 sm:col-span-3 lg:col-span-2";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Big slot — real sponsored ads (placement: home_hero) when any are
          active; a skeleton while that's still loading; the "post a
          requirement" RFQ fallback only once loading has actually finished
          with zero active campaigns. Sizing (minHeight 152 / fillHeight)
          matches the CARDS below exactly, so nothing in this row is
          shorter than its neighbours. */}
      {ads === null ? (
        <div
          className={bigSlotClassName}
          aria-hidden
          style={{ borderRadius: 16, minHeight: 152 }}
        >
          <span className="skeleton" style={{ display: "block", width: "100%", height: "100%", minHeight: 152, borderRadius: 16 }} />
        </div>
      ) : ads.length > 0 ? (
        <AdSlider
          placement="home_hero"
          ads={ads}
          className={bigSlotClassName}
          fillHeight
        />
      ) : (
      <Link
        href="/rfq"
        className={bigSlotClassName}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "linear-gradient(120deg, var(--brand-tint) 0%, #dce9fc 100%)",
          minHeight: 152,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", zIndex: 1, padding: "20px 22px", maxWidth: "62%" }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--brand)",
            }}
          >
            Post a requirement
          </span>
          <p style={{ margin: "6px 0 14px", fontSize: 17, fontWeight: 800, color: "var(--ink)", lineHeight: 1.28 }}>
            Get quotes from verified suppliers — free
          </p>
          <span className="btn btn-primary btn-sm" style={{ pointerEvents: "none" }}>
            Post RFQ
            <ArrowIcon />
          </span>
        </div>
        <img
          src="/demo/industry-1.jpg"
          alt=""
          aria-hidden
          loading="lazy"
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            height: "100%",
            width: "50%",
            objectFit: "cover",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 35%)",
            maskImage: "linear-gradient(90deg, transparent 0%, black 35%)",
          }}
        />
      </Link>
      )}

      {CARDS.map((c) => (
        <Link
          key={c.title}
          href={c.href}
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 16,
            minHeight: 152,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 14,
          }}
        >
          <img
            src={`/demo/${c.image}.jpg`}
            alt=""
            aria-hidden
            loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <span aria-hidden style={{ position: "absolute", inset: 0, background: c.overlay }} />
          <span className="line-clamp-1" style={{ position: "relative", zIndex: 1, color: "#fff", fontSize: 14.5, fontWeight: 700, lineHeight: 1.25 }}>
            {c.title}
          </span>
          <span className="line-clamp-2" style={{ position: "relative", zIndex: 1, color: "rgba(255,255,255,0.88)", fontSize: 12, marginTop: 4, lineHeight: 1.35 }}>
            {c.subtitle}
          </span>
          <span
            aria-hidden
            style={{
              position: "relative",
              zIndex: 1,
              marginTop: 12,
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.94)",
              color: c.dot,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArrowIcon />
          </span>
        </Link>
      ))}
    </div>
  );
}
