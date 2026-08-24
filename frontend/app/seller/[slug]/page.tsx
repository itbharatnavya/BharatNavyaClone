"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { SellerProfile, SellerPublicProfile, Blog } from "@/lib/types";
import { getSeller, getBlogs } from "@/lib/api";
import { useConfig } from "@/lib/config";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ListingCard from "@/components/ListingCard";
import Modal from "@/components/Modal";
import SellerHeader from "@/components/seller/SellerHeader";
import ReviewsPanel from "@/components/seller/ReviewsPanel";
import SellerStoriesSection from "@/components/seller/SellerStoriesSection";

// Tolerant i18n wrapper — see listing page for rationale.
function useTr() {
  const i18n = useT();
  return (key: string, fallback: string): string => {
    const src = i18n as unknown as { t?: (k: string) => string } | ((k: string) => string);
    const fn = typeof src === "function" ? src : src?.t;
    const out = typeof fn === "function" ? fn(key) : undefined;
    return out && out !== key ? out : fallback;
  };
}

function deriveBadges(s: SellerProfile): string[] {
  const b: string[] = [];
  if (s.isVerified) b.push("verified");
  if (s.trustSealVerified) b.push("trusted");
  if ((s.rating ?? 0) >= 4.5) b.push("top_rated");
  const rt = s.performance?.avgResponseTimeHours;
  if (typeof rt === "number" && rt <= 2) b.push("fast_responder");
  return b;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

// ---- Icons (inline SVG line-glyphs only — no emoji) ------------------------
function ContactHeaderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1L6.6 10.8z" />
    </svg>
  );
}
function LocationPinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.7 7-11.5A7 7 0 0 0 5 9.5C5 14.3 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}
function DirectionsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11L20 3l-8 17-2.5-6.5L3 11z" />
    </svg>
  );
}
function ShareTileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="M8.3 10.7l7.4-4.2M8.3 13.3l7.4 4.2" />
    </svg>
  );
}
function StarOutlineIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1 5.9L12 16.8l-5.2 2.8 1-5.9-4.3-4.1 5.9-.7L12 3.5z" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="10" height="18" rx="1" />
      <rect x="14" y="9" width="6" height="12" rx="1" />
      <path d="M7 7h1M7 11h1M7 15h1M10.5 7h1M10.5 11h1M10.5 15h1M16.5 12.5h1M16.5 16h1" />
    </svg>
  );
}
function GstIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4" />
      <path d="M9.3 12h5.4M9.3 15.5h5.4" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M16 2.5v4M8 2.5v4M3 9.5h18" />
    </svg>
  );
}
function EmployeesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M15.8 13.6c2.2.5 3.9 2.4 3.9 6.4" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.5 3.7 5.7 3.7 9s-1.3 6.5-3.7 9c-2.4-2.5-3.7-5.7-3.7-9S9.6 5.5 12 3z" />
    </svg>
  );
}
function CertificateIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="5.5" />
      <path d="M9 13.7L7 21l5-2.5L17 21l-2-7.3" />
    </svg>
  );
}

// One tinted, tappable action tile (Directions / Share / Rate) — real
// actions only, no decorative buttons.
function ActionTile({
  icon,
  label,
  href,
  onClick,
  tone = "brand",
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "brand" | "action" | "success";
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    brand: { bg: "var(--brand-tint)", fg: "var(--brand)" },
    action: { bg: "var(--action-tint)", fg: "var(--action)" },
    success: { bg: "#ecfdf5", fg: "var(--success)" },
  };
  const tn = tones[tone];
  const inner = (
    <>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: tn.bg,
          color: tn.fg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{label}</span>
    </>
  );
  const style: React.CSSProperties = {
    flex: "1 1 0",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "12px 4px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "#fff",
    textDecoration: "none",
    cursor: "pointer",
  };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} style={style}>
      {inner}
    </button>
  );
}

