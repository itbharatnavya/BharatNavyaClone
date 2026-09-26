"use client";

// Consultations — the dedicated EXPERT PROFILE page (the product centrepiece).
// WHY it must feel different from a product page: you're deciding whether to HIRE a
// person/firm, so the page leads with identity + verified credentials + trust
// signals, then the long-form "About", then the productised SERVICE PACKAGES (the
// real differentiator — fixed scope, fixed price, deliverables), then credentials,
// case studies and reviews. A right-rail sticky "Book" card (desktop) plus a
// header CTA (always visible on mobile) open the booking modal — with a package
// preselected when the user books a specific package. Client-rendered with a
// skeleton while loading and a graceful "not found" fallback; NO emojis, inline SVG
// only; responsive with zero horizontal overflow.

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import Avatar from "@/components/Avatar";
import Rating from "@/components/Rating";
import PackageCard from "@/components/consultations/PackageCard";
import BookConsultation, {
  type BookConsultationPackage,
} from "@/components/consultations/BookConsultation";
import CredentialBadge from "@/components/consultations/CredentialBadge";
import { getExpert } from "@/lib/api";
import type { ConsultationExpertDetail, ConsultationPackage } from "@/lib/types";
import {
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  GlobeIcon,
  ShieldCheckIcon,
  AwardIcon,
  BriefcaseIcon,
  CheckIcon,
  formatPrice,
} from "@/components/consultations/icons";

// One "fact" line in the header / trust panel (icon + label + value).
function Fact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13.5,
        color: "var(--muted)",
        minWidth: 0,
      }}
    >
      <span style={{ color: "var(--faint)", flexShrink: 0, display: "inline-flex" }}>{icon}</span>
      <span className="line-clamp-1" style={{ minWidth: 0 }}>{children}</span>
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 20,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        color: "var(--ink)",
        margin: "0 0 16px",
      }}
    >
      {children}
    </h2>
  );
}

