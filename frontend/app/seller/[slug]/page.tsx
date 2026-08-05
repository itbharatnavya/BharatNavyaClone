"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { SellerProfile, SellerPublicProfile, Blog } from "@/lib/types";
import { getSeller, getBlogs } from "@/lib/api";
import { useConfig } from "@/lib/config";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ListingCard from "@/components/ListingCard";
import SellerHeader from "@/components/seller/SellerHeader";
import ReviewsPanel from "@/components/seller/ReviewsPanel";
import HighlightsRow from "@/components/seller/HighlightsRow";

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

interface TrustFactor {
  key: string;
  label: string;
  points: number;
  max: number;
}

// Trust score card — computed 0–100 score shown on the public profile. Reads the
// backend-computed fields (trustScore / trustBand / trustFactors) which the seller
// endpoint attaches on read.
function TrustScoreCard({
  score,
  band,
  factors,
  t,
}: {
  score: number;
  band: string;
  factors: TrustFactor[];
  t: (key: string, fallback: string) => string;
}) {
  const bandColor =
    band === "Excellent"
      ? "var(--success)"
      : band === "Good"
      ? "var(--brand)"
      : "var(--warn)";
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div className="card card-flat card-pad" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
        {t("seller.trustScore", "Trust score")}
      </h2>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 34, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: 14, color: "var(--faint)", fontWeight: 600 }}>/ 100</span>
        <span
          className="badge"
          style={{
            marginLeft: "auto",
            color: bandColor,
            background: "var(--bg-subtle)",
            border: `1px solid var(--border)`,
            fontWeight: 700,
          }}
        >
          {band}
        </span>
      </div>

      {/* Thin SVG progress bar */}
      <svg
        width="100%"
        height="8"
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        style={{ display: "block", marginBottom: 14 }}
        aria-hidden
      >
        <rect x="0" y="1" width="100" height="6" rx="3" fill="var(--border)" />
        <rect x="0" y="1" width={pct} height="6" rx="3" fill={bandColor} />
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {factors.map((f) => {
          const fpct = f.max > 0 ? Math.max(0, Math.min(100, (f.points / f.max) * 100)) : 0;
          return (
            <div key={f.key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{f.label}</span>
                <span style={{ fontSize: 12.5, color: "var(--faint)", fontWeight: 600 }}>
                  {f.points}/{f.max}
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: "var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${fpct}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: "var(--brand)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

type TabKey = "listings" | "reviews" | "blogs" | "highlights";

export default function SellerProfilePage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { addToast } = useToast();
  const cfg = useConfig();
  const flags: Record<string, boolean> = (cfg?.featureFlags as Record<string, boolean>) || {};
  const showHighlights =
    typeof flags.storyHighlights === "boolean" ? flags.storyHighlights : false;
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

  if (loading) {
    return (
      <div style={{ paddingTop: 64 }}>
        <div className="container-bs" style={{ paddingTop: 24, paddingBottom: 80 }}>
          <div className="skeleton" style={{ height: 240, width: "100%", marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 260, width: "100%" }} />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={{ paddingTop: 64 }}>
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
  const businessHours = (seller as unknown as { businessHours?: string }).businessHours;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "listings", label: t("seller.listings", "Listings"), count: listings.length },
    { key: "reviews", label: t("seller.reviews", "Reviews"), count: seller.reviewCount || undefined },
    { key: "blogs", label: t("seller.blogs", "Blogs"), count: blogs.length || undefined },
    ...(showHighlights ? [{ key: "highlights" as TabKey, label: t("seller.highlights", "Highlights") }] : []),
  ];

  return (
    <div style={{ paddingTop: 64 }}>
      <div className="container-bs" style={{ paddingTop: 20, paddingBottom: 96 }}>
        <Breadcrumbs
          items={[
            { label: t("nav.home", "Home"), href: "/" },
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
            responseRate={seller.responseRate}
            contactMobile={seller.contactMobile}
            firstListingId={listings[0]?.id || null}
          />
        </div>

        <div className="sp-layout">
          {/* MAIN — tabs */}
          <div style={{ minWidth: 0 }}>
            <div
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

            {/* HIGHLIGHTS */}
            {tab === "highlights" && showHighlights && (
              <HighlightsRow
                sellerId={profile.id}
                sellerName={seller.companyName}
                sellerSlug={seller.slug}
                avatarUrl={seller.logo || profile.avatarUrl}
                isVerified={seller.isVerified}
              />
            )}
          </div>

          {/* ASIDE — about + company details */}
          <aside className="sp-aside">
            {(() => {
              const trust = seller as unknown as {
                trustScore?: number;
                trustBand?: string;
                trustFactors?: TrustFactor[];
              };
              if (typeof trust.trustScore !== "number") return null;
              return (
                <TrustScoreCard
                  score={trust.trustScore}
                  band={trust.trustBand || "Fair"}
                  factors={trust.trustFactors || []}
                  t={t}
                />
              );
            })()}

            {seller.about && (
              <div className="card card-flat card-pad" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                  {t("seller.about", "About")}
                </h2>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{seller.about}</p>
              </div>
            )}

            <div className="card card-flat card-pad">
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                {t("seller.details", "Company details")}
              </h2>
              <DetailRow label={t("seller.detail.gst", "GST")} value={seller.gstNumber || undefined} />
              <DetailRow label={t("seller.detail.established", "Established")} value={seller.yearEstablished || undefined} />
              <DetailRow label={t("seller.detail.employees", "Employees")} value={seller.employeeCount || undefined} />
              <DetailRow
                label={t("seller.detail.location", "Location")}
                value={[seller.location?.city, seller.location?.state].filter(Boolean).join(", ") || undefined}
              />
              <DetailRow label={t("seller.detail.hours", "Business hours")} value={businessHours || undefined} />
              {seller.website && (
                <DetailRow
                  label={t("seller.detail.website", "Website")}
                  value={
                    <a href={seller.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand)" }}>
                      {t("seller.detail.visit", "Visit")}
                    </a>
                  }
                />
              )}
              {(seller.location?.city || seller.location?.state) && (
                <div style={{ marginTop: 12 }}>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(
                      [seller.companyName, seller.location?.city, seller.location?.state].filter(Boolean).join(", ")
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm btn-block"
                  >
                    {t("seller.viewOnMap", "View on map")}
                  </a>
                </div>
              )}
            </div>

            {seller.certifications && seller.certifications.length > 0 && (
              <div className="card card-flat card-pad" style={{ marginTop: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
                  {t("seller.certifications", "Certifications")}
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {seller.certifications.map((c) => (
                    <span key={c} className="badge badge-neutral">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
          top: 80px;
        }
        .sp-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }
        @media (max-width: 900px) {
          .sp-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .sp-aside {
            position: static;
          }
        }
        @media (max-width: 560px) {
          .sp-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
