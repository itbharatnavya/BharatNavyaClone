"use client";

// /features — public capabilities showcase for prospects. Built from the same
// living feature catalog the admin edits (getFeatures), grouped by `group`, with
// live/beta status badges.

import React, { useEffect, useMemo, useState } from "react";
import { getFeatures, type Feature } from "@/lib/api";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import type { BadgeVariant } from "@/components/Badge";
import { useTr } from "@/components/discovery/hooks";

function statusBadge(status?: string): { variant: BadgeVariant; label: string } | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "live") return { variant: "new", label: "Live" };
  if (s === "beta") return { variant: "sponsored", label: "Beta" };
  if (s === "planned" || s === "soon")
    return { variant: "neutral", label: "Planned" };
  return { variant: "neutral", label: status };
}

export default function FeaturesPage() {
  const t = useTr();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFeatures()
      .then(setFeatures)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load features"))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Feature[]>();
    features.forEach((f) => {
      const g = f.group || "Other";
      const arr = map.get(g) || [];
      arr.push(f);
      map.set(g, arr);
    });
    return Array.from(map.entries());
  }, [features]);

  return (
    <div className="counter-public-page counter-support-page counter-feature-page container-bs section-pad-sm">
      {/* Hero */}
      <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
        <span className="eyebrow">{t("features.eyebrow", "Platform")}</span>
        <h1
          style={{
            fontSize: "var(--fs-2xl)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginTop: 10,
          }}
        >
          {t("features.title", "Everything you need to discover, represent and grow across India")}
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 10, fontSize: "var(--fs-md)" }}>
          {t(
            "features.subtitle",
            "One catalog for products and services, AI-powered vendor search, secure chat, seller reach tools, and honest, transparent placement."
          )}
        </p>
        <div style={{ marginTop: 20, display: "inline-flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Button href="/login?next=/features" variant="primary">
            {t("features.getStartedFree", "Get started free")}
          </Button>
          <Button href="/pricing" variant="secondary">
            {t("features.seePricing", "See pricing")}
          </Button>
        </div>
      </div>

      {/* Groups */}
      <div style={{ marginTop: 48 }}>
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 120 }} />
            ))}
          </div>
        ) : error ? (
          <p style={{ textAlign: "center", color: "var(--error)" }}>{error}</p>
        ) : grouped.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--muted)" }}>
            {t("features.catalogSetup", "Feature catalog is being set up.")}
          </p>
        ) : (
          grouped.map(([group, items]) => (
            <section key={group} style={{ marginBottom: 40 }}>
              <h2
                style={{
                  fontSize: "var(--fs-lg)",
                  fontWeight: 700,
                  marginBottom: 4,
                  letterSpacing: "-0.01em",
                }}
              >
                {group}
              </h2>
              <div className="divider" style={{ marginBottom: 16 }} />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {items.map((f) => {
                  const sb = statusBadge(f.status);
                  return (
                    <div key={f.id} className="card card-pad">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <h3 style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)" }}>
                          {f.name}
                        </h3>
                        {sb && <Badge variant={sb.variant}>{sb.label}</Badge>}
                      </div>
                      {f.description && (
                        <p
                          style={{
                            fontSize: "var(--fs-sm)",
                            color: "var(--muted)",
                            marginTop: 8,
                            lineHeight: 1.55,
                          }}
                        >
                          {f.description}
                        </p>
                      )}
                      {f.audience && f.audience !== "all" && (
                        <div style={{ marginTop: 12 }}>
                          <span className="badge badge-neutral" style={{ textTransform: "capitalize" }}>
                            For {f.audience}s
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Bottom CTA */}
      <div
        className="card card-flat"
        style={{
          padding: 32,
          textAlign: "center",
          marginTop: 24,
          background: "linear-gradient(180deg, var(--brand-tint), #fff)",
        }}
      >
        <h3 style={{ fontSize: "var(--fs-xl)", fontWeight: 700 }}>{t("features.putToWork", "Put it to work")}</h3>
        <p style={{ color: "var(--muted)", marginTop: 6, marginBottom: 18 }}>
          {t("features.putSubtitle", "Create your free account and list in minutes.")}
        </p>
        <div style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Button href="/sell" variant="primary" size="lg">
            {t("cta.startSelling", "Start selling")}
          </Button>
          <Button href="/login?next=/features" variant="secondary" size="lg">
            {t("features.createAccount", "Create account")}
          </Button>
        </div>
      </div>
    </div>
  );
}
