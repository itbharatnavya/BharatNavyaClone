"use client";

// components/collection/CollectionCard.tsx — a single "Concept" (curated collection)
// tile for the /collections directory. Shows the coverImage when set, else a montage
// of up to 4 previewImages from the collection's resolved items. Title, subtitle and
// item count sit below. The whole card links to /collection/<slug>. No emojis.

import React from "react";
import Link from "next/link";
import type { Collection } from "@/lib/api";

function LayersIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  );
}

/** The visual: a single cover image, or a 1–4 tile montage, or a branded fallback. */
function Cover({ collection }: { collection: Collection }) {
  const cover = collection.coverImage;
  const previews = (collection.previewImages || []).filter(Boolean);

  const wrap: React.CSSProperties = {
    aspectRatio: "16 / 10",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-subtle)",
    overflow: "hidden",
  };

  if (cover) {
    return (
      <div
        style={{
          ...wrap,
          backgroundImage: `url(${cover})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    );
  }

  if (previews.length === 0) {
    return (
      <div
        style={{
          ...wrap,
          display: "grid",
          placeItems: "center",
          color: "var(--faint)",
          background: "linear-gradient(135deg, var(--brand-tint), var(--bg-subtle))",
        }}
      >
        <LayersIcon size={30} />
      </div>
    );
  }

  // 2×2 montage (fills each cell with cover-fit imagery; 1 image spans full).
  const tiles = previews.slice(0, 4);
  const single = tiles.length === 1;
  return (
    <div
      style={{
        ...wrap,
        display: "grid",
        gridTemplateColumns: single ? "1fr" : "1fr 1fr",
        gridTemplateRows: single || tiles.length === 2 ? "1fr" : "1fr 1fr",
        gap: 2,
      }}
    >
      {tiles.map((src, i) => (
        <div
          key={i}
          style={{
            minWidth: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            // a lone 3rd image spans the bottom row for a tidy fill
            gridColumn: tiles.length === 3 && i === 2 ? "1 / -1" : undefined,
          }}
        />
      ))}
    </div>
  );
}

export default function CollectionCard({ collection }: { collection: Collection }) {
  const count = collection.itemCount ?? 0;
  return (
    <Link
      href={`/collection/${collection.slug}`}
      className="card group"
      style={{ display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}
    >
      <Cover collection={collection} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ color: "var(--brand)", display: "inline-flex", flexShrink: 0 }}>
            <LayersIcon size={16} />
          </span>
          <h3
            className="line-clamp-1"
            style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", transition: "color 120ms ease", minWidth: 0 }}
          >
            {collection.title}
          </h3>
        </div>
        {collection.subtitle && (
          <p className="line-clamp-2" style={{ fontSize: 13, color: "var(--muted)" }}>
            {collection.subtitle}
          </p>
        )}
        <span className="badge" style={{ marginTop: "auto", alignSelf: "flex-start" }}>
          {count} {count === 1 ? "listing" : "listings"}
        </span>
      </div>
    </Link>
  );
}
