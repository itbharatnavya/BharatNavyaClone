"use client";

// COMPARE — side-by-side comparison of the 2–4 products the buyer selected
// (client-side, from the localStorage compare tray). Columns scroll horizontally
// on mobile; the attribute-label column stays pinned on the left. Each product
// column has View / Contact actions and a remove control. Empty → prompt to add.

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCompare } from "@/lib/compare";
import { getListing } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { formatLocation } from "@/lib/indiaGeo";
import Breadcrumbs from "@/components/Breadcrumbs";
import Rating from "@/components/Rating";

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function imageOf(l: Listing): string | undefined {
  return l.media?.find((m) => m.type !== "video")?.url || l.media?.[0]?.url;
}

// Brand isn't a first-class typed field on ProductDetail, but the API populates it.
function brandOf(l: Listing): string | undefined {
  const b = (l.product as unknown as { brand?: unknown } | null | undefined)?.brand;
  return typeof b === "string" && b.trim() ? b.trim() : undefined;
}
function conditionOf(l: Listing): string | undefined {
  const c = (l.product as { condition?: string } | null | undefined)?.condition;
  return c && c !== "na" ? c : undefined;
}
const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  used: "Used",
  refurbished: "Refurbished",
};

function priceNode(l: Listing): React.ReactNode {
  if (l.type === "service") {
    const rate = l.service?.rateCard?.[0];
    if (rate) {
      return (
        <span className="cmp-price">
          ₹{formatINR(rate.price)}
          {rate.unit ? <span className="cmp-unit"> / {rate.unit}</span> : null}
        </span>
      );
    }
    return <span className="cmp-price">{l.service?.pricingModel === "quote" ? "On quote" : "Ask rate"}</span>;
  }
  const p = l.product;
  const base = p?.price != null ? p.price : p?.priceTiers?.[0]?.price ?? null;
  if (base == null) return <span className="cmp-price">Ask Price</span>;
  return (
    <span className="cmp-price">
      ₹{formatINR(base)}
      {p?.unitOfMeasure ? <span className="cmp-unit"> / {p.unitOfMeasure}</span> : null}
    </span>
  );
}

function sellerName(l: Listing): string {
  return l.seller?.companyName || l.seller?.name || l.sellerName || "Seller";
}

function VerifiedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--brand)" aria-hidden style={{ display: "block" }}>
      <path d="M12 2l2.4 1.8 3 .2.9 2.9L21 9.2l-1.1 2.8L21 14.8l-1.8 2.1-.9 2.9-3 .2L12 22l-2.4-1.8-3-.2-.9-2.9L3 14.8 4.1 12 3 9.2l1.8-2.1.9-2.9 3-.2L12 2z" />
      <path d="M8.5 12l2.3 2.3 4.7-4.7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

type Resolved = Record<string, Listing | "error">;