// Contact card — location, directions, share and a rate shortcut. Every
// action here is real and already wired elsewhere in the app (Google Maps
// search, the seller-share link, the Reviews tab's own review form) — no
// invented features like "suggest hours" or "send enquiry by email" that
// this codebase doesn't actually support.
function ContactCard({
  companyName,
  city,
  state,
  onRate,
  t,
}: {
  companyName: string;
  city?: string;
  state?: string;
  onRate: () => void;
  t: (key: string, fallback: string) => string;
}) {
  const { addToast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const locationText = [city, state].filter(Boolean).join(", ");
  const mapsHref =
    city || state
      ? `https://www.google.com/maps/search/${encodeURIComponent(
          [companyName, city, state].filter(Boolean).join(", ")
        )}`
      : undefined;
  const shareUrl = () => (typeof window !== "undefined" ? window.location.href : "");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      addToast(t("contact.linkCopied", "Link copied to clipboard"), "success");
      setShareOpen(false);
    } catch {
      addToast(t("contact.copyFailed", "Could not copy link"), "error");
    }
  }

  return (
    <div className="card card-flat" style={{ overflow: "hidden", marginBottom: 16 }}>
      <div
        style={{
          padding: "13px 20px",
          background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "rgba(255,255,255,0.18)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ContactHeaderIcon />
        </span>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>
          {t("seller.contact", "Contact")}
        </h2>
      </div>

      <div style={{ padding: "18px 20px 20px" }}>
        {locationText && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "var(--action-tint)",
                color: "var(--action)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <LocationPinIcon />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--faint)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                {t("seller.location", "Location")}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--ink)", marginTop: 2 }}>{locationText}</div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 6 }}>
          {mapsHref && (
            <ActionTile icon={<DirectionsIcon />} label={t("seller.directions", "Directions")} href={mapsHref} tone="action" />
          )}
          <ActionTile icon={<ShareTileIcon />} label={t("common.share", "Share")} onClick={() => setShareOpen(true)} tone="brand" />
          <ActionTile icon={<StarOutlineIcon />} label={t("seller.rate", "Rate")} onClick={onRate} tone="success" />
        </div>
      </div>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={t("contact.shareTitle", "Share this seller")} size="sm">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Check out ${companyName} on BharatSource — ${shareUrl()}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-block"
            onClick={() => setShareOpen(false)}
          >
            {t("contact.shareWhatsApp", "Share on WhatsApp")}
          </a>
          <button type="button" className="btn btn-secondary btn-block" onClick={copyLink}>
            {t("contact.copyLink", "Copy link")}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function IconDetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: "var(--bg-subtle)",
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 12.5, color: "var(--muted)", flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

type TabKey = "listings" | "reviews" | "blogs" | "stories";

