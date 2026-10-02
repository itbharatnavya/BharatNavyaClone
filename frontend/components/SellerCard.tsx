"use client";

import React from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { RatingPill } from "./ListingCard";
import TrustBadges from "./TrustBadges";
import Button from "./Button";

// A flexible shape the page-builders can map any seller source onto.
export interface SellerCardSeller {
  id?: string;
  slug: string;
  name: string; // company or person name
  city?: string;
  state?: string;
  category?: string;
  logo?: string | null;
  isVerified?: boolean;
  trustSealVerified?: boolean;
  gstNumber?: string | null;
  yearEstablished?: number | null;
  rating?: number;
  reviewCount?: number;
  responseRate?: number;
  listingCount?: number;
}

export interface SellerCardProps {
  seller: SellerCardSeller;
  href?: string; // defaults to /seller/[slug]
  className?: string;
}

export default function SellerCard({ seller, href, className = "" }: SellerCardProps) {
  const profileHref = href || `/seller/${seller.slug}`;
  const years = seller.yearEstablished
    ? new Date().getFullYear() - seller.yearEstablished
    : null;

  return (
    <article className={["card card-flat", className].filter(Boolean).join(" ")} style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar src={seller.logo} name={seller.name} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={profileHref}>
            <h3 className="line-clamp-1" style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}>
              {seller.name}
            </h3>
          </Link>
          <div className="line-clamp-1" style={{ marginTop: 2, fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
            {[seller.category, seller.city].filter(Boolean).join(" · ")}
          </div>
          {typeof seller.rating === "number" && seller.rating > 0 && (
            <div style={{ marginTop: 6 }}>
              <RatingPill value={seller.rating} count={seller.reviewCount} />
            </div>
          )}
        </div>
      </div>

      {(seller.isVerified || seller.trustSealVerified || seller.gstNumber || years || seller.responseRate) && (
        <div style={{ marginTop: 10 }}>
          <TrustBadges
            verified={seller.isVerified}
            trustSeal={seller.trustSealVerified}
            gst={!!seller.gstNumber}
            years={years}
            responseRate={seller.responseRate}
            size="sm"
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 12,
        }}
      >
        {typeof seller.listingCount === "number" && (
          <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
            {seller.listingCount} {seller.listingCount === 1 ? "listing" : "listings"}
          </span>
        )}
        <Button size="sm" variant="secondary" href={profileHref} className="ml-auto">
          View Profile
        </Button>
      </div>
    </article>
  );
}
