"use client";

// Category picker for /sell. The seller describes what they sell in their own words and we
// suggest the closest categories (lib/categorySuggest.ts); browsing the full tree level by level
// is still there for anyone who prefers it. Choosing a category commits it straight away.

import React, { useEffect, useMemo, useState } from "react";
import type { Category, ListingType } from "@/lib/types";
import { suggestCategory } from "@/lib/api";
import { suggestCategories } from "@/lib/categorySuggest";
import { useToast } from "@/components/Toast";

interface Props {
  categories: Category[];
  type: ListingType;
  value?: string; // selected categoryId
  hint?: string; // what the seller typed on the first step
  onSelect: (category: Category) => void;
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function CategoryPicker({ categories, type, value, hint = "", onSelect }: Props) {
  const { addToast } = useToast();
  const [query, setQuery] = useState(hint);
  const [browseOpen, setBrowseOpen] = useState(false);

  // Seed the search with what the seller already told us, once, if they come back to this step.
  useEffect(() => {
    if (hint && !query) setQuery(hint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint]);

  // "Other (not listed)": the seller proposes a category we do not have yet. It is an admin signal
  // only and never blocks the listing, which still needs the closest existing category.
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
      addToast(`Thanks! "${name}" was sent to our team to review.`, "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Couldn't send your suggestion.", "error");
    } finally {
      setSuggesting(false);
    }
  };

  const usable = useMemo(
    () => categories.filter((c) => c.type === type || c.type === "both"),
    [categories, type]
  );
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

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

  const [drill, setDrill] = useState<string[]>([]);
  const levels: Category[][] = [childrenOf.get(null) || []];
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
    if ((childrenOf.get(catId) || []).length === 0) onSelect(cat);
  };

  const matches = useMemo(() => suggestCategories(query, usable, { limit: 6 }), [query, usable]);

  const pathLabel = (c: Category) =>
    (c.path || [])
      .slice(0, -1)
      .map((slug) => categories.find((x) => x.slug === slug)?.name || slug)
      .join(" › ");

  const trimmed = query.trim();

  return (
    <div className="sl-cat">
      {selected && (
        <div className="sl-chosen" role="status">
          <span className="sl-chosen-mark"><Check /></span>
          <span className="sl-chosen-copy">
            <small>Your category</small>
            <strong>{selected.name}</strong>
            {pathLabel(selected) && <em>{pathLabel(selected)}</em>}
          </span>
        </div>
      )}

      <label className="sl-label" htmlFor="sl-cat-search">
        {selected ? "Not right? Search again" : "What are you selling? We will suggest where it belongs"}
      </label>
      <div className="sl-search">
        <svg aria-hidden viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          id="sl-cat-search"
          className="sl-input"
          placeholder="e.g. coconut water, steel pipes, GST filing"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {trimmed && matches.length > 0 && (
        <div className="sl-matches" role="list" aria-label="Suggested categories">
          <p className="sl-matches-title">Best matches</p>
          {matches.map(({ category: c }, i) => (
            <button
              key={c.id}
              type="button"
              role="listitem"
              className={`sl-match${value === c.id ? " is-selected" : ""}`}
              onClick={() => onSelect(c)}
            >
              <span className="sl-match-copy">
                <strong>{c.name}</strong>
                {pathLabel(c) && <small>{pathLabel(c)}</small>}
              </span>
              {value === c.id ? <span className="sl-match-state"><Check /> Chosen</span> : i === 0 ? <span className="sl-match-tag">Closest</span> : null}
            </button>
          ))}
        </div>
      )}

      {!trimmed && !selected && (childrenOf.get(null) || []).length > 0 && (
        <div className="sl-quick">
          <p className="sl-matches-title">Or start from a popular group</p>
          <div className="sl-quick-chips">
            {(childrenOf.get(null) || []).slice(0, 10).map((c) => (
              <button key={c.id} type="button" className="chip" onClick={() => setQuery(c.name.split(/[,&]/)[0].trim())}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {trimmed && matches.length === 0 && (
        <p className="sl-empty">
          Nothing close to “{trimmed}”. Try one simpler word (like “tea”, “steel” or “repair”), or open
          the full list below.
        </p>
      )}

      <button
        type="button"
        className="sl-browse-toggle"
        aria-expanded={browseOpen}
        onClick={() => setBrowseOpen((o) => !o)}
      >
        {browseOpen ? "Hide the full list" : "Browse all categories instead"}
        <svg aria-hidden viewBox="0 0 24 24"><path d={browseOpen ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} /></svg>
      </button>

      {browseOpen && (
        <div className="sl-browse">
          {levels.map((opts, levelIdx) => (
            <div key={levelIdx}>
              <label className="sl-label" htmlFor={`sl-level-${levelIdx}`}>
                {levelIdx === 0 ? "Category" : "Sub-category"}
              </label>
              <select
                id={`sl-level-${levelIdx}`}
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
          {usable.length === 0 && <p className="sl-empty">No categories available yet for {type}s.</p>}
        </div>
      )}

      <div className="sl-other">
        {!otherOpen ? (
          <>
            <span>Cannot find a good match?</span>
            <button type="button" className="sl-link" onClick={() => setOtherOpen(true)}>
              Tell us what to add
            </button>
          </>
        ) : (
          <div className="sl-other-form">
            <label className="sl-label" htmlFor="sl-other-name">Suggest a new category</label>
            <p className="sl-note">
              Our team reviews suggestions and adds new categories. It will not block your listing, so
              choose the closest category above to carry on.
            </p>
            <div className="sl-other-row">
              <input
                id="sl-other-name"
                className="sl-input"
                placeholder="e.g. Solar inverter repair, Millet flour"
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
              <button type="button" className="btn btn-primary btn-sm" disabled={!otherName.trim() || suggesting} onClick={() => void submitSuggestion()}>
                {suggesting ? "Sending…" : "Send"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOtherOpen(false)}>
                Cancel
              </button>
            </div>
            {suggestedName && <p className="sl-note is-ok"><Check /> Sent “{suggestedName}”. You can pick the closest category above to publish now.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
