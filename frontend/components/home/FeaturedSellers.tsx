"use client";

// Featured sellers row. Backed by the dedicated GET /api/sellers/featured
// endpoint (top approved sellers: featured first, then by rating/reviews). We map
// each returned seller summary onto SellerCard's flexible shape. The whole
// section is gated by homepage.showFeaturedSellers and hides itself (via onEmpty)
// when the endpoint returns nothing.

import React, { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import { useConfig } from "@/lib/config";
import SellerCard, { SellerCardSeller } from "@/components/SellerCard";

export interface FeaturedSellersProps {
  limit?: number;
  className?: string;
  onEmpty?: () => void;
}

// The /sellers/featured summary → SellerCard shape. Defensive about field names
// so it degrades gracefully if the endpoint's payload evolves.
function mapSeller(s: any): SellerCardSeller | null {
  if (!s) return null;
  const slug = s.slug || s.sellerSlug;
  if (!slug) return null;
  return {
    id: s.id || s.userId,
    slug,
    name: s.name || s.companyName || "Seller",
    city: s.city || s.location?.city,
    state: s.state || s.location?.state,
    logo: s.logo ?? null,
    isVerified: s.isVerified,
    trustSealVerified: s.trustSealVerified,
    gstNumber: s.gstNumber,
    yearEstablished: s.yearEstablished,
    rating: s.rating,
    reviewCount: s.reviewCount,
    responseRate: s.responseRate,
    listingCount: s.listingCount,
  };
}

export default function FeaturedSellers({ limit = 4, className = "", onEmpty }: FeaturedSellersProps) {
  const { homepage } = useConfig();
  const enabled = homepage.showFeaturedSellers !== false;

  const [sellers, setSellers] = useState<SellerCardSeller[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep the latest onEmpty without making it an effect dependency (avoids
  // refetching whenever the parent re-renders with a fresh inline callback).
  const onEmptyRef = useRef(onEmpty);
  onEmptyRef.current = onEmpty;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    api
      .getFeaturedSellers()
      .then((rows) => {
        if (!alive) return;
        const out = (rows || [])
          .map(mapSeller)
          .filter((s): s is SellerCardSeller => !!s)
          .slice(0, limit);
        setSellers(out);
        if (out.length === 0) onEmptyRef.current?.();
      })
      .catch(() => {
        if (!alive) return;
        setSellers([]);
        onEmptyRef.current?.();
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [limit, enabled]);

  if (!enabled) return null;
  if (!loading && sellers.length === 0) return null;

  return (
    <div className={["grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5", className].join(" ")}>
      {loading
        ? Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="card card-flat card-pad">
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span className="skeleton" style={{ width: 52, height: 52, borderRadius: "50%" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className="skeleton" style={{ height: 14, width: "70%" }} />
                  <span className="skeleton" style={{ height: 12, width: "45%" }} />
                </div>
              </div>
              <span className="skeleton" style={{ height: 30, width: "100%", marginTop: 18 }} />
            </div>
          ))
        : sellers.map((s) => <SellerCard key={s.slug} seller={s} />)}
    </div>
  );
}
