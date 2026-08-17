"use client";

// SHORTLIST — the buyer's saved products. Server-persisted for a logged-in user,
// localStorage for a guest (see lib/shortlist.tsx). The grid is derived from the
// provider's `ids`, so unsaving a card here removes it immediately.

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useShortlist } from "@/lib/shortlist";
import { useAuth } from "@/lib/auth";
import { getListing } from "@/lib/api";
import type { Listing } from "@/lib/types";
import Breadcrumbs from "@/components/Breadcrumbs";
import ListingCard from "@/components/ListingCard";

type Resolved = Record<string, Listing | "error">;

export default function ShortlistPage() {
  const { ids, loading } = useShortlist();
  const { user } = useAuth();
  const [items, setItems] = useState<Resolved>({});

  // Resolve every saved id (cached; failures marked so removed listings drop out).
  useEffect(() => {
    let alive = true;
    const missing = ids.filter((id) => items[id] === undefined);
    if (missing.length === 0) return;
    Promise.all(
      missing.map((id) =>
        getListing(id)
          .then((l) => [id, l] as const)
          .catch(() => [id, "error" as const] as const)
      )
    ).then((pairs) => {
      if (!alive) return;
      setItems((prev) => {
        const next = { ...prev };
        for (const [id, v] of pairs) next[id] = v;
        return next;
      });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const listings = useMemo(
    () =>
      ids
        .map((id) => items[id])
        .filter((v): v is Listing => !!v && v !== "error"),
    [ids, items]
  );

  const resolving = ids.length > 0 && ids.some((id) => items[id] === undefined);
  const showSkeleton = loading || resolving;

  const crumbs = [{ label: "Directory", href: "/directory" }, { label: "Shortlist" }];

  return (
    <div className="container-bs" style={{ paddingTop: 24, paddingBottom: 96 }}>
      <Breadcrumbs items={crumbs} />
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", margin: "12px 0 6px" }}>
        Your shortlist
      </h1>
      <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
        {user
          ? "Products you've saved — synced to your account."
          : "Products you've saved on this device. Sign in to keep them across devices."}
      </p>

      {showSkeleton ? (
        <div className="sl-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card card-flat" style={{ overflow: "hidden" }}>
              <div className="skeleton" style={{ aspectRatio: "4 / 3", borderRadius: 0 }} />
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <span className="skeleton" style={{ height: 14, width: "90%" }} />
                <span className="skeleton" style={{ height: 14, width: "55%" }} />
                <span className="skeleton" style={{ height: 30, width: "100%", marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div
          className="card card-flat"
          style={{ padding: "56px 24px", textAlign: "center", maxWidth: 520, margin: "0 auto" }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: "var(--action-tint)",
              color: "var(--action)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
            No saved products yet
          </h2>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>
            Tap the heart on any product to save it here for later.
          </p>
          <Link href="/categories" className="btn btn-primary">
            Browse categories
          </Link>
        </div>
      ) : (
        <div className="sl-grid">
          {listings.map((l) => (
            <div key={l.id} style={{ minWidth: 0 }}>
              <ListingCard listing={l} />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .sl-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
        @media (max-width: 760px) {
          .sl-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }
        }
        @media (max-width: 480px) {
          .sl-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
