"use client";

import { ListingFlag, RatingPill } from "@/components/TrustBadges";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Listing, SellerPublicProfile, Conversation } from "@/lib/types";
import { getListing, getSeller, getListings, getListingOffers, getConversation, isSellerUnavailable, type Offer } from "@/lib/api";
import { formatLocation } from "@/lib/indiaGeo";
import { useShortlist } from "@/lib/shortlist";
import { useAuth } from "@/lib/auth";
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
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import ChatModal from "@/components/chat/ChatModal";

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

function humanize(value?: string | null): string {
  return value ? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}

function listingsWithDistinctLeadMedia(listings: Listing[]) {
  const used = new Set<string>();
  return listings.map((item) => {
    const lead = item.media.find((media) => media.type !== "video" && !used.has(media.url));
    if (!lead) return { ...item, media: [] };
    used.add(lead.url);
    return { ...item, media: [lead, ...item.media.filter((media) => media.url !== lead.url)] };
  });
}

// Icon-chip section label — same visual language as the category page's
// "Shop by category" / "Top brands" (SubcategoryTiles.tsx / BrandRail.tsx):
// a tinted icon chip + bold heading, alternating blue/green down the page so
// each section reads as distinct instead of bare headings on white.
function SectionLabel({
  icon,
  tone = "blue",
  style,
  children,
}: {
  icon: React.ReactNode;
  tone?: "blue" | "green";
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  // One blue for every section icon (tone is kept for call sites, not for colour).
  void tone;
  const palette = { bg: "var(--counter-indigo-soft)", fg: "var(--counter-indigo)" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, ...style }}>
      <span
        aria-hidden
        style={{
          width: 30,
          height: 30,
          borderRadius: "var(--r-xs)",
          background: palette.bg,
          color: palette.fg,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.01em" }}>
        {children}
      </h2>
    </div>
  );
}

function DescriptionIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}
function StorefrontIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9l1.3-5h15.4L21 9" />
      <path d="M3 9a2 2 0 004 0 2 2 0 004 0 2 2 0 004 0 2 2 0 004 0" />
      <path d="M5 9v10h14V9" />
      <path d="M9.5 19v-5.5h5V19" />
    </svg>
  );
}
function GridGlyphIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export default function ListingDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { addToast } = useToast();
  const t = useTr();
  const shortlist = useShortlist();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [profile, setProfile] = useState<SellerPublicProfile | null>(null);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [deepChatConvo, setDeepChatConvo] = useState<Conversation | null>(null);
  const [deepChatOpen, setDeepChatOpen] = useState(false);

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
          // A suspended / rejected seller's page: a calm "unavailable" screen, no error toast.
          if (isSellerUnavailable(err)) setUnavailable(true);
          else addToast(err instanceof Error ? err.message : "Listing not found.", "error");
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
      ? `${listing.title} | Bharat Navya`
      : "Listing | Bharat Navya";
  }, [listing]);

  // Re-fetch the seller profile after a logged-out visitor completes the
  // contact-gate login/register — the backend only includes contactMobile
  // for authenticated requests, so the first fetch (done while logged out)
  // never had it.
  const refreshContact = useCallback(async () => {
    const slug = listing?.seller?.slug;
    if (!slug) return;
    try {
      const p = await getSeller(slug);
      setProfile(p);
    } catch {
      /* non-fatal */
    }
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
        badges: (s as { badges?: string[] }).badges || null,
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
  // `?chat=<conversationId>` deep link (from a "new_message" notification) —
  // opens the chat modal directly, regardless of whether this is the buyer's
  // or the seller's own listing (a seller replying to a buyer's message about
  // their own product must still be able to open it).
  useEffect(() => {
    const chatId = searchParams.get("chat");
    if (!chatId || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const convo = await getConversation(chatId);
        if (!cancelled) {
          setDeepChatConvo(convo);
          setDeepChatOpen(true);
        }
      } catch {
        /* not a participant, deleted, or auth not ready yet — silently ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, user]);

  const sellerListingCards = useMemo(() => listingsWithDistinctLeadMedia(sellerListings), [sellerListings]);
  const suggestedListingCards = useMemo(() => listingsWithDistinctLeadMedia(similar), [similar]);

  if (loading) {
    return (
      <div className="directory-design counter-public-page listing-detail-page">
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
      <div className="directory-design counter-public-page listing-detail-page">
        <div className="container-bs" style={{ paddingTop: 120, paddingBottom: 120, textAlign: "center" }}>
          <span className="eyebrow">
            {unavailable ? "Seller unavailable" : t("listing.notFound.eyebrow", "Listing not found")}
          </span>
          <h1 style={{ fontSize: "var(--fs-xl)", fontWeight: 800, margin: "12px 0 16px", color: "var(--ink)" }}>
            {unavailable ? "This seller is currently unavailable" : t("listing.notFound.title", "This listing doesn't exist")}
          </h1>
          <p style={{ color: "var(--muted)", maxWidth: 440, margin: "0 auto 28px" }}>
            {unavailable
              ? "This listing is not available right now. You can browse other sellers."
              : t("listing.notFound.message", "It may have been removed or the link is incorrect.")}
          </p>
          <Link href="/search" className="btn btn-primary">
            {t("listing.notFound.cta", "Browse listings")}
          </Link>
        </div>
      </div>
    );
  }

  // Category-targeted ads match anywhere on this listing's category path.
  const adCategory = (listing.categoryPath || []).join(",") || undefined;

  // Root crumb always points at the Directory — Consultations isn't live
  // right now, so a service listing shouldn't send buyers to a dead product.
  const crumbs = [
    { label: t("nav.directoryCrumb", "Directory"), href: "/directory" },
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

  const decisionTerms = listing.type === "product"
    ? [
        ["Availability", humanize(listing.product?.availability)],
        ["Minimum order", listing.product?.moq != null ? `${listing.product.moq} ${listing.product.unitOfMeasure || "units"}` : ""],
        ["Lead time", listing.product?.leadTime || ""],
        ["Sample", listing.product?.sampleAvailable ? "Available" : ""],
      ]
    : [
        ["Pricing", humanize(listing.service?.pricingModel)],
        ["Delivery mode", humanize(listing.service?.serviceMode)],
        ["Availability", listing.service?.availabilitySchedule || ""],
        ["Service area", listing.service?.serviceArea?.join(", ") || ""],
        ["Typical timeline", listing.service?.timeline || ""],
        ["Response commitment", listing.service?.sla || ""],
      ];
  const visibleDecisionTerms = decisionTerms.filter((term) => term[1]);
  const supportingDetails = listing.type === "product"
    ? listing.product?.certifications || []
    : [...(listing.service?.deliverables || []), ...(listing.service?.credentials || [])];

  return (
    <div className="directory-design counter-public-page listing-detail-page">
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
              fontSize: "var(--fs-sm)",
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
        <Breadcrumbs items={crumbs} className="ld-crumbs" />
        <div className="ld-layout">
          {/* MAIN */}
          <div style={{ minWidth: 0 }}>
            <div className="ld-top">
              <div className="ld-gallery-wrap"><Gallery media={listing.media} title={listing.title} /></div>

              <div className="ld-summary" style={{ minWidth: 0 }}>
                <div className="ld-topline">
                  <div className="ld-badges">
                    <ListingFlag sponsored={listing.isSponsored} featured={listing.isFeatured} />
                    {!listing.isSponsored && !listing.isFeatured && <span className="tb-flag is-type">{listing.type === "service" ? t("listing.badge.service", "Service") : t("listing.badge.product", "Product")}</span>}
                    {(() => { const own = (listing.rating ?? 0) > 0; return <RatingPill value={own ? listing.rating : profile?.seller?.rating} count={own ? listing.reviewCount : profile?.seller?.reviewCount} />; })()}
                    {listing.status === "sold" && <Badge variant="neutral">{t("listing.badge.sold", "Sold")}</Badge>}
                  </div>
                  <button
                    type="button"
                    className={`ld-save${shortlist.has(listing.id) ? " is-saved" : ""}`}
                    aria-pressed={shortlist.has(listing.id)}
                    aria-label={shortlist.has(listing.id) ? t("listing.saved", "Saved") : t("listing.save", "Save")}
                    title={shortlist.has(listing.id) ? t("listing.saved", "Saved") : t("listing.save", "Save")}
                    onClick={() => shortlist.toggle(listing.id)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={shortlist.has(listing.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
                    </svg>
                  </button>
                </div>

                <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: "var(--ink)", lineHeight: 1.12, letterSpacing: "-0.02em", margin: "12px 0 10px" }}>
                  {listing.title}
                </h1>

                {locationLabel && (
                  <div style={{ margin: "0 0 18px", display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>
                      {isPanIndia && (
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", marginRight: 6 }}>
                          {t("listing.availableIn", "Available in")}
                        </span>
                      )}
                      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{locationLabel}</span>
                    </span>
                  </div>
                )}
                <PriceBlock listing={listing} />

                {condition && (
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {t("listing.condition", "Condition")}
                    </span>
                    <span style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)" }}>
                      {conditionLabel[condition] || condition}
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
                <section className="card card-flat card-pad">
                  <SectionLabel icon={<DescriptionIcon />} tone="green">
                    {t("listing.description", "Description")}
                  </SectionLabel>
                  <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                    {listing.description}
                  </p>
                </section>
              )}

              {(visibleDecisionTerms.length > 0 || supportingDetails.length > 0) && (
                <section className="card card-flat card-pad listing-terms">
                  <SectionLabel icon={<GridGlyphIcon />} tone="blue">
                    {listing.type === "product" ? "Product terms" : t("listing.serviceDetails", "Service details")}
                  </SectionLabel>
                  {visibleDecisionTerms.length > 0 && (
                    <dl className="listing-terms-grid">
                      {visibleDecisionTerms.map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {supportingDetails.length > 0 && (
                    <div className="listing-supporting-details" aria-label={listing.type === "product" ? "Certifications" : "Deliverables and credentials"}>
                      {supportingDetails.map((detail) => <Badge key={detail} variant="neutral">{detail}</Badge>)}
                    </div>
                  )}
                </section>
              )}

            </div>
          </div>

          {/* STICKY SELLER CARD */}
          <aside className="ld-aside" id="seller-contact">
            <SellerContactCard listing={listing} seller={contact} onContactUnlocked={refreshContact} />
            <div className="bn-side-ad"><ApiAdvertisingSlot imageOnly showFallback={false} placement="category_top" category={adCategory} kind="native" context="Sponsored" summary="" action="View promotion" /></div>
          </aside>
        </div>
        <a className="ld-mobile-cta" href="#seller-contact">Contact seller</a>

        <div className="bn-bottom-ad is-980"><ApiAdvertisingSlot compact placement="category_top" category={adCategory} kind="native" context="Sponsored near listing details" summary="A related promoted service or product, kept separate from this listing’s seller evidence and terms." action="View promoted record" /></div>

        {/* OTHER SELLERS OFFERING THIS PRODUCT (multi-vendor) — hides itself when none */}
        {listing.type === "product" && <OtherSellers offers={offers} offerCount={offers.length} minPrice={minPrice} />}

        {/* MORE FROM THIS SELLER */}
        {sellerListings.length > 0 && (
          <section style={{ marginTop: 48 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
              <SectionLabel icon={<StorefrontIcon />} tone="blue" style={{ marginBottom: 0 }}>
                {listing.type === "service" ? "More services from this company" : t("listing.moreFromSeller", "More products from this company")}
              </SectionLabel>
              {contact.slug && (
                <Link
                  href={`/seller/${contact.slug}`}
                  style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--brand)", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {t("listing.viewAllSeller", "View all")} →
                </Link>
              )}
            </div>
            <div className="ld-grid">
              {sellerListingCards.map((l) => (
                <ListingCard key={l.id} listing={l} hideSeller />
              ))}
            </div>
          </section>
        )}

        {/* SIMILAR PRODUCTS */}
        {similar.length > 0 && (
          <section style={{ marginTop: 48 }}>
            <SectionLabel icon={<GridGlyphIcon />} tone="green">You may also like</SectionLabel>
            <p className="ld-section-intro">Related {listing.type === "service" ? "services" : "products"} from other companies in this category.</p>
            <div className="ld-grid">
              {suggestedListingCards.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        /* :global — Breadcrumbs renders its own <nav>, so the scope class
           styled-jsx would otherwise auto-inject never reaches it (same
           Link/child-component scoping gap noted elsewhere this session). */
        :global(.ld-crumbs) {
          margin-bottom: 16px;
        }
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
          top: 124px;
        }
        /* Same auto-fill/230px card-size pattern as the search/category/brand
           grids (DiscoveryResults.tsx's .dr-grid) — a fixed repeat(4, 1fr) here
           stretched cards noticeably bigger than everywhere else on this
           full-width (no aside-rail) layout. */
        .ld-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 20px;
        }
        .ld-section-intro {
          max-width: 62ch;
          margin: -6px 0 18px;
          color: var(--muted);
          font-size: var(--fs-sm);
          line-height: 1.6;
        }
        .listing-terms-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          background: var(--border);
        }
        .listing-terms-grid > div {
          min-width: 0;
          padding: 16px;
          background: var(--surface, #fff);
        }
        .listing-terms-grid dt {
          color: var(--faint);
          font-size: var(--fs-xs);
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .listing-terms-grid dd {
          margin-top: 5px;
          color: var(--ink);
          font-size: var(--fs-sm);
          font-weight: 650;
          line-height: 1.45;
        }
        .listing-supporting-details {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
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
          .listing-terms-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>

      {deepChatConvo && (
        <ChatModal
          open={deepChatOpen}
          onClose={() => setDeepChatOpen(false)}
          conversationId={deepChatConvo.id}
          meId={user?.id || ""}
          otherUserName={deepChatConvo.otherUserName}
          listingTitle={deepChatConvo.listingTitle}
        />
      )}
    </div>
  );
}
