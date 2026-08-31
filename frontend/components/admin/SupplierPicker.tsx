"use client";

// components/admin/SupplierPicker.tsx — the multi-select supplier chooser used by
// the RFQ Log / Unmatched RFQs "Add sellers" action (components/admin/RfqLogTab.tsx).
//
// Replaces the old single <select>: an admin searches approved sellers by name,
// state and category, ticks as many as they want, and assigns them all in one
// go. "Search by category / location" is backed by the SAME matcher the public
// site and the automatic RFQ fan-out use (GET /api/listings?category=&state=&city=):
// we fetch listings for the chosen filters, collect their sellerIds, and keep
// only approved sellers who actually show up in that result. Clearing all three
// filters falls back to the full approved-seller list.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getListings } from "./adminApi";
import type { Category, User } from "@/lib/types";
import { STATE_OPTIONS } from "@/components/LocationPicker";
import Button from "@/components/Button";

interface Props {
  categories: Category[];
  approvedSellers: User[];
  // Sellers already delivered this RFQ — shown ticked + disabled, never re-sent.
  excludeSellerIds: Set<string>;
  // Seed filters from the RFQ itself.
  defaultCategorySlug?: string;
  defaultLocationText?: string; // RFQ's free-text "deliver to" — seeds the search box
  busy?: boolean;
  onAssign: (sellerIds: string[]) => void;
  onCancel: () => void;
}

function cityStatesOf(u: User): string[] {
  const sp = u.sellerProfile;
  const out: string[] = [];
  if (sp?.location?.city) out.push(sp.location.city);
  if (sp?.location?.state) out.push(sp.location.state);
  (sp?.locations || []).forEach((l) => {
    if (l.city) out.push(l.city);
    if (l.state) out.push(l.state);
  });
  (sp?.serviceAreas || []).forEach((a) => {
    if (a.city) out.push(a.city);
    if (a.state) out.push(a.state);
  });
  return out;
}

function sellerLine(u: User): string {
  const name = u.sellerProfile?.companyName || u.name;
  const city = u.sellerProfile?.location?.city;
  const rating = u.sellerProfile?.rating;
  const bits = [name];
  if (city) bits.push(city);
  if (rating) bits.push(`${rating.toFixed(1)}★`);
  return bits.join(" · ");
}

export default function SupplierPicker({
  categories,
  approvedSellers,
  excludeSellerIds,
  defaultCategorySlug = "",
  defaultLocationText = "",
  busy = false,
  onAssign,
  onCancel,
}: Props) {
  const [search, setSearch] = useState(defaultLocationText.trim());
  const [stateSel, setStateSel] = useState("");
  const [catSlug, setCatSlug] = useState(defaultCategorySlug);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // sellerIds that stock the chosen category / area — null until the first fetch,
  // or when no filter that needs it is active.
  const [matchIds, setMatchIds] = useState<Set<string> | null>(null);
  const [matching, setMatching] = useState(false);
  const reqSeq = useRef(0);

  const sellersById = useMemo(() => {
    const m = new Map<string, User>();
    approvedSellers.forEach((s) => m.set(s.id, s));
    return m;
  }, [approvedSellers]);

  // Fetch category/location matches whenever those filters change.
  useEffect(() => {
    const needsMatch = !!(catSlug || stateSel);
    if (!needsMatch) {
      setMatchIds(null);
      setMatching(false);
      return;
    }
    const seq = ++reqSeq.current;
    setMatching(true);
    getListings({
      category: catSlug || undefined,
      state: stateSel || undefined,
      limit: 200,
    })
      .then((res) => {
        if (seq !== reqSeq.current) return;
        setMatchIds(new Set((res.listings || []).map((l) => l.sellerId)));
      })
      .catch(() => {
        if (seq !== reqSeq.current) return;
        setMatchIds(new Set()); // fail closed — show nothing rather than everything
      })
      .finally(() => {
        if (seq === reqSeq.current) setMatching(false);
      });
  }, [catSlug, stateSel]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return approvedSellers.filter((u) => {
      if (matchIds && !matchIds.has(u.id)) return false;
      if (stateSel) {
        const hit = cityStatesOf(u).some(
          (s) => s.toLowerCase() === stateSel.toLowerCase()
        );
        // matchIds already encodes the listing-level state filter; this keeps
        // profile-only sellers honest too.
        if (!hit && !(matchIds && matchIds.has(u.id))) return false;
      }
      if (q) {
        const hay = [
          u.sellerProfile?.companyName || "",
          u.name,
          ...cityStatesOf(u),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [approvedSellers, matchIds, stateSel, search]);

  const selectableVisible = visible.filter((u) => !excludeSellerIds.has(u.id));
  const allShownPicked =
    selectableVisible.length > 0 &&
    selectableVisible.every((u) => picked.has(u.id));

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllShown() {
    setPicked((prev) => {
      const next = new Set(prev);
      if (allShownPicked) selectableVisible.forEach((u) => next.delete(u.id));
      else selectableVisible.forEach((u) => next.add(u.id));
      return next;
    });
  }

  const catOptions = [
    { value: "", label: "Any category" },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];

  return (
    <div className="rounded-lg border border-border bg-bg-subtle p-3">
      {/* filters */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          className="input"
          placeholder="Search name or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select"
          value={stateSel}
          onChange={(e) => setStateSel(e.target.value)}
          aria-label="Filter by state"
        >
          <option value="">Any state</option>
          {STATE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={catSlug}
          onChange={(e) => setCatSlug(e.target.value)}
          aria-label="Filter by category"
        >
          {catOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* count + select-all */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>
          {matching
            ? "Finding suppliers…"
            : `${visible.length} supplier${visible.length === 1 ? "" : "s"} match`}
          {picked.size > 0 ? ` · ${picked.size} selected` : ""}
        </span>
        {selectableVisible.length > 0 && (
          <button
            type="button"
            className="font-medium text-brand hover:underline"
            onClick={toggleAllShown}
          >
            {allShownPicked ? "Clear shown" : "Select all shown"}
          </button>
        )}
      </div>

      {/* list */}
      <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-border bg-surface">
        {visible.length === 0 ? (
          <p className="p-3 text-xs text-faint">
            No approved suppliers match these filters.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((u) => {
              const already = excludeSellerIds.has(u.id);
              const checked = already || picked.has(u.id);
              return (
                <li key={u.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm ${
                      already ? "opacity-60" : "hover:bg-bg-subtle"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={already || busy}
                      onChange={() => toggle(u.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{sellerLine(u)}</span>
                      {already && (
                        <span className="text-xs text-faint">already has this RFQ</span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* actions */}
      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={busy || picked.size === 0}
          onClick={() => onAssign([...picked])}
        >
          {busy
            ? "Assigning…"
            : `Assign ${picked.size || ""} supplier${picked.size === 1 ? "" : "s"}`.trim()}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
