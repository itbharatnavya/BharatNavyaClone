"use client";

// components/admin/ListingVerificationTab.tsx — AI listing-verification queue.
//
// Every new product/service is scored on submit by backend/lib/listingVerification.js
// (deterministic checks + the local `claude` CLI, no API key). A score >= 70% with the
// AI's blessing goes live immediately ("auto_approved"); everything else lands here as
// "needs_review" for a human call. Listings created before this feature shipped have no
// verification block at all ("Unverified") — an admin can still check/approve those,
// one at a time or in bulk via the checkbox column. Server-paginated, filterable by
// review state / category / date range, and searchable by title or seller.

import React, { useEffect, useMemo, useState } from "react";
import {
  adminGetListings,
  adminGetListingDetail,
  adminApproveListing,
  adminRejectListing,
  adminReverifyListing,
  adminBulkApproveListings,
  adminBulkRejectListings,
  adminBulkReverifyListings,
  getCategories,
  type AdminListingRow,
  type AdminListingVerificationFilter,
} from "./adminApi";
import { updateListing } from "@/lib/api";
import type { Listing, Category } from "@/lib/types";
import {
  SectionHeader,
  FilterTabs,
  AdminTable,
  Row,
  Td,
  Pill,
  LoadingState,
  ErrorState,
  EmptyState,
  fmtDate,
  money,
} from "./ui";
import Button from "@/components/Button";
import Input from "@/components/Input";
import SearchLens from "@/components/SearchLens";
import Textarea from "@/components/Textarea";
import Select from "@/components/Select";
import Modal from "@/components/Modal";
import { MediaEditor } from "@/components/sell/editors";
import { useToast } from "@/components/Toast";