export default function ComparePage() {
  const { ids, remove } = useCompare();
  const [items, setItems] = useState<Resolved>({});
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  // Resolve every selected id (cached; failures marked so we don't retry forever).
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

  const allResolved = ids.length > 0 && ids.every((id) => items[id] !== undefined);

  // The listings to show, in tray order (skip any that failed to load).
  const listings = useMemo(
    () =>
      ids
        .map((id) => items[id])
        .filter((v): v is Listing => !!v && v !== "error"),
    [ids, items]
  );

  // Union of specification keys across all products (drives the spec rows).
  const specKeys = useMemo(() => {
    const set = new Set<string>();
    for (const l of listings) {
      const specs = l.product?.specifications;
      if (specs) Object.keys(specs).forEach((k) => set.add(k));
    }
    return Array.from(set).slice(0, 20);
  }, [listings]);

  const crumbs = [{ label: "Directory", href: "/directory" }, { label: "Compare" }];

  return (
    <div className="container-bs" style={{ paddingTop: 24, paddingBottom: 120 }}>
      <Breadcrumbs items={crumbs} />
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", margin: "12px 0 6px" }}>
        Compare products
      </h1>
      <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
        {ids.length > 0
          ? `${listings.length} product${listings.length === 1 ? "" : "s"} side by side.`
          : "Pick products to see them side by side."}
      </p>

      {!ready || (ids.length > 0 && !allResolved) ? (
        <div className="skeleton" style={{ height: 360, width: "100%", borderRadius: 12 }} />
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
              background: "var(--brand-tint)",
              color: "var(--brand)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="7" height="16" rx="1.4" />
              <rect x="14" y="4" width="7" height="16" rx="1.4" />
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
            Nothing to compare yet
          </h2>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>
            Add products to compare from any listing — look for the compare toggle on a
            product card or its detail page.
          </p>
          <Link href="/categories" className="btn btn-primary">
            Browse categories
          </Link>
        </div>
      ) : (
        <div className="cmp-scroll">
          <table className="cmp-table">
            <thead>
              <tr>
                <th className="cmp-corner" />
                {listings.map((l) => {
                  const img = imageOf(l);
                  return (
                    <th key={l.id} className="cmp-head">
                      <div className="cmp-head-inner">
                        <button
                          type="button"
                          className="cmp-remove"
                          onClick={() => remove(l.id)}
                          aria-label={`Remove ${l.title} from compare`}
                        >
                          <XIcon />
                        </button>
                        <Link href={`/listing/${l.id}`} className="cmp-thumb-link">
                          <div
                            className="cmp-thumb"
                            style={{
                              backgroundImage: img ? `url(${img})` : undefined,
                              background: img ? undefined : "var(--bg-subtle)",
                            }}
                            aria-hidden
                          />
                        </Link>
                        <Link href={`/listing/${l.id}`} className="cmp-title line-clamp-2">
                          {l.title}
                        </Link>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <Row label="Price">
                {listings.map((l) => (
                  <td key={l.id} className="cmp-cell">{priceNode(l)}</td>
                ))}
              </Row>

              <Row label="MOQ">
                {listings.map((l) => (
                  <td key={l.id} className="cmp-cell">
                    {l.product?.moq != null
                      ? `${l.product.moq} ${l.product.unitOfMeasure || "units"}`
                      : "—"}
                  </td>
                ))}
              </Row>

              <Row label="Unit">
                {listings.map((l) => (
                  <td key={l.id} className="cmp-cell">
                    {l.product?.unitOfMeasure || "—"}
                  </td>
                ))}
              </Row>

              <Row label="Brand">
                {listings.map((l) => (
                  <td key={l.id} className="cmp-cell">{brandOf(l) || "—"}</td>
                ))}
              </Row>

              <Row label="Condition">
                {listings.map((l) => {
                  const c = conditionOf(l);
                  return (
                    <td key={l.id} className="cmp-cell">
                      {c ? CONDITION_LABEL[c] || c : "—"}
                    </td>
                  );
                })}
              </Row>

              <Row label="Availability">
                {listings.map((l) => (
                  <td key={l.id} className="cmp-cell">
                    {l.product?.availability || "—"}
                  </td>
                ))}
              </Row>

              <Row label="Seller">
                {listings.map((l) => {
                  const verified = l.isVerifiedSeller || !!l.seller?.isVerified;
                  const inner = (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span className="line-clamp-1">{sellerName(l)}</span>
                      {verified && <VerifiedIcon />}
                    </span>
                  );
                  return (
                    <td key={l.id} className="cmp-cell">
                      {l.seller?.slug ? (
                        <Link href={`/seller/${l.seller.slug}`} className="cmp-link">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </td>
                  );
                })}
              </Row>

              <Row label="Location">
                {listings.map((l) => {
                  const isPan = !!(l.panIndia || l.location?.panIndia);
                  const loc = formatLocation({
                    city: l.location?.city,
                    state: l.location?.state,
                    panIndia: isPan,
                  });
                  return (
                    <td key={l.id} className="cmp-cell">{loc || "—"}</td>
                  );
                })}
              </Row>

              <Row label="Rating">
                {listings.map((l) => (
                  <td key={l.id} className="cmp-cell">
                    {l.rating > 0 ? (
                      <Rating value={l.rating} count={l.reviewCount} size={14} />
                    ) : (
                      <span style={{ color: "var(--faint)" }}>No ratings</span>
                    )}
                  </td>
                ))}
              </Row>

              {specKeys.length > 0 && (
                <tr>
                  <td className="cmp-section" colSpan={listings.length + 1}>
                    Specifications
                  </td>
                </tr>
              )}
              {specKeys.map((key) => (
                <Row key={`spec-${key}`} label={key}>
                  {listings.map((l) => (
                    <td key={l.id} className="cmp-cell">
                      {l.product?.specifications?.[key] || "—"}
                    </td>
                  ))}
                </Row>
              ))}

              <tr>
                <td className="cmp-label" />
                {listings.map((l) => (
                  <td key={l.id} className="cmp-cell">
                    <div className="cmp-actions">
                      <Link href={`/listing/${l.id}`} className="btn btn-primary btn-sm btn-block">
                        Contact
                      </Link>
                      <Link href={`/listing/${l.id}`} className="btn btn-secondary btn-sm btn-block">
                        View
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .cmp-scroll {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--canvas);
        }
        .cmp-table {
          border-collapse: collapse;
          width: 100%;
          min-width: 0;
        }
        .cmp-table :global(td),
        .cmp-table :global(th) {
          border-bottom: 1px solid var(--border);
          border-right: 1px solid var(--border);
          text-align: left;
          vertical-align: middle;
        }
        .cmp-table :global(tr td:last-child),
        .cmp-table :global(tr th:last-child) {
          border-right: none;
        }
        /* Pinned label column */
        .cmp-table :global(.cmp-label),
        .cmp-corner {
          position: sticky;
          left: 0;
          z-index: 2;
          background: var(--bg-subtle);
          min-width: 128px;
          width: 128px;
          font-size: 12px;
          font-weight: 600;
          color: var(--faint);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 12px 14px;
        }
        .cmp-corner {
          background: var(--canvas);
          top: 0;
          z-index: 3;
        }
        .cmp-head {
          background: var(--canvas);
          padding: 14px;
          min-width: 220px;
          width: 240px;
        }
        .cmp-head-inner {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }
        .cmp-remove {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--canvas);
          color: var(--muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
        }
        .cmp-remove:hover {
          color: var(--ink);
          border-color: var(--border-strong);
        }
        .cmp-thumb-link {
          display: block;
        }
        .cmp-thumb {
          aspect-ratio: 4 / 3;
          width: 100%;
          border-radius: 8px;
          border: 1px solid var(--border);
          background-size: cover;
          background-position: center;
        }
        .cmp-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
          line-height: 1.35;
        }
        .cmp-title:hover {
          color: var(--brand);
        }
        .cmp-cell {
          padding: 12px 14px;
          font-size: 14px;
          color: var(--ink);
          min-width: 220px;
          width: 240px;
        }
        .cmp-section {
          background: var(--bg-subtle);
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          position: sticky;
          left: 0;
        }
        .cmp-link {
          color: var(--ink);
          font-weight: 500;
        }
        .cmp-link:hover {
          color: var(--brand);
        }
        .cmp-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cmp-price {
          font-size: 16px;
          font-weight: 700;
          color: var(--ink);
        }
        .cmp-unit {
          font-size: 12px;
          font-weight: 500;
          color: var(--faint);
        }
      `}</style>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="cmp-label">{label}</td>
      {children}
    </tr>
  );
}