export default function SellerProfilePage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { addToast } = useToast();
  const cfg = useConfig();
  const flags: Record<string, boolean> = (cfg?.featureFlags as Record<string, boolean>) || {};
  const showHighlights =
    typeof flags.storyHighlights === "boolean" ? flags.storyHighlights : false;
  const showActiveStories = typeof flags.stories === "boolean" ? flags.stories : false;
  const t = useTr();

  const [profile, setProfile] = useState<SellerPublicProfile | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>("listings");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFound(false);
      setBlogs([]);

      let loaded: SellerPublicProfile | null = null;
      try {
        loaded = await getSeller(slug);
        if (!cancelled) setProfile(loaded);
      } catch (err) {
        if (!cancelled) {
          setNotFound(true);
          addToast(err instanceof Error ? err.message : "Seller not found.", "error");
        }
      }

      if (loaded) {
        try {
          const b = await getBlogs({ sellerId: loaded.id });
          if (!cancelled) setBlogs(b);
        } catch {
          /* non-fatal */
        }
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, addToast]);

  // Re-fetch after a logged-out visitor completes the contact-gate
  // login/register — the backend only includes contactMobile for
  // authenticated requests, so the first fetch (done while logged out)
  // never had it.
  const refreshContact = useCallback(async () => {
    if (!slug) return;
    try {
      const p = await getSeller(slug);
      setProfile(p);
    } catch {
      /* non-fatal */
    }
  }, [slug]);

  useEffect(() => {
    document.title = profile
      ? `${profile.seller.companyName} | BharatSource`
      : "Seller | BharatSource";
  }, [profile]);

  const badges = useMemo(() => {
    if (!profile) return [] as string[];
    const apiBadges = (profile as unknown as { badges?: string[] }).badges;
    return apiBadges && apiBadges.length ? apiBadges : deriveBadges(profile.seller);
  }, [profile]);

  // "Rate" (Contact card) jumps to the real Reviews tab/form instead of
  // faking an inline rating control.
  const tabsRef = useRef<HTMLDivElement>(null);
  const goToReviews = useCallback(() => {
    setTab("reviews");
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (loading) {
    return (
      <div>
        <div className="container-bs" style={{ paddingTop: 24, paddingBottom: 80 }}>
          <div className="skeleton" style={{ height: 240, width: "100%", marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 260, width: "100%" }} />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div>
        <div className="container-bs" style={{ paddingTop: 120, paddingBottom: 120, textAlign: "center" }}>
          <span className="eyebrow">{t("seller.notFound.eyebrow", "Seller not found")}</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "12px 0 16px", color: "var(--ink)" }}>
            {t("seller.notFound.title", "This seller doesn't exist")}
          </h1>
          <p style={{ color: "var(--muted)", maxWidth: 440, margin: "0 auto 28px" }}>
            {t("seller.notFound.message", "The profile may have been removed or the link is incorrect.")}
          </p>
          <Link href="/" className="btn btn-primary">
            {t("seller.notFound.cta", "Back to home")}
          </Link>
        </div>
      </div>
    );
  }

  const seller = profile.seller;
  const listings = profile.listings || [];

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "listings", label: t("seller.listings", "Listings"), count: listings.length },
    { key: "reviews", label: t("seller.reviews", "Reviews"), count: seller.reviewCount || undefined },
    { key: "blogs", label: t("seller.blogs", "Blogs"), count: blogs.length || undefined },
    ...(showActiveStories || showHighlights ? [{ key: "stories" as TabKey, label: t("seller.stories", "Stories") }] : []),
  ];

  return (
    <div>
      <div className="container-bs" style={{ paddingTop: 20, paddingBottom: 96 }}>
        <Breadcrumbs
          items={[
            { label: t("nav.directoryCrumb", "Directory"), href: "/directory" },
            { label: t("seller.crumbSellers", "Sellers") },
            { label: seller.companyName },
          ]}
        />

        <div style={{ marginTop: 14 }}>
          <SellerHeader
            userId={profile.id}
            companyName={seller.companyName}
            city={seller.location?.city || profile.city}
            state={seller.location?.state || profile.state}
            logo={seller.logo}
            coverImage={seller.coverImage}
            badges={badges}
            isVerified={seller.isVerified}
            trustSealVerified={seller.trustSealVerified}
            gstNumber={seller.gstNumber}
            yearEstablished={seller.yearEstablished}
            rating={seller.rating}
            reviewCount={seller.reviewCount}
            contactMobile={seller.contactMobile}
            onContactUnlocked={refreshContact}
          />
        </div>

        <div className="sp-layout">
          {/* MAIN — tabs (order:2 on mobile, see .sp-layout media query — the
              About/company-details aside moves ABOVE this so a mobile visitor
              doesn't have to scroll past every listing to reach it). */}
          <div className="sp-main" style={{ minWidth: 0 }}>
            <div
              ref={tabsRef}
              className="no-scrollbar"
              style={{
                display: "flex",
                gap: 4,
                borderBottom: "1px solid var(--border)",
                marginBottom: 24,
                overflowX: "auto",
              }}
              role="tablist"
            >
              {tabs.map((tb) => {
                const active = tab === tb.key;
                return (
                  <button
                    key={tb.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(tb.key)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "12px 14px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: active ? "var(--brand)" : "var(--muted)",
                      borderBottom: active ? "2px solid var(--brand)" : "2px solid transparent",
                      marginBottom: -1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tb.label}
                    {typeof tb.count === "number" && (
                      <span style={{ color: "var(--faint)", fontWeight: 500 }}> ({tb.count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* LISTINGS */}
            {tab === "listings" &&
              (listings.length === 0 ? (
                <div className="card card-flat card-pad" style={{ textAlign: "center", color: "var(--muted)" }}>
                  {t("seller.noListings", "This seller hasn't published any listings yet.")}
                </div>
              ) : (
                <div className="sp-grid">
                  {listings.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
              ))}

            {/* REVIEWS */}
            {tab === "reviews" && (
              <ReviewsPanel sellerId={profile.id} initialReviews={profile.reviews} />
            )}

            {/* BLOGS — the vendor's own promotional stories & guides */}
            {tab === "blogs" &&
              (blogs.length === 0 ? (
                <div className="card card-flat card-pad" style={{ textAlign: "center", color: "var(--muted)" }}>
                  {t("seller.noBlogs", "No blog posts yet.")}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 4 }}>
                    {t(
                      "seller.blogsIntro",
                      `Stories, guides and updates published by ${seller.companyName}.`
                    )}
                  </p>
                  {blogs.map((b) => (
                    <Link key={b.id} href={`/blog/${b.slug}`} className="card card-pad" style={{ display: "block" }}>
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <span
                          style={{
                            width: 96,
                            height: 72,
                            flexShrink: 0,
                            borderRadius: 8,
                            background: b.coverImage
                              ? `center/cover no-repeat url(${b.coverImage})`
                              : "linear-gradient(120deg, var(--brand-tint, #eff6ff), var(--action-tint, #fff7ed))",
                            border: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--faint)",
                            fontSize: 20,
                          }}
                          aria-hidden={!!b.coverImage}
                        >
                          {!b.coverImage && (
                            <svg
                              width="22"
                              height="22"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                            </svg>
                          )}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <h3 className="line-clamp-2" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                            {b.title}
                          </h3>
                          {b.excerpt && (
                            <p className="line-clamp-2" style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>
                              {b.excerpt}
                            </p>
                          )}
                          <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 8 }}>
                            {formatDate(b.publishedAt || b.createdAt)}
                            {typeof b.views === "number" ? ` · ${b.views} views` : ""}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}

            {/* STORIES — a "New"/"Highlights" toggle over a horizontally-scrolling
                rail (matches the homepage StoryRail pattern), so any number of
                stories or highlights stays a single swipeable row instead of a
                growing grid. */}
            {tab === "stories" && (showActiveStories || showHighlights) && (
              <SellerStoriesSection
                sellerId={profile.id}
                sellerName={seller.companyName}
                sellerSlug={seller.slug}
                avatarUrl={seller.logo || profile.avatarUrl}
                isVerified={seller.isVerified}
                showNew={showActiveStories}
                showHighlights={showHighlights}
              />
            )}
          </div>

          {/* ASIDE — contact + about + company details */}
          <aside className="sp-aside">
            <ContactCard
              companyName={seller.companyName}
              city={seller.location?.city}
              state={seller.location?.state}
              onRate={goToReviews}
              t={t}
            />

            {seller.about && (
              <div className="card card-flat card-pad" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                  {t("seller.about", "About")}
                </h2>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{seller.about}</p>
              </div>
            )}

            <div className="card card-flat card-pad">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "var(--brand-tint)",
                    color: "var(--brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BuildingIcon />
                </span>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                  {t("seller.details", "Company details")}
                </h2>
              </div>
              <IconDetailRow icon={<GstIcon />} label={t("seller.detail.gst", "GST")} value={seller.gstNumber || undefined} />
              <IconDetailRow
                icon={<CalendarIcon />}
                label={t("seller.detail.established", "Established")}
                value={
                  seller.yearEstablished
                    ? `${seller.yearEstablished} · ${new Date().getFullYear() - seller.yearEstablished} yrs`
                    : undefined
                }
              />
              <IconDetailRow icon={<EmployeesIcon />} label={t("seller.detail.employees", "Employees")} value={seller.employeeCount || undefined} />
              {seller.website && (
                <IconDetailRow
                  icon={<GlobeIcon />}
                  label={t("seller.detail.website", "Website")}
                  value={
                    <a href={seller.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>
                      {t("seller.detail.visit", "Visit")}
                    </a>
                  }
                />
              )}

              {seller.certifications && seller.certifications.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ color: "var(--faint)", display: "flex" }}>
                      <CertificateIcon />
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>
                      {t("seller.certifications", "Certifications")}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {seller.certifications.map((c) => (
                      <span key={c} className="badge badge-neutral">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .sp-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 32px;
          align-items: start;
          margin-top: 28px;
        }
        .sp-aside {
          position: sticky;
          top: 124px;
        }
        /* Same auto-fill/230px card-size pattern as every other listing grid
           in the app (DiscoveryResults.tsx's .dr-grid, listing/[id]'s
           .ld-grid) — a fixed 2-column grid here stretched cards far bigger
           than everywhere else on this wide (no-rail-competing) tab body. */
        .sp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 20px;
        }
        @media (max-width: 900px) {
          .sp-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .sp-aside {
            position: static;
            /* About/company details/trust score ahead of the tab body on
               mobile, so they're visible without scrolling past every
               listing — the sidebar only exists as a desktop-width column. */
            order: 1;
            margin-bottom: 24px;
          }
          .sp-main {
            order: 2;
          }
        }
      `}</style>
    </div>
  );
}
