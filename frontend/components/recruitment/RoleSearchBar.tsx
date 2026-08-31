"use client";

// RoleSearchBar — Recruitment's signature search moment: one connected, sentence-style
// control ("[role or company] jobs in [city]") rather than Directory's AI-concierge
// text box. Two fields read as one continuous unit with an internal divider; the city
// field is a native <select> (CLAUDE.md's native-select-for-filters rule) sourced from
// the existing India geo list, not a new city dataset.
//
// Two usage modes, mirroring DirectorySearchBar's controlled/dock API:
//   • Uncontrolled (no `query`/`onQueryChange` props) — owns its own draft state,
//     used standalone on /recruitment/jobs today.
//   • Controlled (`query`/`onQueryChange` + `city`/`onCityChange` supplied) — used by
//     the /recruitment hero (docking source) and Navbar's compact docked copy, both
//     sharing lib/searchDock.tsx's `roleQuery`/`roleCity` so typed text survives the
//     hero-to-navbar handoff on scroll, the same handoff Directory's search already does.
//
// Suggestions dropdown: a curated "Popular searches" list + the fetched job-function
// catalog, filtered client-side as the visitor types — no per-keystroke network call
// (the demo job dataset is far too small for live title matching to be useful, and
// CLAUDE.md steers away from adding requests a static list already avoids).

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_CITIES, PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { getJobFunctions } from "@/lib/api";
import type { JobFunction } from "@/lib/types";

export interface RoleSearchBarProps {
  className?: string;
  size?: "hero" | "compact";
  query?: string;
  onQueryChange?: (query: string) => void;
  city?: string;
  onCityChange?: (city: string) => void;
  dockStyle?: React.CSSProperties;
}

const POPULAR_SEARCHES = [
  "Software Engineer",
  "Sales Executive",
  "Data Analyst",
  "Graphic Designer",
  "Digital Marketing Executive",
  "HR Manager",
  "Customer Support Executive",
  "Business Development Executive",
  "Accountant",
  "React Developer",
  "DevOps Engineer",
  "Content Writer",
];

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="7.5" width="18" height="12" rx="1.8" />
      <path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5" />
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

type SugItem = { kind: "popular" | "function"; label: string; slug?: string };

