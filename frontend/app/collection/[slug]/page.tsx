"use client";

// Collection landing — a curated "Concept" page. Hero band (cover + title +
// subtitle + item count) over the collection's resolved listings, in the same
// responsive ListingCard grid the category/brand pages use. Breadcrumb:
// Home / Collections / <title>. Friendly empty + unknown states.

import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import React, { useEffect, useState } from "react";
import { getCollection } from "@/lib/api";
import type { CollectionDetail } from "@/lib/api";
import Breadcrumbs, { Crumb } from "@/components/Breadcrumbs";
import ListingCard from "@/components/ListingCard";
import EmptyState from "@/components/discovery/EmptyState";
import { usePageTitle } from "@/lib/usePageTitle";

const GRID: React.CSSProperties = {
  display: "grid",
  gap: 20,
  gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
};

function HeroSkeleton() {
  return (
    <section
      style={{
        background: "linear-gradient(180deg, var(--brand-tint), var(--bg-subtle))",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="container-bs" style={{ paddingTop: 28, paddingBottom: 28 }}>
        <span className="skeleton" style={{ display: "block", height: 12, width: 240, marginBottom: 18 }} />
        <span className="skeleton" style={{ display: "block", height: 30, width: 320, marginBottom: 12 }} />
        <span className="skeleton" style={{ display: "block", height: 14, width: "50%", maxWidth: 420 }} />
      </div>
    </section>
  );
}

export default function CollectionPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const [data, setData] = useState<CollectionDetail | null>(null);
  usePageTitle(data?.title);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setData(null);
    getCollection(slug)
      .then((d) => alive && setData(d))
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  // ---- Unknown collection ----
  if (!loading && (notFound || !data)) {
    return (
      <div className="counter-public-page counter-support-page counter-catalog-detail">
        <section style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
          <div className="container-bs" style={{ paddingTop: 28, paddingBottom: 28 }}>
            <Breadcrumbs
              items={[
                { label: "Directory", href: "/directory" },
                { label: "Collections", href: "/collections" },
                { label: "Not found" },
              ]}
            />
          </div>
        </section>
        <div className="container-bs section-pad">
          <EmptyState
            title="We couldn't find that collection"
            message="This collection may have been unpublished or the link may be out of date. Browse all collections to keep exploring."
            actionLabel="View all collections"
            actionHref="/collections"
          />
        </div>
      </div>
    );
  }

  // ---- Loading ----
  if (loading || !data) {
    return (
      <div className="counter-public-page counter-support-page counter-catalog-detail">
        <HeroSkeleton />
        <div className="container-bs section-pad-sm">
          <div style={GRID}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card card-flat" style={{ overflow: "hidden" }}>
                <div className="skeleton" style={{ aspectRatio: "4 / 3", borderRadius: 0 }} />
                <div style={{ padding: 16 }}>
                  <span className="skeleton" style={{ display: "block", height: 14, width: "90%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const listings = data.listings || [];
  const count = data.itemCount ?? listings.length;
  const cover = data.coverImage;

  const crumbs: Crumb[] = [
    { label: "Directory", href: "/directory" },
    { label: "Collections", href: "/collections" },
    { label: data.title },
  ];

  return (
    <div className="counter-public-page counter-support-page counter-catalog-detail">
      {/* Hero band */}
      <section
        className="counter-catalog-hero"
        style={{
          position: "relative",
          background: cover
            ? undefined
            : "linear-gradient(180deg, var(--brand-tint), var(--bg-subtle))",
          backgroundImage: cover ? `url(${cover})` : undefined,
          backgroundSize: cover ? "cover" : undefined,
          backgroundPosition: cover ? "center" : undefined,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Scrim so text stays readable over an image cover */}
        {cover && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(15,23,42,.35), rgba(15,23,42,.72))",
            }}
          />
        )}
        <div
          className="container-bs"
          style={{ position: "relative", paddingTop: 36, paddingBottom: 36 }}
        >
          <Breadcrumbs items={crumbs} />
          <h1
            style={{
              fontSize: "var(--fs-2xl)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: cover ? "#fff" : "var(--ink)",
              marginTop: 16,
            }}
          >
            {data.title}
          </h1>
          {data.subtitle && (
            <p
              style={{
                fontSize: "var(--fs-sm)",
                color: cover ? "rgba(255,255,255,.9)" : "var(--muted)",
                marginTop: 8,
                maxWidth: 720,
              }}
            >
              {data.subtitle}
            </p>
          )}
          <p
            style={{
              fontSize: "var(--fs-sm)",
              fontWeight: 600,
              color: cover ? "rgba(255,255,255,.92)" : "var(--faint)",
              marginTop: 12,
            }}
          >
            {count} {count === 1 ? "listing" : "listings"}
          </p>
        </div>
      </section>

      {/* Listings */}
      <div className="container-bs section-pad-sm">
        {listings.length === 0 ? (
          <EmptyState
            title="Nothing in this collection yet"
            message="The items in this collection aren't available right now. Browse all collections or explore categories to keep discovering."
            actionLabel="View all collections"
            actionHref="/collections"
          />
        ) : (
          <div style={GRID}>
            {listings.map((l) => (
              <div
                key={l.id}
                style={l.type === "service" ? { gridColumn: "1 / -1", minWidth: 0 } : { minWidth: 0 }}
              >
                <ListingCard listing={l} />
              </div>
            ))}
          </div>
        )}
      </div>
      <ApiAdvertisingSlot compact showFallback={false} placement="category_top" kind="native" context="Sponsored on this collection" summary="A clearly labelled placement, separate from the content on this page." action="View promotion" />
    </div>
  );
}
