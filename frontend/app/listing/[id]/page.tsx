"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Listing, SellerPublicProfile } from "@/lib/types";
import { getListing, getSeller, getListings, getListingOffers, type Offer } from "@/lib/api";
import { formatLocation } from "@/lib/indiaGeo";
import { useCompare } from "@/lib/compare";
import { useShortlist } from "@/lib/shortlist";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import Badge from "@/components/Badge";
import ListingCard from "@/components/ListingCard";
import Gallery from "@/components/listing/Gallery";
import PriceBlock from "@/components/listing/PriceBlock";
import SpecTable from "@/components/listing/SpecTable";
import SellerContactCard, { ContactSeller } from "@/components/listing/SellerContactCard";
import OtherSellers from "@/components/listing/OtherSellers";

// Robust i18n wrapper: tolerant of the useT() return shape and missing keys,
// always falling back to a clean English string.
function useTr() {
  const i18n = useT();
  return (key: string, fallback: string): string => {
    const src = i18n as unknown as { t?: (k: string) => string } | ((k: string) => string);
    const fn = typeof src === "function" ? src : src?.t;
    const out = typeof fn === "function" ? fn(key) : undefined;
    return out && out !== key ? out : fallback;
  };
}

function prettifySlug(slug: string): string {
  return slug.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ListingDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { addToast } = useToast();
  const t = useTr();
  const compare = useCompare();
  const shortlist = useShortlist();

  const [listing, setListing] = useState<Listing | null>(null);
  const [profile, setProfile] = useState<SellerPublicProfile | null>(null);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFound(false);
      setProfile(null);
      setSellerListings([]);
      setSimilar([]);
      setOffers([]);
      setMinPrice(null);

      let loaded: Listing | null = null;
      try {
        loaded = await getListing(id);
        if (!cancelled) setListing(loaded);
      } catch (err) {
        if (!cancelled) {
          setNotFound(true);
          addToast(err instanceof Error ? err.message : "Listing not found.", "error");
        }
      }

      if (loaded) {
        const cur = loaded; // non-null + stable inside async closures

        // ---- "Other sellers offering this product" (MULTI-VENDOR-PER-PRODUCT) ----
        // Other approved sellers with the same productKey; empty when nobody else sells it.
        try {
          const res = await getListingOffers(cur.id);
          if (!cancelled) {
            setOffers(res.offers);
            setMinPrice(res.minPrice);
          }
        } catch {
          /* non-fatal — section simply stays hidden */
        }

        // Enrich the seller card with real contact/trust data (and its listings).
        let p: SellerPublicProfile | null = null;
        const slug = cur.seller?.slug;
        if (slug) {
          try {
            p = await getSeller(slug);
            if (!cancelled) setProfile(p);
          } catch {
            /* fall back to denormalized listing.seller */
          }
        }

        // ---- "More from this seller" ----
        // Prefer the seller profile's own listings (a dedicated call); otherwise
        // pull a page of listings and filter to this seller.
        let sellerItems: Listing[] = [];
        if (p?.listings && p.listings.length > 0) {
          sellerItems = p.listings.filter((l) => l.id !== cur.id).slice(0, 8);
        } else {
          try {
            const res = await getListings({ limit: 12 });
            sellerItems = res.listings
              .filter((l) => l.sellerId === cur.sellerId && l.id !== cur.id)
              .slice(0, 8);
          } catch {
            /* non-fatal */
          }
        }
        if (!cancelled) setSellerListings(sellerItems);

        // ---- "Similar products" (same top-level category) ----
        // Exclude this listing and anything already shown under "More from this
        // seller"; prefer other sellers so the two sections stay distinct.
        const catSlug = cur.categoryPath?.[0] || undefined;
        try {
          const res = await getListings({ category: catSlug, limit: 12 });
          const shown = new Set(sellerItems.map((l) => l.id));
          const base = res.listings.filter((l) => l.id !== cur.id && !shown.has(l.id));
          const distinct = base.filter((l) => l.sellerId !== cur.sellerId);
          if (!cancelled) setSimilar((distinct.length > 0 ? distinct : base).slice(0, 8));
        } catch {
          /* non-fatal */
        }
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, addToast]);

  useEffect(() => {
    document.title = listing
      ? `${listing.title} | BharatSource`
      : "Listing | BharatSource";
  }, [listing]);

  const contact: ContactSeller | null = useMemo(() => {
    if (!listing) return null;
    const s = profile?.seller;
    if (s) {
      return {
        userId: listing.sellerId,
        name: s.companyName || profile?.name || "Seller",
        slug: s.slug,
        city: s.location?.city || profile?.city,
        state: s.location?.state || profile?.state,
        logo: s.logo,
        rating: s.rating,
        reviewCount: s.reviewCount,
        responseRate: s.responseRate,
        isVerified: s.isVerified,
        trustSealVerified: s.trustSealVerified,
        gstNumber: s.gstNumber,
        yearEstablished: s.yearEstablished,
        contactMobile: s.contactMobile,
      };
    }
    const ls = listing.seller;
    return {
      userId: listing.sellerId,
      name: ls?.companyName || ls?.name || listing.sellerName || "Seller",
      slug: ls?.slug,
      city: ls?.city || listing.location?.city,
      state: ls?.state || listing.location?.state,
      logo: ls?.logo,
      rating: ls?.rating ?? listing.rating,
      reviewCount: ls?.reviewCount ?? listing.reviewCount,
      responseRate: ls?.responseRate,
      isVerified: ls?.isVerified ?? listing.isVerifiedSeller,
      trustSealVerified: ls?.trustSealVerified,
      gstNumber: ls?.gstNumber,
      yearEstablished: ls?.yearEstablished,
      contactMobile: null,
    };
  }, [listing, profile]);

  if (loading) {
    return (
      <div style={{ paddingTop: 64 }}>
        <div className="container-bs" style={{ paddingTop: 32, paddingBottom: 80 }}>
          <div className="ld-skel">
            <div style={{ minWidth: 0 }}>
              <div className="skeleton" style={{ aspectRatio: "4 / 3", width: "100%" }} />
              <div className="skeleton" style={{ height: 28, width: "70%", margin: "20px 0 12px" }} />
              <div className="skeleton" style={{ height: 120, width: "100%" }} />
            </div>
            <div className="skeleton" style={{ height: 320, width: "100%", minWidth: 0 }} />
          </div>
        </div>
        <style jsx>{`
          .ld-skel {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
            gap: 32px;
          }
          @media (max-width: 980px) {
            .ld-skel {
              grid-template-columns: minmax(0, 1fr);
            }
          }
        `}</style>
      </div>
    );
  }

  if (notFound || !listing || !contact) {
    return (
      <div style={{ paddingTop: 64 }}>
        <div className="container-bs" style={{ paddingTop: 120, paddingBottom: 120, textAlign: "center" }}>
          <span className="eyebrow">{t("listing.notFound.eyebrow", "Listing not found")}</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "12px 0 16px", color: "var(--ink)" }}>
            {t("listing.notFound.title", "This listing doesn't exist")}
          </h1>
          <p style={{ color: "var(--muted)", maxWidth: 440, margin: "0 auto 28px" }}>
            {t("listing.notFound.message", "It may have been removed or the link is incorrect.")}
          </p>
          <Link href="/search" className="btn btn-primary">
            {t("listing.notFound.cta", "Browse listings")}
          </Link>
        </div>
      </div>
    );
  }

  const crumbs = [
    { label: t("nav.home", "Home"), href: "/" },
    ...(listing.categoryPath || []).map((slug) => ({
      label: prettifySlug(slug),
      href: `/${slug}`,
    })),
    { label: listing.title },
  ];

  const condition = (listing.product as { condition?: string } | null | undefined)?.condition;
  const conditionLabel: Record<string, string> = { new: "New", used: "Used", na: "Not applicable" };

  // "PAN India" when the listing serves the whole country, else "City, State".
  const isPanIndia = !!(listing.panIndia || listing.location?.panIndia);
  const locationLabel = formatLocation({
    city: listing.location?.city,
    state: listing.location?.state,
    panIndia: isPanIndia,
  });

  return (
    <div style={{ paddingTop: 64 }}>
      <div className="container-bs" style={{ paddingTop: 24, paddingBottom: 96 }}>
        {(listing.status === "pending" || listing.status === "rejected") && (
          <div
            className="card card-flat"
            style={{
              marginBottom: 20,
              padding: "12px 16px",
              borderColor: listing.status === "rejected" ? "var(--error)" : "var(--action)",
              background: listing.status === "rejected" ? "#fef2f2" : "var(--action-tint)",
              color: listing.status === "rejected" ? "#b91c1c" : "var(--ink)",
              fontSize: 13.5,
            }}
          >
            {listing.status === "rejected" ? (
              <>
                <b>Not listed.</b> Our team reviewed this listing and it wasn&apos;t approved
                {listing.verification?.rejectionReason ? `: ${listing.verification.rejectionReason}` : "."}{" "}
                Only you (and admins) can see this page.
              </>
            ) : (
              <>
                <b>Verification in progress.</b> This listing isn&apos;t visible to buyers yet — it&apos;s
                being checked by AI first, then our team if needed. It&apos;ll go live automatically once approved.
              </>
            )}
          </div>
        )}
        <div className="ld-layout">
          {/* MAIN */}
          <div style={{ minWidth: 0 }}>
            <div className="ld-top">
              <Gallery media={listing.media} title={listing.title} />

              <div style={{ minWidth: 0 }}>
                <Breadcrumbs items={crumbs} />

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <Badge variant="neutral">{listing.type === "service" ? t("listing.badge.service", "Service") : t("listing.badge.product", "Product")}</Badge>
                  {listing.isSponsored && <Badge variant="sponsored">{t("common.sponsored", "Sponsored")}</Badge>}
                  {listing.isFeatured && !listing.isSponsored && <Badge variant="premium">{t("common.featured", "Featured")}</Badge>}
                  {listing.status === "sold" && <Badge variant="neutral">{t("listing.badge.sold", "Sold")}</Badge>}
                </div>

                <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", lineHeight: 1.3, margin: "10px 0 16px" }}>
                  {listing.title}
                </h1>

                <PriceBlock listing={listing} />

                {/* Save (shortlist) + Compare toggles */}
                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    aria-pressed={shortlist.has(listing.id)}
                    onClick={() => shortlist.toggle(listing.id)}
                    style={
                      shortlist.has(listing.id)
                        ? { color: "var(--action)", borderColor: "var(--action)" }
                        : undefined
                    }
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={shortlist.has(listing.id) ? "var(--action)" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
                    </svg>
                    {shortlist.has(listing.id)
                      ? t("listing.saved", "Saved")
                      : t("listing.save", "Save")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    aria-pressed={compare.has(listing.id)}
                    onClick={() => compare.toggle(listing.id)}
                    style={
                      compare.has(listing.id)
                        ? { color: "var(--brand)", borderColor: "var(--brand)", background: "var(--brand-tint)" }
                        : undefined
                    }
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="3" y="4" width="7" height="16" rx="1.4" />
                      <rect x="14" y="4" width="7" height="16" rx="1.4" />
                    </svg>
                    {compare.has(listing.id)
                      ? t("listing.inCompare", "Added to compare")
                      : t("listing.compare", "Compare")}
                  </button>
                </div>

                {condition && (
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {t("listing.condition", "Condition")}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                      {conditionLabel[condition] || condition}
                    </span>
                  </div>
                )}

                {locationLabel && (
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 14 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>
                      {isPanIndia && (
                        <span style={{ fontSize: 13, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", marginRight: 6 }}>
                          {t("listing.availableIn", "Available in")}
                        </span>
                      )}
                      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{locationLabel}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Full-width detail below the fold */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 36 }}>
              {listing.type === "product" && (
                <SpecTable specs={listing.product?.specifications} title={t("listing.specs", "Specifications")} />
              )}

              {listing.description && (
                <section>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
                    {t("listing.description", "Description")}
                  </h2>
                  <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                    {listing.description}
                  </p>
                </section>
              )}

              {listing.type === "service" && (listing.service?.serviceArea?.length ||
                listing.service?.credentials?.length) ? (
                <section>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
                    {t("listing.serviceDetails", "Service details")}
                  </h2>
                  {listing.service?.serviceArea && listing.service.serviceArea.length > 0 && (
                    <div style={{ marginBottom: 10, fontSize: 14, color: "var(--muted)" }}>
                      <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{t("listing.serves", "Serves:")}</strong>{" "}
                      {listing.service.serviceArea.join(", ")}
                    </div>
                  )}
                  {listing.service?.credentials && listing.service.credentials.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {listing.service.credentials.map((c, i) => (
                        <Badge key={i} variant="neutral">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {listing.keywords && listing.keywords.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {listing.keywords.map((kw) => (
                    <span key={kw} style={{ fontSize: 13, color: "var(--faint)" }}>
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* STICKY SELLER CARD */}
          <aside className="ld-aside">
            <SellerContactCard listing={listing} seller={contact} />
          </aside>
        </div>

        {/* OTHER SELLERS OFFERING THIS PRODUCT (multi-vendor) — hides itself when none */}
        <OtherSellers offers={offers} offerCount={offers.length} minPrice={minPrice} />

        {/* MORE FROM THIS SELLER */}
        {sellerListings.length > 0 && (
          <section style={{ marginTop: 64 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>
                {t("listing.moreFromSeller", "More from this seller")}
              </h2>
              {contact.slug && (
                <Link
                  href={`/seller/${contact.slug}`}
                  style={{ fontSize: 14, fontWeight: 600, color: "var(--brand)", whiteSpace: "nowrap" }}
                >
                  {t("listing.viewAllSeller", "View all")} →
                </Link>
              )}
            </div>
            <div className="ld-grid">
              {sellerListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}

        {/* SIMILAR PRODUCTS */}
        {similar.length > 0 && (
          <section style={{ marginTop: 64 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 18 }}>
              {t("listing.similar", "Similar products")}
            </h2>
            <div className="ld-grid">
              {similar.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        .ld-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 32px;
          align-items: start;
        }
        .ld-top {
          display: grid;
          grid-template-columns: minmax(0, 46%) minmax(0, 1fr);
          gap: 28px;
          align-items: start;
        }
        .ld-aside {
          position: sticky;
          top: 80px;
        }
        .ld-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
        }
        @media (max-width: 1024px) {
          .ld-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 980px) {
          .ld-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .ld-aside {
            position: static;
          }
        }
        @media (max-width: 720px) {
          .ld-top {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        @media (max-width: 560px) {
          .ld-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