export default function RoleSearchBar({
  className = "",
  size = "hero",
  query,
  onQueryChange,
  city,
  onCityChange,
  dockStyle,
}: RoleSearchBarProps) {
  const router = useRouter();
  const compact = size === "compact";
  const baseId = useId();

  const controlled = query !== undefined && onQueryChange !== undefined;
  const [localQ, setLocalQ] = useState("");
  const [localCity, setLocalCity] = useState("");
  const q = controlled ? query! : localQ;
  const setQ = controlled ? onQueryChange! : setLocalQ;
  const cityVal = city !== undefined ? city : localCity;
  const setCityVal = onCityChange || setLocalCity;

  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  useEffect(() => {
    getJobFunctions().then(setJobFunctions).catch(() => {});
  }, []);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const term = q.trim().toLowerCase();
  const items: SugItem[] = useMemo(() => {
    const popular = POPULAR_SEARCHES.filter((s) => !term || s.toLowerCase().includes(term)).slice(0, 6).map(
      (label): SugItem => ({ kind: "popular", label })
    );
    const functions = jobFunctions
      .filter((f) => !term || f.name.toLowerCase().includes(term))
      .slice(0, 5)
      .map((f): SugItem => ({ kind: "function", label: f.name, slug: f.slug }));
    return [...popular, ...functions];
  }, [term, jobFunctions]);
  const showDropdown = open && items.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function go(text: string, cityOverride?: string) {
    setOpen(false);
    setActive(-1);
    const params = new URLSearchParams();
    if (text.trim()) params.set("q", text.trim());
    const c = cityOverride !== undefined ? cityOverride : cityVal;
    if (c) params.set("city", c);
    router.push(`/recruitment/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    go(q);
  }

  function selectItem(item: SugItem) {
    setQ(item.label);
    if (item.kind === "function" && item.slug) {
      setOpen(false);
      setActive(-1);
      router.push(`/recruitment/jobs?jobFunction=${item.slug}`);
      return;
    }
    go(item.label);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (showDropdown && active >= 0 && active < items.length) {
        e.preventDefault();
        selectItem(items[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const optionId = (i: number) => `${baseId}-opt-${i}`;

  return (
    <div ref={rootRef} className={`rsb-wrap ${className}`} style={{ position: "relative", width: "100%" }}>
      <form onSubmit={submit} className={`rsb ${compact ? "rsb-compact" : ""}`} style={dockStyle}>
        <span className="rsb-icon" aria-hidden>
          <SearchIcon />
        </span>
        <input
          className="rsb-input"
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Job title, skill or company"
          aria-label="Job title, skill or company"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={`${baseId}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
        />
        <span className="rsb-divider" aria-hidden />
        <span className="rsb-in">in</span>
        <span className="rsb-city-wrap">
          <select
            className="rsb-city"
            value={cityVal}
            onChange={(e) => setCityVal(e.target.value)}
            aria-label="City"
          >
            <option value="">Anywhere in India</option>
            <option value={PAN_INDIA_LABEL}>{PAN_INDIA_LABEL}</option>
            {ALL_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="rsb-chevron" aria-hidden>
            <ChevronIcon />
          </span>
        </span>
        <button type="submit" className="rsb-submit">
          Search
        </button>
      </form>

      {showDropdown && (
        <div
          id={`${baseId}-listbox`}
          role="listbox"
          aria-label="Search suggestions"
          className="card rsb-dropdown"
        >
          {items.some((i) => i.kind === "popular") && (
            <div className="rsb-dropdown-label">
              <TrendIcon /> Popular searches
            </div>
          )}
          {items.map((item, i) => {
            if (item.kind !== "popular") return null;
            return (
              <button
                key={`p-${item.label}`}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => selectItem(item)}
                className={`rsb-opt ${i === active ? "rsb-opt-active" : ""}`}
              >
                {item.label}
              </button>
            );
          })}
          {items.some((i) => i.kind === "function") && (
            <div className="rsb-dropdown-label">
              <BriefcaseIcon /> Browse by category
            </div>
          )}
          {items.map((item, i) => {
            if (item.kind !== "function") return null;
            return (
              <button
                key={`f-${item.slug}`}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => selectItem(item)}
                className={`rsb-opt ${i === active ? "rsb-opt-active" : ""}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .rsb {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1.5px solid var(--border-strong);
          border-radius: 999px;
          box-shadow: var(--shadow-card);
          padding: 6px 6px 6px 20px;
          gap: 4px;
          transition: border-color 150ms ease, box-shadow 150ms ease;
          max-width: 100%;
        }
        .rsb:focus-within {
          border-color: var(--tricolor-green);
          box-shadow: 0 0 0 3px var(--tricolor-green-tint);
        }
        .rsb-compact {
          padding: 3px 3px 3px 14px;
        }
        .rsb-icon {
          color: var(--faint);
          display: inline-flex;
          flex-shrink: 0;
        }
        .rsb-input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          font-size: 15px;
          color: var(--ink);
          padding: 10px 8px;
        }
        .rsb-compact .rsb-input {
          font-size: 14px;
          padding: 7px 6px;
        }
        .rsb-input::placeholder {
          color: var(--faint);
        }
        .rsb-divider {
          width: 1px;
          height: 26px;
          background: var(--border);
          flex-shrink: 0;
          display: none;
        }
        .rsb-compact .rsb-divider {
          height: 20px;
        }
        .rsb-in {
          font-size: 14px;
          color: var(--muted);
          flex-shrink: 0;
          display: none;
        }
        .rsb-city-wrap {
          position: relative;
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }
        .rsb-city {
          appearance: none;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14.5px;
          font-weight: 500;
          color: var(--ink);
          padding: 10px 22px 10px 8px;
          max-width: 160px;
          cursor: pointer;
        }
        .rsb-compact .rsb-city {
          font-size: 13px;
          padding: 7px 20px 7px 6px;
          max-width: 120px;
        }
        .rsb-chevron {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--faint);
          pointer-events: none;
        }
        .rsb-submit {
          flex-shrink: 0;
          background: var(--tricolor-green);
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 12px 26px;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 150ms ease;
        }
        .rsb-compact .rsb-submit {
          padding: 8px 18px;
          font-size: 13.5px;
        }
        .rsb-submit:hover {
          background: var(--tricolor-green-hover);
        }

        @media (min-width: 560px) {
          .rsb-divider,
          .rsb-in {
            display: inline-flex;
          }
        }
        @media (max-width: 480px) {
          .rsb:not(.rsb-compact) {
            flex-wrap: wrap;
            border-radius: 20px;
            padding: 12px 14px;
          }
          .rsb:not(.rsb-compact) .rsb-input {
            flex: 1 1 100%;
            width: 100%;
            padding: 6px 0;
          }
          .rsb:not(.rsb-compact) .rsb-city-wrap {
            flex: 1;
          }
          .rsb:not(.rsb-compact) .rsb-city {
            width: 100%;
            max-width: none;
            padding-left: 0;
          }
          .rsb:not(.rsb-compact) .rsb-submit {
            width: 100%;
            margin-top: 6px;
            padding: 12px;
          }
        }

        .rsb-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          z-index: 40;
          padding: 6px;
          max-height: 360px;
          overflow-y: auto;
          box-shadow: var(--shadow-pop);
          animation: rsb-scale-in 160ms ease;
        }
        @keyframes rsb-scale-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rsb-dropdown-label {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px 4px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--faint);
        }
        .rsb-opt {
          display: block;
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          border-radius: 8px;
          padding: 9px 10px;
          font-size: 14px;
          font-family: inherit;
          color: var(--ink);
          cursor: pointer;
        }
        .rsb-opt-active {
          background: var(--tricolor-green-tint);
          color: var(--tricolor-green-hover);
        }
      `}</style>
    </div>
  );
}
