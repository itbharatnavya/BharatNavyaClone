"use client";

// Consultations — the "Hire verified experts" EXPERT DIRECTORY.
// WHY this replaced the old services-category landing: Consultations is a directory
// of EXPERTS you hire (CAs, lawyers, consultants), NOT a product catalogue. So the
// page is: an aurora hero + concierge search to describe who you need · a row of
// NATIVE <select> filters (client rule: "as much dropdown as possible") that refetch
// live · and a responsive grid of ExpertCards. It never blanks — loading shows
// skeletons and an empty result set shows a reset-filters card, per the client rule
// that search must always guide.

import React, { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import AISearchBar from "@/components/AISearchBar";
import ExpertCard from "@/components/consultations/ExpertCard";
import { getExperts } from "@/lib/api";
import type { ConsultationExpert, ExpertsMeta } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";

const SERVICE_EXAMPLES = [
  "CA in Pune for GST filing",
  "Corporate lawyer in Delhi",
  "Interior designer in Bangalore",
  "Company registration in Mumbai",
];

// Mode filter options → API keys. Empty value = "Any".
const MODE_OPTIONS = [
  { value: "", label: "Any mode" },
  { value: "video", label: "Video call" },
  { value: "phone", label: "Phone call" },
  { value: "in-person", label: "In-person" },
];

// Sort options → API sort keys. "rating" is the backend default.
const SORT_OPTIONS = [
  { value: "rating", label: "Top rated" },
  { value: "experience", label: "Most experienced" },
  { value: "priceLow", label: "Price: low to high" },
  { value: "priceHigh", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

// Shared styling for the native <select>/<input> controls in the filter bar.
const controlStyle: React.CSSProperties = {
  fontSize: "var(--fs-sm)",
  minWidth: 0,
  width: "100%",
};

export default function ConsultationsPage() {
  const [experts, setExperts] = useState<ConsultationExpert[]>([]);
  usePageTitle("Consultations");
  const [meta, setMeta] = useState<ExpertsMeta>({ professions: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (all optional). `q` is applied on submit; the rest refetch on change.
  const [profession, setProfession] = useState("");
  const [city, setCity] = useState("");
  const [mode, setMode] = useState("");
  const [sort, setSort] = useState("rating");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getExperts({ profession, city, mode, sort, q })
      .then((res) => {
        if (!alive) return;
        setExperts(res.experts);
        // Keep the facet lists stable across filtered fetches: only adopt meta when
        // it actually carries facets (a keyword-narrowed response may thin them).
        setMeta((prev) =>
          res.meta.professions.length || res.meta.cities.length ? res.meta : prev
        );
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not load experts.");
        setExperts([]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [profession, city, mode, sort, q]);

  const hasFilters = Boolean(profession || city || mode || q) || sort !== "rating";

  function resetFilters() {
    setProfession("");
    setCity("");
    setMode("");
    setSort("rating");
    setQInput("");
    setQ("");
  }

  const resultLabel = useMemo(() => {
    const n = experts.length;
    return `${n} ${n === 1 ? "expert" : "experts"}`;
  }, [experts.length]);

  return (
    <div>
      {/* ---------------- HERO ---------------- */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid var(--border)",
          background:
            "radial-gradient(1100px 460px at 50% -8%, var(--brand-tint) 0%, rgba(239,246,255,0) 62%)," +
            "radial-gradient(760px 380px at 88% 8%, var(--action-tint) 0%, rgba(255,247,237,0) 58%)," +
            "var(--canvas)",
        }}
      >
        <div className="container-bs" style={{ paddingTop: 20 }}>
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Consultations" }]} />
        </div>

        <div
          className="container-bs"
          style={{
            position: "relative",
            paddingTop: "clamp(28px, 5vw, 52px)",
            paddingBottom: "clamp(36px, 6vw, 60px)",
            textAlign: "center",
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 14 }}>Bharat Navya Consultations</div>
          <h1
            style={{
              fontSize: "clamp(34px, 5.4vw, 56px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
              color: "var(--ink)",
              maxWidth: 820,
              margin: "0 auto",
            }}
          >
            Hire verified experts
          </h1>
          <p
            style={{
              fontSize: "clamp(16px, 2.2vw, 19px)",
              color: "var(--muted)",
              maxWidth: 620,
              margin: "18px auto 0",
              lineHeight: 1.6,
            }}
          >
            Connect with verified CAs, lawyers, consultants and professionals across
            India. Describe what you need and let our concierge find the right expert.
          </p>

          <div style={{ maxWidth: 720, margin: "30px auto 0" }}>
            <AISearchBar
              size="hero"
              examples={SERVICE_EXAMPLES}
              placeholder="Describe the expert you need… e.g. 'CA in Pune for GST filing'"
            />
          </div>
        </div>
      </section>

      {/* ---------------- FILTER BAR ---------------- */}
      <section className="container-bs" style={{ paddingTop: "clamp(24px, 4vw, 36px)" }}>
        <div className="card card-flat" style={{ padding: 16 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQ(qInput.trim());
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              {/* Profession */}
              <label style={{ minWidth: 0 }}>
                <span className="field-label">Profession</span>
                <select
                  className="select"
                  style={controlStyle}
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                >
                  <option value="">All professions</option>
                  {meta.professions.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label} ({p.count})
                    </option>
                  ))}
                </select>
              </label>

              {/* City */}
              <label style={{ minWidth: 0 }}>
                <span className="field-label">City</span>
                <select
                  className="select"
                  style={controlStyle}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">All cities</option>
                  {meta.cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              {/* Mode */}
              <label style={{ minWidth: 0 }}>
                <span className="field-label">Mode</span>
                <select
                  className="select"
                  style={controlStyle}
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  {MODE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              {/* Sort */}
              <label style={{ minWidth: 0 }}>
                <span className="field-label">Sort by</span>
                <select
                  className="select"
                  style={controlStyle}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              {/* Keyword */}
              <label style={{ minWidth: 0 }}>
                <span className="field-label">Keyword</span>
                <input
                  className="input"
                  style={controlStyle}
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  placeholder="e.g. GST, trademark…"
                  aria-label="Search experts by keyword"
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 14,
              }}
            >
              <span style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", fontWeight: 600 }}>
                {loading ? "Finding experts…" : resultLabel}
                {q ? ` for “${q}”` : ""}
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {hasFilters && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
                    Reset filters
                  </button>
                )}
                <button type="submit" className="btn btn-secondary btn-sm">
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ---------------- RESULTS ---------------- */}
      <section className="container-bs section-pad">
        {loading ? (
          <div
            style={{
              display: "grid",
              gap: "clamp(14px, 2vw, 20px)",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="skeleton" style={{ height: 300, borderRadius: "var(--r-sm)" }} />
            ))}
          </div>
        ) : error ? (
          <div className="card card-flat" style={{ padding: 28, textAlign: "center" }}>
            <p style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              We couldn&apos;t load experts right now.
            </p>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", margin: "8px 0 0" }}>{error}</p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 16 }}
              onClick={() => setSort((s) => s)}
            >
              Try again
            </button>
          </div>
        ) : experts.length === 0 ? (
          <div className="card card-flat" style={{ padding: 32, textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
            <p style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
              No experts match your filters
            </p>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.55 }}>
              Try broadening your search — clear a filter or two and we&apos;ll show
              you more verified professionals.
            </p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 18 }} onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "clamp(14px, 2vw, 20px)",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {experts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
