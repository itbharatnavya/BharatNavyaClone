"use client";

// Category picker for /sell. Accepts the flat category list from getCategories()
// (each row has parentId + path), builds a tree, and offers BOTH:
//   • a cascading nested-select drilldown (level by level), and
//   • a searchable list (type to filter across every category).
// Categories are filtered by the chosen listing type (product|service|both).

import React, { useMemo, useState } from "react";
import type { Category, ListingType } from "@/lib/types";
import { suggestCategory } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface Props {
  categories: Category[];
  type: ListingType;
  value?: string; // selected categoryId
  onSelect: (category: Category) => void;
}

export default function CategoryPicker({
  categories,
  type,
  value,
  onSelect,
}: Props) {
  const { addToast } = useToast();
  const [query, setQuery] = useState("");

  // "Other (not listed)" — seller proposes a category we don't have yet. This is a
  // separate admin signal; it does not change the listing's own category selection.
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);

  const submitSuggestion = async () => {
    const name = otherName.trim();
    if (!name || suggesting) return;
    setSuggesting(true);
    try {
      await suggestCategory({ name, context: type });
      setSuggestedName(name);
      setOtherName("");
      addToast(
        `Thanks! "${name}" was sent to our team to review.`,
        "success"
      );
    } catch (e) {
      addToast(
        e instanceof Error ? e.message : "Couldn't send your suggestion.",
        "error"
      );
    } finally {
      setSuggesting(false);
    }
  };

  // Only categories usable for this listing type.
  const usable = useMemo(
    () => categories.filter((c) => c.type === type || c.type === "both"),
    [categories, type]
  );

  const byId = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Category[]>();
    usable.forEach((c) => {
      const key = c.parentId ?? null;
      const arr = map.get(key) || [];
      arr.push(c);
      map.set(key, arr);
    });
    for (const arr of map.values()) arr.sort((a, b) => a.order - b.order);
    return map;
  }, [usable]);

  const selected = value ? byId.get(value) : undefined;

  // Cascading selection: track the chosen id at each level.
  const [drill, setDrill] = useState<string[]>([]);

  const levels: Category[][] = [];
  levels.push(childrenOf.get(null) || []);
  for (let i = 0; i < drill.length; i++) {
    const kids = childrenOf.get(drill[i]) || [];
    if (kids.length) levels.push(kids);
    else break;
  }

  const chooseAtLevel = (levelIdx: number, catId: string) => {
    const next = drill.slice(0, levelIdx);
    if (catId) next[levelIdx] = catId;
    setDrill(next);
    const cat = byId.get(catId);
    if (!cat) return;
    const kids = childrenOf.get(catId) || [];
    // Leaf → commit the selection.
    if (kids.length === 0) onSelect(cat);
  };

  // Search results (flat, across all usable categories).
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return usable
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 40);
  }, [query, usable]);

  const pathLabel = (c: Category) =>
    c.path
      .map((slug) => categories.find((x) => x.slug === slug)?.name || slug)
      .join(" › ");

  return (
    <div>
      {/* Selected summary */}
      {selected && (
        <div
          className="card card-flat"
          style={{
            padding: "12px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            borderColor: "var(--brand)",
            background: "var(--brand-tint)",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "var(--brand-hover)", fontWeight: 600 }}>
              Selected category
            </div>
            <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>
              {pathLabel(selected)}
            </div>
          </div>
          <span
            className="badge badge-verified"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            Chosen
          </span>
        </div>
      )}

      {/* Search */}
      <label className="field-label">Search categories</label>
      <input
        className="input"
        placeholder="Type to search — e.g. steel, chartered accountant, flour…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <div
          className="card card-flat"
          style={{
            marginTop: 8,
            maxHeight: 260,
            overflowY: "auto",
            padding: 6,
          }}
        >
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelect(c);
                setQuery("");
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                borderRadius: 8,
                border: "none",
                background:
                  value === c.id ? "var(--brand-tint)" : "transparent",
                cursor: "pointer",
                fontSize: 14,
                color: "var(--ink)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-subtle)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  value === c.id ? "var(--brand-tint)" : "transparent")
              }
            >
              <span style={{ fontWeight: 500 }}>{c.name}</span>
              <span style={{ color: "var(--faint)", fontSize: 12, marginLeft: 8 }}>
                {pathLabel(c)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "20px 0 12px",
        }}
      >
        <span className="divider" style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--faint)" }}>
          or browse by category
        </span>
        <span className="divider" style={{ flex: 1 }} />
      </div>

      {/* Cascading drilldown */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {levels.map((opts, levelIdx) => (
          <div key={levelIdx}>
            <label className="field-label">
              {levelIdx === 0 ? "Category" : `Sub-category`}
            </label>
            <select
              className="select"
              value={drill[levelIdx] || ""}
              onChange={(e) => chooseAtLevel(levelIdx, e.target.value)}
            >
              <option value="">Select…</option>
              {opts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {(childrenOf.get(c.id)?.length || 0) > 0 ? " ›" : ""}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {usable.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
          No categories available yet for {type}s.
        </p>
      )}

      {/* Other (not listed) — suggest a missing category */}
      <div
        className="card card-flat"
        style={{
          marginTop: 20,
          padding: 16,
          borderStyle: "dashed",
        }}
      >
        {!otherOpen ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 13.5, color: "var(--muted)" }}>
              Can’t find your category?
            </div>
            <button
              type="button"
              className="chip"
              onClick={() => setOtherOpen(true)}
            >
              + Other (not listed)
            </button>
          </div>
        ) : (
          <div>
            <label className="field-label">Suggest a new category</label>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 8px" }}>
              Tell us what to call it. Our team reviews suggestions and adds new
              categories — this doesn’t block your listing.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                className="input"
                style={{ flex: "1 1 240px" }}
                placeholder="e.g. Solar inverter repair, Millet flour…"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submitSuggestion();
                  }
                }}
                maxLength={80}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={!otherName.trim() || suggesting}
                onClick={() => void submitSuggestion()}
              >
                {suggesting ? "Sending…" : "Suggest"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOtherOpen(false)}
              >
                Cancel
              </button>
            </div>
            {suggestedName && (
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--brand)",
                  marginTop: 10,
                  marginBottom: 0,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ flexShrink: 0, marginTop: 2 }}
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  Sent “{suggestedName}”. You can suggest another, or pick the
                  closest category above to publish now.
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
