"use client";

// Self-fetching "Trending" rail: newest listings (optionally near a city).
// Horizontal scroll of ListingCard; handles its own loading/empty states.

import React, { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { Listing } from "@/lib/types";
import ListingCard from "@/components/ListingCard";

export interface TrendingRailProps {
  city?: string;
  limit?: number;
  className?: string;
}

export default function TrendingRail({ city, limit = 8, className = "" }: TrendingRailProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const query: Record<string, unknown> = { sort: "newest", limit };
    if (city) query.near = city;
    api
      .getListings(query as unknown as api.ListingQuery)
      .then((r) => alive && setListings(r.listings || []))
      .catch(() => alive && setListings([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [city, limit]);

  if (!loading && listings.length === 0) return null;

  return (
    <div
      className={["no-scrollbar", className].filter(Boolean).join(" ")}
      style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x proximity" }}
    >
      {loading
        ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ flex: "0 0 auto", width: "min(264px, 74vw)" }}>
              <div className="card card-flat" style={{ overflow: "hidden" }}>
                <div className="skeleton" style={{ aspectRatio: "4 / 3", borderRadius: 0 }} />
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <span className="skeleton" style={{ height: 14, width: "88%" }} />
                  <span className="skeleton" style={{ height: 14, width: "50%" }} />
                </div>
              </div>
            </div>
          ))
        : listings.map((l) => (
            <div
              key={l.id}
              style={{
                flex: "0 0 auto",
                width: l.type === "service" ? "min(380px, 86vw)" : "min(264px, 74vw)",
                scrollSnapAlign: "start",
              }}
            >
              <ListingCard listing={l} />
            </div>
          ))}
    </div>
  );
}
