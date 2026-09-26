"use client";

// Consultations — one expert as a clickable card in the directory grid.
// WHY: the card must sell TRUST at a glance (verified credential, rating, response)
// and the packaged pricing that differentiates hiring an expert from buying a
// product — so it leads with identity + credential, then rating/experience, then a
// "From ₹…" price and the ways you can consult. The whole card is one <Link> to the
// profile; every flex child sets min-width:0 + truncation so nothing overflows 390px.

import React from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Rating from "@/components/Rating";
import type { ConsultationExpert } from "@/lib/types";
import CredentialBadge from "./CredentialBadge";
import {
  MapPinIcon,
  ModeIcon,
  modeShortLabel,
  formatPrice,
  ArrowRightIcon,
} from "./icons";

export default function ExpertCard({ expert }: { expert: ConsultationExpert }) {
  const extraSpecs = Math.max(0, expert.specializations.length - 3);

  return (
    <Link
      href={`/consultations/${expert.slug}`}
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 18,
        minWidth: 0,
      }}
    >
      {/* ---- Header: avatar + name + profession + credential ---- */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
        <Avatar src={expert.logo} name={expert.name} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              className="line-clamp-1"
              style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)", minWidth: 0 }}
            >
              {expert.name}
            </span>
          </div>
          <span
            className="line-clamp-1"
            style={{ display: "block", fontSize: 13, color: "var(--muted)", marginTop: 2 }}
          >
            {expert.profession}
          </span>
          {expert.credentialVerified && (
            <span style={{ display: "inline-flex", marginTop: 7 }}>
              <CredentialBadge />
            </span>
          )}
        </div>
      </div>

      {/* ---- Rating · city · experience ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "6px 12px",
          fontSize: 13,
          color: "var(--muted)",
        }}
      >
        {expert.reviewCount > 0 ? (
          <Rating value={expert.rating} count={expert.reviewCount} size={14} />
        ) : (
          <span style={{ color: "var(--faint)" }}>New on Bharat Navya</span>
        )}
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }}
        >
          <span style={{ color: "var(--faint)", display: "inline-flex" }}>
            <MapPinIcon size={14} />
          </span>
          <span className="line-clamp-1">{expert.city}</span>
          <span style={{ color: "var(--faint)" }}>· {expert.experienceYears} yrs</span>
        </span>
      </div>

      {/* ---- Headline ---- */}
      <p
        className="line-clamp-2"
        style={{ fontSize: 13.5, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}
      >
        {expert.headline}
      </p>

      {/* ---- Specializations ---- */}
      {expert.specializations.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0 }}>
          {expert.specializations.slice(0, 3).map((s) => (
            <span
              key={s}
              className="badge badge-neutral"
              style={{ maxWidth: "100%", overflow: "hidden" }}
            >
              <span className="line-clamp-1">{s}</span>
            </span>
          ))}
          {extraSpecs > 0 && (
            <span className="badge badge-neutral">+{extraSpecs}</span>
          )}
        </div>
      )}

      {expert.freeIntroCall && (
        <span style={{ display: "inline-flex" }}>
          <span className="badge badge-new">Free intro call</span>
        </span>
      )}

      <hr className="divider" style={{ margin: "2px 0 0" }} />

      {/* ---- Footer: price + modes + view affordance ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {expert.priceFrom != null ? (
            <>
              <span style={{ fontSize: 12, color: "var(--faint)" }}>From </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                {formatPrice(expert.priceFrom)}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
              Custom quote
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "var(--faint)",
            flexShrink: 0,
          }}
        >
          {expert.consultationModes.map((m) => (
            <span
              key={m}
              title={modeShortLabel(m)}
              aria-label={modeShortLabel(m)}
              style={{ display: "inline-flex" }}
            >
              <ModeIcon mode={m} size={16} />
            </span>
          ))}
        </div>
      </div>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13.5,
          fontWeight: 600,
          color: "var(--brand)",
        }}
      >
        View profile <ArrowRightIcon size={15} />
      </span>
    </Link>
  );
}
