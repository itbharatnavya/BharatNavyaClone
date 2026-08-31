"use client";

// Collections directory — the "Concepts" destination. A responsive grid of
// admin-curated collections (each a themed group of listings), linking to
// /collection/<slug>. Breadcrumb: Home / Collections. Skeletons + empty state.
// The organizing/merchandising layer — kept off the homepage on purpose.

import React, { useEffect, useState } from "react";
import { getCollections } from "@/lib/api";
import type { Collection } from "@/lib/api";
import Breadcrumbs, { Crumb } from "@/components/Breadcrumbs";
import CollectionCard from "@/components/collection/CollectionCard";
import EmptyState from "@/components/discovery/EmptyState";

const GRID: React.CSSProperties = {
  display: "grid",
  gap: 20,
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCollections()
      .then((rows) => alive && setCollections(Array.isArray(rows) ? rows : []))
      .catch(() => alive && setCollections([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const crumbs: Crumb[] = [{ label: "Directory", href: "/directory" }, { label: "Collections" }];

  return (
    <div>
      {/* Header band */}
      <section style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
        <div className="container-bs" style={{ paddingTop: 28, paddingBottom: 28 }}>
          <Breadcrumbs items={crumbs} />
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              marginTop: 14,
            }}
          >
            Collections
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 8, maxWidth: 720 }}>
            Handpicked themes across the marketplace — seasonal gear, top-rated makers, made-in-India
            picks and more. Each collection gathers listings worth exploring together.
            {!loading && collections.length > 0 && (
              <>
                {" "}
                <span style={{ color: "var(--faint)" }}>
                  {collections.length} {collections.length === 1 ? "collection" : "collections"}
                </span>
              </>
            )}
          </p>
        </div>
      </section>

      {/* Directory grid */}
      <div className="container-bs section-pad-sm">
        {loading ? (
          <div style={GRID}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card card-flat" style={{ overflow: "hidden" }}>
                <div className="skeleton" style={{ aspectRatio: "16 / 10", borderRadius: 0 }} />
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <span className="skeleton" style={{ height: 16, width: "70%" }} />
                  <span className="skeleton" style={{ height: 12, width: "90%" }} />
                  <span className="skeleton" style={{ height: 20, width: 80, marginTop: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <EmptyState
            title="No collections yet"
            message="Curated collections will appear here soon. In the meantime, browse categories or search the whole marketplace."
            actionLabel="Browse categories"
            actionHref="/categories"
          />
        ) : (
          <div style={GRID}>
            {collections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
