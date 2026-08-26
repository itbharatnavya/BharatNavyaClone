"use client";

// components/admin/RfqLogTab.tsx — full audit log of every RFQ ever submitted:
// who sent it, and which seller(s) it was actually delivered to (automatic
// fan-out and/or manual admin forwards). Server-paginated + filterable, same
// pattern as UsersTab.tsx. Complements (does not replace) the "Unmatched RFQs"
// tab, which is a fast action queue for zero-match escalation only — this page
// covers everything, and lets an admin add a seller to ANY RFQ, not just
// unmatched ones (routes/adminInquiries.js's POST /:id/forward is shared by
// both surfaces).

import React, { useEffect, useState } from "react";
import {
  getRfqLog,
  forwardInquiry,
  dismissInquiry,
  adminSellers,
  getCategories,
  type RfqLogRow,
  type RfqLogStatusFilter,
} from "./adminApi";
import type { Category, User } from "@/lib/types";
import {
  SectionHeader,
  AdminTable,
  Row,
  Td,
  Pill,
  LoadingState,
  ErrorState,
  EmptyState,
  fmtDate,
} from "./ui";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { useToast } from "@/components/Toast";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const STATUS_OPTIONS: { value: RfqLogStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "matched", label: "Matched" },
  { value: "unmatched", label: "Unmatched" },
];

function sellerLabel(u: User): string {
  const name = u.sellerProfile?.companyName || u.name;
  const city = u.sellerProfile?.location?.city;
  return city ? `${name} — ${city}` : name;
}

interface Props {
  // Powers the "Unmatched RFQs" tab: locks the status filter to unmatched +
  // only-not-yet-decided, hides the now-redundant status/seller filters, and
  // swaps "Add seller" for "Forward" + adds "Dismiss". Same table, same
  // backend endpoint (GET /api/admin/inquiries) — just a different default
  // query and action set, so the two tabs never drift out of sync.
  queueMode?: boolean;
}

export default function RfqLogTab({ queueMode = false }: Props) {
  const { addToast } = useToast();

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [status, setStatus] = useState<RfqLogStatusFilter>(queueMode ? "unmatched" : "all");
  const [categoryId, setCategoryId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [rows, setRows] = useState<RfqLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ total: 0, matched: 0, unmatched: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers] = useState<User[]>([]);

  // Per-row "add seller" picker state.
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [pickedSeller, setPickedSeller] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  // Any filter (or page-size) change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [q, sellerFilter, status, categoryId, from, to, limit]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => undefined);
    adminSellers("approved")
      .then(setSellers)
      .catch(() => undefined);
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getRfqLog({
        q: q || undefined,
        sellerId: queueMode ? undefined : sellerFilter || undefined,
        status: queueMode ? "unmatched" : status,
        adminStatus: queueMode ? "pending" : undefined,
        categoryId: categoryId || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit,
      });
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the RFQ log");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sellerFilter, status, categoryId, from, to, page, limit]);

  async function handleAddSeller(row: RfqLogRow) {
    const sellerId = pickedSeller[row.id];
    if (!sellerId) {
      addToast("Pick a seller to add", "error");
      return;
    }
    setBusyId(row.id);
    try {
      await forwardInquiry(row.id, { sellerId, listingId: row.listingId || undefined });
      addToast("Seller added — they now have this as a lead", "success");
      setAddingFor(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Could not add this seller", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(row: RfqLogRow) {
    setBusyId(row.id);
    try {
      await dismissInquiry(row.id);
      addToast("Dismissed", "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Could not dismiss this RFQ", "error");
    } finally {
      setBusyId(null);
    }
  }

  const categoryOptions = [
    { value: "", label: "Any category" },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];
  const sellerOptions = [
    { value: "", label: "Any seller" },
    ...sellers.map((s) => ({ value: s.id, label: sellerLabel(s) })),
  ];

  return (
    <div>
      <SectionHeader
        title={queueMode ? "Unmatched RFQs" : "RFQ Log"}
        subtitle={
          queueMode
            ? "Requirements that matched zero sellers on submission — forward one to a seller, or dismiss it."
            : "Every requirement submitted by a buyer and which seller(s) actually received it — automatic fan-out plus any manual admin forward."
        }
        actions={
          !queueMode && (
            <span className="text-sm text-muted">
              {summary.total} total · {summary.matched} matched · {summary.unmatched} unmatched
            </span>
          )
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Input
          placeholder="Search buyer or product…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        {!queueMode && (
          <Select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            options={sellerOptions}
          />
        )}
        {!queueMode && (
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as RfqLogStatusFilter)}
            options={STATUS_OPTIONS}
          />
        )}
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categoryOptions}
        />
        <Input type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {loading ? (
        <LoadingState label={queueMode ? "Loading unmatched RFQs…" : "Loading RFQ log…"} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={queueMode ? "Nothing to review" : "No RFQs"}
          hint={
            queueMode
              ? "Every submitted RFQ has reached at least one seller."
              : "No requirements match these filters."
          }
        />
      ) : (
        <>
          <AdminTable columns={["Date", "Buyer", "Requirement", "Category", "Sellers", "Status", ""]}>
            {rows.map((r) => {
              const busy = busyId === r.id;
              return (
                <React.Fragment key={r.id}>
                  <Row>
                    <Td className="whitespace-nowrap text-xs text-muted">{fmtDate(r.createdAt)}</Td>
                    <Td>
                      <span className="line-clamp-1 block font-medium text-ink">
                        {r.buyerName || "Buyer"}
                      </span>
                      <span className="line-clamp-1 block text-xs text-faint">
                        {r.buyerMobile || r.buyerEmail || "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="line-clamp-1 block max-w-[220px] text-ink">
                        {r.productName || "Requirement"}
                      </span>
                      {r.quantity && <span className="text-xs text-faint">Qty: {r.quantity}</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-muted">{r.categoryId || "—"}</Td>
                    <Td>
                      {r.sellers.length === 0 ? (
                        <span className="text-xs text-faint">None yet</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.sellers.map((s) => (
                            <Pill key={s.leadId} tone={s.contactedAt ? "green" : "blue"}>
                              {s.companyName || s.sellerId}
                              {s.contactedAt ? ` · ${s.contactedVia === "whatsapp" ? "WhatsApp" : "Call"}` : ""}
                            </Pill>
                          ))}
                        </div>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Pill tone={r.unmatched ? "amber" : "green"}>
                        {r.unmatched ? "Unmatched" : "Matched"}
                      </Pill>
                    </Td>
                    <Td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setAddingFor((cur) => (cur === r.id ? null : r.id))}
                        >
                          {addingFor === r.id ? "Close" : queueMode ? "Forward" : "+ Add seller"}
                        </Button>
                        {queueMode && (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => handleDismiss(r)}>
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Row>
                  {addingFor === r.id && (
                    <Row>
                      <Td colSpan={7}>
                        <div className="flex flex-wrap items-center gap-2 py-1">
                          <select
                            className="select"
                            style={{ maxWidth: 280 }}
                            value={pickedSeller[r.id] || ""}
                            onChange={(e) =>
                              setPickedSeller((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            disabled={busy}
                          >
                            <option value="">Select a seller to add…</option>
                            {sellers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {sellerLabel(s)}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAddSeller(r)}
                            disabled={busy}
                          >
                            {busy ? "Working…" : "Add"}
                          </Button>
                        </div>
                      </Td>
                    </Row>
                  )}
                </React.Fragment>
              );
            })}
          </AdminTable>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
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
    </div>
  );
}