export default function ExpertProfilePage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [expert, setExpert] = useState<ConsultationExpertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Booking modal state. `bookingPackage` is the preselected package (null = general
  // "Book a consultation").
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPackage, setBookingPackage] = useState<BookConsultationPackage | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    getExpert(slug)
      .then((e) => alive && setExpert(e))
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  const openGeneralBooking = useCallback(() => {
    setBookingPackage(null);
    setBookingOpen(true);
  }, []);

  const openPackageBooking = useCallback((pkg: ConsultationPackage) => {
    setBookingPackage({ id: pkg.id, title: pkg.title, price: pkg.price, unit: pkg.unit });
    setBookingOpen(true);
  }, []);

  // ---- Loading skeleton ----
  // We render the real page SHELL (breadcrumbs + section titles) with skeleton
  // content, not a bare blur. This gives a structured loading state AND means the
  // section scaffolding is present in the server-rendered HTML (this page fetches
  // client-side, so the data itself only arrives after hydration).
  if (loading) {
    return (
      <div>
        <div className="container-bs" style={{ paddingTop: 20 }}>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Consultations", href: "/consultations" },
              { label: "Loading…" },
            ]}
          />
        </div>
        <div className="container-bs section-pad-sm">
          <span className="skeleton" style={{ display: "block", height: 160, borderRadius: 14 }} />
          <section style={{ marginTop: 32 }}>
            <SectionTitle>About</SectionTitle>
            <span className="skeleton" style={{ display: "block", height: 72, borderRadius: 10 }} />
          </section>
          <section style={{ marginTop: 32 }}>
            <SectionTitle>Service packages</SectionTitle>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="skeleton" style={{ height: 260, borderRadius: 12 }} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ---- Not found ----
  if (notFound || !expert) {
    return (
      <div className="container-bs section-pad">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Consultations", href: "/consultations" },
            { label: "Not found" },
          ]}
        />
        <div className="card card-flat" style={{ padding: 40, textAlign: "center", maxWidth: 460, margin: "40px auto 0" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Expert not found</p>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.55 }}>
            We couldn&apos;t find this expert. They may have moved or the link may be
            incorrect.
          </p>
          <Link href="/consultations" className="btn btn-primary btn-sm" style={{ marginTop: 20 }}>
            Browse all experts
          </Link>
        </div>
      </div>
    );
  }

  const hasReviews = expert.reviews && expert.reviews.length > 0;

  return (
    <div>
      <div className="container-bs" style={{ paddingTop: 20 }}>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Consultations", href: "/consultations" },
            { label: expert.name },
          ]}
        />
      </div>

      <div className="container-bs section-pad-sm">
        {/* ================= PROFILE HEADER ================= */}
        <div className="card" style={{ padding: "clamp(18px, 3vw, 28px)" }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
            <Avatar src={expert.logo} name={expert.name} size={76} />
            <div style={{ flex: "1 1 300px", minWidth: 0 }}>
              <h1
                style={{
                  fontSize: "clamp(24px, 3.6vw, 32px)",
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  color: "var(--ink)",
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                {expert.name}
              </h1>

              {/* Profession + registration body + credential */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 15, color: "var(--muted)", fontWeight: 600 }}>
                  {expert.profession}
                </span>
                {expert.registrationBody && (
                  <span className="badge badge-neutral">{expert.registrationBody}</span>
                )}
                {expert.credentialVerified && (
                  <CredentialBadge registrationBody={expert.registrationBody} />
                )}
              </div>

              {/* Meta facts */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14 }}>
                {expert.reviewCount > 0 && (
                  <Rating value={expert.rating} count={expert.reviewCount} size={15} />
                )}
                <Fact icon={<MapPinIcon size={15} />}>
                  {expert.city}{expert.state ? `, ${expert.state}` : ""}
                </Fact>
                <Fact icon={<BriefcaseIcon size={15} />}>{expert.experienceYears} yrs experience</Fact>
                <Fact icon={<ClockIcon size={15} />}>{expert.responseTime}</Fact>
                {expert.clientsServed > 0 && (
                  <Fact icon={<UsersIcon size={15} />}>{expert.clientsServed} clients served</Fact>
                )}
              </div>

              {/* Languages */}
              {expert.languages.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 14 }}>
                  <span style={{ color: "var(--faint)", display: "inline-flex" }}>
                    <GlobeIcon size={15} />
                  </span>
                  {expert.languages.map((l) => (
                    <span key={l} className="badge badge-neutral">{l}</span>
                  ))}
                </div>
              )}

              {/* CTA (visible on mobile where the sticky rail wraps below) */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 18 }}>
                <button type="button" className="btn btn-primary btn-lg" onClick={openGeneralBooking}>
                  Book a consultation
                </button>
                {expert.freeIntroCall && (
                  <span className="badge badge-new">First intro call is free</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= BODY: content + sticky rail ================= */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start", marginTop: 24 }}>
          {/* -------- Main column -------- */}
          <div style={{ flex: "1 1 460px", minWidth: 0, display: "flex", flexDirection: "column", gap: 32 }}>
            {/* ABOUT */}
            {expert.about && (
              <section>
                <SectionTitle>About</SectionTitle>
                <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
                  {expert.about}
                </p>
              </section>
            )}

            {/* SPECIALIZATIONS */}
            {expert.specializations.length > 0 && (
              <section>
                <SectionTitle>Specializations</SectionTitle>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {expert.specializations.map((s) => (
                    <span key={s} className="chip" style={{ cursor: "default" }}>{s}</span>
                  ))}
                </div>
              </section>
            )}

            {/* SERVICE PACKAGES — the key differentiator */}
            {expert.packages.length > 0 && (
              <section>
                <SectionTitle>Service packages</SectionTitle>
                <div
                  style={{
                    display: "grid",
                    gap: 16,
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  }}
                >
                  {expert.packages.map((pkg) => (
                    <PackageCard key={pkg.id} pkg={pkg} onBook={openPackageBooking} />
                  ))}
                </div>
              </section>
            )}

            {/* CREDENTIALS & TRUST */}
            <section>
              <SectionTitle>Credentials &amp; trust</SectionTitle>
              <div className="card card-flat" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                {expert.credentialVerified && expert.registrationBody && (
                  <TrustRow icon={<ShieldCheckIcon size={16} />} label={`Verified ${expert.registrationBody}`}
                    value={expert.registrationNo || "Credential verified"} />
                )}
                {!expert.credentialVerified && expert.registrationBody && (
                  <TrustRow icon={<AwardIcon size={16} />} label={expert.registrationBody}
                    value={expert.registrationNo || "Registered professional"} />
                )}
                {expert.isVerified && (
                  <TrustRow icon={<ShieldCheckIcon size={16} />} label="Identity verified"
                    value="KYC completed on Bharat Navya" />
                )}
                {expert.gstNumber && (
                  <TrustRow icon={<CheckIcon size={16} />} label="GST" value={expert.gstNumber} />
                )}
                {expert.yearEstablished && (
                  <TrustRow icon={<CheckIcon size={16} />} label="Established" value={String(expert.yearEstablished)} />
                )}
                <TrustRow icon={<CheckIcon size={16} />} label="Response rate" value={`${expert.responseRate}%`} />
              </div>
            </section>

            {/* CASE STUDIES */}
            {expert.caseStudies && expert.caseStudies.length > 0 && (
              <section>
                <SectionTitle>Case studies</SectionTitle>
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  }}
                >
                  {expert.caseStudies.map((cs, i) => (
                    <div key={`${cs.title}-${i}`} className="card card-flat" style={{ padding: 18 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0, lineHeight: 1.4 }}>
                        {cs.title}
                      </h3>
                      <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.55 }}>
                        {cs.result}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* REVIEWS */}
            <section>
              <SectionTitle>Reviews</SectionTitle>
              {hasReviews ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {expert.reviews.map((r, i) => {
                    const author = r.author || r.name || "Client";
                    const body = r.reviewText || r.text || r.comment || "";
                    return (
                      <div key={r.id || `${author}-${i}`} className="card card-flat" style={{ padding: 18 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{author}</span>
                          {typeof r.rating === "number" && (
                            <Rating value={r.rating} size={14} showValue={false} />
                          )}
                        </div>
                        {r.title && (
                          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "8px 0 0" }}>{r.title}</p>
                        )}
                        {body && (
                          <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.55 }}>{body}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card card-flat" style={{ padding: 20 }}>
                  <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
                    No reviews yet — be the first to work with {expert.name}.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* -------- Sticky booking rail (desktop bonus; wraps below on mobile) -------- */}
          <aside style={{ flex: "1 1 280px", minWidth: 0, maxWidth: 340 }}>
            <div className="card" style={{ padding: 20, position: "sticky", top: 90 }}>
              <div style={{ fontSize: 13, color: "var(--faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Book {expert.name.split(",")[0]}
              </div>
              <div style={{ marginTop: 10 }}>
                {expert.priceFrom != null ? (
                  <>
                    <span style={{ fontSize: 13, color: "var(--faint)" }}>Packages from </span>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                      {formatPrice(expert.priceFrom)}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>Custom quote</div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block"
                style={{ marginTop: 16 }}
                onClick={openGeneralBooking}
              >
                Book a consultation
              </button>

              {expert.freeIntroCall && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13, color: "var(--success)" }}>
                  <CheckIcon size={16} />
                  First intro call is free
                </div>
              )}

              <hr className="divider" style={{ margin: "16px 0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Fact icon={<ClockIcon size={15} />}>{expert.responseTime}</Fact>
                {expert.credentialVerified && (
                  <Fact icon={<ShieldCheckIcon size={15} />}>
                    Verified {expert.registrationBody || "professional"}
                  </Fact>
                )}
                <Fact icon={<BriefcaseIcon size={15} />}>{expert.packageCount} service packages</Fact>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Booking modal */}
      <BookConsultation
        expert={{ slug: expert.slug, name: expert.name, consultationModes: expert.consultationModes }}
        package={bookingPackage}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </div>
  );
}

// A single row in the Credentials & trust panel.
function TrustRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
      <span style={{ color: "var(--brand)", flexShrink: 0, marginTop: 1, display: "inline-flex" }}>{icon}</span>
      <div style={{ minWidth: 0, display: "flex", flexWrap: "wrap", gap: "2px 8px", alignItems: "baseline" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{label}</span>
        <span className="line-clamp-1" style={{ fontSize: 13.5, color: "var(--muted)", minWidth: 0 }}>{value}</span>
      </div>
    </div>
  );
}
