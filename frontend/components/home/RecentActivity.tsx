"use client";

// RecentActivity — "Recent Activity": a real feed of
// approved reviews joined with the reviewed seller's business info
// (GET /api/reviews/recent, backend/routes/reviews.js). Unlike
// TrendingSearches/PopularSearches this is NOT padded with fallback content
// — it only ever shows real reviews and self-hides when there are none, same
// convention as FeaturedSellers' onEmpty. WhatsApp link built via the shared
// lib/whatsapp.ts waLink() helper (not hand-rolled), Rating/Avatar reused
// from their existing shared components.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentActivity } from "@/lib/api";
import type { RecentActivityItem } from "@/lib/types";
import { waLink } from "@/lib/whatsapp";
import Avatar from "@/components/Avatar";
import Rating from "@/components/Rating";

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.4-1.36a9.9 9.9 0 004.64 1.18h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.02c-.24.69-1.4 1.32-1.94 1.4-.5.08-1.12.11-1.81-.11a16.7 16.7 0 01-1.66-.62c-2.93-1.26-4.84-4.2-4.99-4.4-.15-.19-1.2-1.59-1.2-3.03 0-1.44.75-2.15 1.02-2.44.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2.02.9 2.16.07.15.12.32.02.51-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57.15.28.68 1.13 1.47 1.83 1.01.9 1.86 1.19 2.14 1.32.28.14.45.11.61-.07.17-.18.71-.83.9-1.11.19-.28.37-.23.63-.14.26.1 1.66.79 1.95.93.28.14.47.21.54.33.07.12.07.68-.17 1.36z" />
    </svg>
  );
}

export default function RecentActivity({ limit = 6, className = "" }: { limit?: number; className?: string }) {
  const [items, setItems] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getRecentActivity({ limit })
      .then((rows) => alive && setItems(rows || []))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [limit]);

  if (!loading && items.length === 0) return null;

  return (
    <div className={["grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5", className].join(" ")}>
      {loading
        ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card card-flat" style={{ overflow: "hidden" }}>
              <span className="skeleton" style={{ display: "block", aspectRatio: "16 / 9" }} />
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="skeleton" style={{ height: 14, width: "60%" }} />
                <span className="skeleton" style={{ height: 12, width: "90%" }} />
              </div>
            </div>
          ))
        : items.map((it) => {
            const wa = waLink({ phone: it.whatsappNumber, text: `Hi ${it.sellerName}, I found you on Bharat Navya.` });
            return (
              <div key={it.reviewId} className="card card-flat" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px 0" }}>
                  <Link
                    href={it.sellerSlug ? `/seller/${it.sellerSlug}` : "#"}
                    className="line-clamp-1 hover:text-brand"
                    style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}
                  >
                    {it.sellerName}
                  </Link>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm"
                      style={{ flexShrink: 0, background: "#25D366", color: "#ffffff", gap: 5 }}
                    >
                      <WhatsAppIcon />
                      WhatsApp
                    </a>
                  )}
                </div>
                {it.sellerCity && (
                  <span style={{ padding: "2px 16px 0", fontSize: 12.5, color: "var(--muted)" }}>{it.sellerCity}</span>
                )}

                {it.image && (
                  <div style={{ aspectRatio: "16 / 9", marginTop: 12, background: "var(--bg-subtle)" }}>
                    <img src={it.image} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar src={it.buyerAvatarUrl} name={it.buyerName} size={32} />
                    <span style={{ minWidth: 0 }}>
                      <span className="line-clamp-1" style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                        {it.buyerName}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--faint)" }}>Wrote a review</span>
                    </span>
                  </div>
                  <Rating value={it.rating} showValue={false} size={14} />
                  {it.reviewText && (
                    <p className="line-clamp-2" style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55 }}>
                      {it.reviewText}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
    </div>
  );
}