const TABS: { value: AdminListingVerificationFilter; label: string }[] = [
  { value: "needs_review", label: "Needs review" },
  { value: "unverified", label: "Unverified (older)" },
  { value: "auto_approved", label: "AI-verified" },
  { value: "admin_approved", label: "Admin-verified" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 30];

function verificationTone(status?: string | null): "green" | "amber" | "red" | "gray" {
  if (status === "auto_approved" || status === "admin_approved") return "green";
  if (status === "needs_review") return "amber";
  if (status === "rejected") return "red";
  return "gray";
}

function verificationLabel(status?: string | null): string {
  if (status === "auto_approved") return "AI-verified";
  if (status === "admin_approved") return "Admin-verified";
  if (status === "needs_review") return "Needs review";
  if (status === "rejected") return "Rejected";
  return "Unverified";
}

/** Every state can move to Approved; every state except "already rejected" can move
 * to Rejected — so a rejected listing can always be reversed by an admin, and a live
 * one can be pulled if it turns out to be bad. */
function canApprove(row: { verification: { status: string } | null }): boolean {
  const s = row.verification?.status;
  return s !== "auto_approved" && s !== "admin_approved";
}
function canReject(row: { verification: { status: string } | null }): boolean {
  return row.verification?.status !== "rejected";
}

export default function ListingVerificationTab() {
  const { addToast } = useToast();
  const [filter, setFilter] = useState<AdminListingVerificationFilter>("needs_review");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<AdminListingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState<AdminListingRow | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  // Debounce the search box — reload 350ms after the user stops typing.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  // Any filter (or page-size) change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [filter, q, categoryId, dateFrom, dateTo, limit]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetListings({
        status: "all",
        verification: filter,
        category: categoryId || undefined,
        q: q || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit,
      });
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, q, categoryId, dateFrom, dateTo, page, limit]);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories]
  );

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  function toggleAll() {
    setSelected(allOnPageSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function decide(row: AdminListingRow, approve: boolean) {
    setBusyId(row.id);
    try {
      if (approve) {
        await adminApproveListing(row.id);
        if (row.sellerStatus && row.sellerStatus !== "approved") {
          addToast(`"${row.title}" approved. It stays hidden from buyers until you approve the seller (${row.sellerCompany}) too.`, "info");
        } else {
          addToast(`"${row.title}" approved — now live.`, "success");
        }
      } else {
        await adminRejectListing(row.id);
        addToast(`"${row.title}" rejected.`, "info");
      }
      setReviewing(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function bulkApprove() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await adminBulkApproveListings(ids);
      addToast(`Approved ${res.approved} listing(s)${res.errors.length ? ` — ${res.errors.length} failed` : ""}.`, "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Bulk approve failed", "error");
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkReject() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await adminBulkRejectListings(ids);
      addToast(`Rejected ${res.rejected} listing(s)${res.errors.length ? ` — ${res.errors.length} failed` : ""}.`, "info");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Bulk reject failed", "error");
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkReverify() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (ids.length > 25) {
      addToast("AI re-check is limited to 25 listings at a time — select fewer.", "error");
      return;
    }
    setBulkBusy(true);
    try {
      const res = await adminBulkReverifyListings(ids);
      const wentLive = res.results.filter((r) => r.status === "active").length;
      addToast(
        `AI-checked ${res.checked} listing(s) — ${wentLive} verified and live, ${res.checked - wentLive} still need review.`,
        "success"
      );
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Bulk AI check failed", "error");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Listing verification"
        subtitle="Products & services are AI-checked on submit — 70%+ with a clean AI read goes live automatically. Everything else, including listings from before this feature, waits here for you."
        actions={<span className="text-sm text-muted">{total} listing(s)</span>}
      />

      <div className="mb-4">
        <FilterTabs tabs={TABS} value={filter} onChange={(v) => setFilter(v as AdminListingVerificationFilter)} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          leftIcon={<SearchLens />}
          placeholder="Search title or seller…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categoryOptions}
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
          placeholder="To"
        />
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-brand-tint px-3.5 py-2.5">
          <span className="text-sm font-semibold text-ink">{selected.size} selected</span>
          <Button size="sm" variant="brand" disabled={bulkBusy} onClick={bulkApprove}>
            Approve selected
          </Button>
          <Button size="sm" variant="danger" disabled={bulkBusy} onClick={bulkReject}>
            Reject selected
          </Button>
          <Button size="sm" variant="secondary" disabled={bulkBusy} onClick={bulkReverify}>
            {bulkBusy ? "Working…" : "Run AI check on selected"}
          </Button>
          <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading listings…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing here" hint="No listings match these filters." />
      ) : (
        <>
          <AdminTable columns={["", "Listing", "Seller", "Verification", "Status", "Date", "Actions"]}>
            {rows.map((r) => {
              const busy = busyId === r.id;
              const img = r.media?.[0]?.url;
              return (
                <Row key={r.id}>
                  <Td className="w-8">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      aria-label={`Select ${r.title}`}
                    />
                  </Td>
                  <Td className="max-w-[220px]">
                    <button
                      type="button"
                      onClick={() => setReviewing(r)}
                      className="flex w-full min-w-0 items-center gap-2.5 text-left"
                    >
                      <span
                        className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-bg-subtle"
                        aria-hidden
                      >
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-1 block font-semibold text-brand hover:underline">
                          {r.title}
                        </span>
                        <span className="text-xs capitalize text-faint">{r.type}</span>
                      </span>
                    </button>
                  </Td>
                  <Td className="max-w-[130px]">
                    <span className="line-clamp-1">{r.sellerCompany}</span>
                    {r.sellerStatus && r.sellerStatus !== "approved" && (
                      <a href={`/admin/users/${r.sellerId}?from=directory`} className="mt-0.5 block text-xs font-semibold text-error hover:underline">
                        Seller {r.sellerStatus}
                      </a>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <Pill tone={verificationTone(r.verification?.status)}>
                      {verificationLabel(r.verification?.status)}
                    </Pill>
                    <span className="ml-1.5 font-mono text-xs text-faint">
                      {r.verification ? `${r.verification.score}/100` : ""}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <Pill status={r.status}>{r.status}</Pill>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{fmtDate(r.createdAt)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => setReviewing(r)}>
                        Review
                      </Button>
                      {canApprove(r) && (
                        <Button size="sm" variant="brand" disabled={busy} onClick={() => decide(r, true)}>
                          Approve
                        </Button>
                      )}
                      {canReject(r) && (
                        <Button size="sm" variant="danger" disabled={busy} onClick={() => decide(r, false)}>
                          Reject
                        </Button>
                      )}
                    </div>
                  </Td>
                </Row>
              );
            })}
          </AdminTable>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} />
                Select all on this page
              </label>
              <span className="text-sm text-muted">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-muted">
                Rows per page
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="input !w-auto !py-1"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {reviewing && (
        <ReviewModal
          row={reviewing}
          onClose={() => setReviewing(null)}
          onDecide={decide}
          onSaved={load}
        />
      )}
    </div>
  );
}

// ============================================================
// ReviewModal — full detail + inline edit + approve/reject/reverify
// ============================================================
function ReviewModal({
  row,
  onClose,
  onDecide,
  onSaved,
}: {
  row: AdminListingRow;
  onClose: () => void;
  onDecide: (row: AdminListingRow, approve: boolean) => void;
  onSaved: () => void;
}) {
  const { addToast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [media, setMedia] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminGetListingDetail(row.id)
      .then((l) => {
        if (cancelled) return;
        setListing(l);
        setTitle(l.title || "");
        setDescription(l.description || "");
        setPrice(l.product?.price != null ? String(l.product.price) : "");
        setMedia((l.media || []).map((m) => m.url));
      })
      .catch((err) => addToast(err instanceof Error ? err.message : "Failed to load listing", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  async function saveDetails() {
    if (!listing) return;
    setBusy(true);
    try {
      const patch: Partial<Listing> = {
        title: title.trim(),
        description: description.trim(),
        media: media.filter((u) => u.trim()).map((url) => ({ type: "image" as const, url: url.trim() })),
      };
      if (listing.type === "product" && price.trim() !== "") {
        const p = Number(price);
        if (!Number.isNaN(p)) patch.product = { ...(listing.product || {}), price: p } as Listing["product"];
      }
      const updated = await updateListing(listing.id, patch);
      setListing((prev) => (prev ? { ...prev, ...updated } : prev));
      addToast("Listing details updated.", "success");
      await onSaved();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function reverify() {
    setBusy(true);
    try {
      const updated = await adminReverifyListing(row.id);
      addToast(
        updated.status === "active" ? "Re-checked — now verified and live." : "Re-checked — still needs review.",
        "info"
      );
      await onSaved();
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Re-check failed", "error");
    } finally {
      setBusy(false);
    }
  }

  const v = listing?.verification;

  return (
    <Modal open onClose={() => (busy ? undefined : onClose())} title={row.title} size="lg">
      {loading || !listing ? (
        <LoadingState label="Loading listing…" />
      ) : (
        <div className="flex flex-col gap-5">
          {/* AI verdict */}
          <div className="rounded-lg border border-border bg-bg-subtle p-3.5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Pill tone={verificationTone(v?.status)}>{verificationLabel(v?.status)}</Pill>
              {v && <span className="text-xs font-mono text-muted">Score {v.score}/100</span>}
              {v && !v.aiRan && <span className="text-xs text-muted">(AI unavailable — deterministic check only)</span>}
              {!v && <span className="text-xs text-muted">Created before AI verification existed — never checked.</span>}
            </div>
            <p className="text-sm text-ink">{v?.summary || "No verification summary yet."}</p>
            {v?.ai?.flags && v.ai.flags.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-error">
                {v.ai.flags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
            {v?.deterministicChecks && v.deterministicChecks.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {v.deterministicChecks.map((c) => (
                  <div key={c.key} className="flex items-start gap-1.5 text-xs">
                    <span className={c.pass ? "text-success" : "text-error"}>{c.pass ? "✓" : "✕"}</span>
                    <span className="text-muted">{c.detail}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Button size="sm" variant="ghost" disabled={busy} onClick={reverify}>
                Run AI check
              </Button>
            </div>
          </div>

          {/* Editable details */}
          <div className="flex flex-col gap-3.5">
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            {listing.type === "product" && (
              <Input
                label="Price (₹)"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                hint={`Currently ${money(listing.product?.price ?? null)}`}
              />
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Photos</label>
              <MediaEditor value={media.length ? media : [""]} onChange={setMedia} />
            </div>
            <div>
              <Button size="sm" variant="secondary" disabled={busy} onClick={saveDetails}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-1 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Close
        </Button>
        {canReject({ verification: v || null }) && (
          <Button variant="danger" disabled={busy} onClick={() => onDecide(row, false)}>
            Reject
          </Button>
        )}
        {canApprove({ verification: v || null }) && (
          <Button variant="brand" disabled={busy} onClick={() => onDecide(row, true)}>
            Approve — go live
          </Button>
        )}
      </div>
    </Modal>
  );
}
