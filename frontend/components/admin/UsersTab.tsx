"use client";

// components/admin/UsersTab.tsx — unified user directory.
//
// Every account is a "user"; some additionally carry a sellerProfile, which
// makes them a "seller" too (not a separate account type — a seller can still
// buy). This tab lists everyone, server-paginated, filterable by account type
// (All / Buyers / Sellers) and, for sellers, by approval status. The table
// stays lean (name, type, status, joined) — every other detail plus the
// Approve/Reject/Suspend actions live in a detail modal, opened per row.
// Those actions call the exact same endpoints as the Sellers tab, so the
// existing Sellers tab and its approval flow are untouched.

import React, { useEffect, useState } from "react";
import {
  adminGetUsers,
  adminApprove,
  adminReject,
  adminSuspend,
  adminMonetization,
  type AdminUserRow,
  type AdminUserTypeFilter,
  type AdminUserFeaturedFilter,
} from "./adminApi";
import type { SellerStatus, User, PriorityTier, PlanTier } from "@/lib/types";
import {
  SectionHeader,
  FilterTabs,
  AdminTable,
  Row,
  Td,
  Pill,
  Toggle,
  LoadingState,
  ErrorState,
  EmptyState,
  fmtDate,
} from "./ui";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const STATUS_OPTIONS: { value: SellerStatus | "all"; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

const PLAN_OPTIONS: { value: PlanTier | "all"; label: string }[] = [
  { value: "all", label: "Any plan" },
  { value: "free", label: "Free" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
];

const FEATURED_OPTIONS: { value: AdminUserFeaturedFilter; label: string }[] = [
  { value: "all", label: "Featured: any" },
  { value: "yes", label: "Featured only" },
  { value: "no", label: "Not featured" },
];

export default function UsersTab() {
  const { addToast } = useToast();
  const [type, setType] = useState<AdminUserTypeFilter>("all");
  const [status, setStatus] = useState<SellerStatus | "all">("all");
  const [planTier, setPlanTier] = useState<PlanTier | "all">("all");
  const [featured, setFeatured] = useState<AdminUserFeaturedFilter>("all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ total: 0, users: 0, sellers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewing, setViewing] = useState<AdminUserRow | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  // Any filter (or page-size) change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [type, status, planTier, featured, q, limit]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetUsers({ type, status, planTier, featured, q: q || undefined, page, limit });
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, planTier, featured, q, page, limit]);

  const TYPE_TABS: { value: AdminUserTypeFilter; label: string; count?: number }[] = [
    { value: "all", label: "All", count: summary.total },
    { value: "user", label: "Buyers", count: summary.users },
    { value: "seller", label: "Sellers", count: summary.sellers },
  ];

  return (
    <div>
      <SectionHeader
        title="Users"
        subtitle="Everyone with an account — plain buyers and sellers (a seller is a normal user with a seller profile attached) in one directory."
        actions={<span className="text-sm text-muted">{total} account{total === 1 ? "" : "s"}</span>}
      />

      <div className="mb-4">
        <FilterTabs tabs={TYPE_TABS} value={type} onChange={(v) => setType(v as AdminUserTypeFilter)} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search name, email, mobile or company…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as SellerStatus | "all")}
          options={STATUS_OPTIONS}
          disabled={type === "user"}
          hint={type === "user" ? "Seller filters only" : undefined}
        />
        <Select
          value={planTier}
          onChange={(e) => setPlanTier(e.target.value as PlanTier | "all")}
          options={PLAN_OPTIONS}
          disabled={type === "user"}
          hint={type === "user" ? "Seller filters only" : undefined}
        />
        <Select
          value={featured}
          onChange={(e) => setFeatured(e.target.value as AdminUserFeaturedFilter)}
          options={FEATURED_OPTIONS}
          disabled={type === "user"}
          hint={type === "user" ? "Seller filters only" : undefined}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading users…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState title="No accounts" hint="No users match these filters." />
      ) : (
        <>
          <AdminTable
            columns={
              type === "seller"
                ? ["Name", "Type", "Status", "Plan", "Featured", "Joined", ""]
                : ["Name", "Type", "Status", "Joined", ""]
            }
          >
            {rows.map((u) => {
              const sp = u.sellerProfile;
              return (
                <Row key={u.id}>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setViewing(u)}
                      className="flex min-w-0 items-center gap-2.5 text-left"
                    >
                      <span
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand"
                        aria-hidden
                      >
                        {(u.name || "?").trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-1 block font-semibold text-brand hover:underline">
                          {u.name}
                        </span>
                        <span className="line-clamp-1 block text-xs text-faint">
                          {sp?.companyName || u.email || u.mobile || "—"}
                        </span>
                      </span>
                    </button>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <Pill tone={u.accountType === "seller" ? "purple" : "blue"}>
                      {u.accountType === "seller" ? "Seller" : "Buyer"}
                    </Pill>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {sp ? (
                      <Pill status={sp.status || "pending"}>{sp.status}</Pill>
                    ) : (
                      <Pill tone="green">Active</Pill>
                    )}
                  </Td>
                  {type === "seller" && (
                    <>
                      <Td className="whitespace-nowrap">
                        {sp ? <Pill status={sp.planTier || "free"}>{sp.planTier}</Pill> : <span className="text-faint">—</span>}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {sp?.isFeaturedSeller ? (
                          <Pill tone="amber">Featured</Pill>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </Td>
                    </>
                  )}
                  <Td className="whitespace-nowrap text-xs text-muted">{fmtDate(u.createdAt)}</Td>
                  <Td className="whitespace-nowrap text-right">
                    <Button size="sm" variant="secondary" onClick={() => setViewing(u)}>
                      View
                    </Button>
                  </Td>
                </Row>
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
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {viewing && (
        <UserDetailModal
          user={viewing}
          onClose={() => setViewing(null)}
          onChanged={async (updated) => {
            setViewing(updated);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// UserDetailModal — full profile + (for sellers) approve/reject/suspend
// ============================================================
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

interface MonForm {
  rankBoostScore: string;
  priorityTier: PriorityTier;
  isFeaturedSeller: boolean;
  featuredStartDate: string;
  featuredEndDate: string;
  planTier: PlanTier;
  featuredCredits: string;
  adminNotes: string;
}

function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function UserDetailModal({
  user,
  onClose,
  onChanged,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onChanged: (updated: AdminUserRow) => void;
}) {
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"detail" | "monetize">("detail");
  const [form, setForm] = useState<MonForm | null>(null);
  const sp = user.sellerProfile;

  async function act(fn: (id: string) => Promise<User>, label: string) {
    setBusy(true);
    try {
      const updated = await fn(user.id);
      addToast(`${sp?.companyName || user.name} ${label}`, "success");
      onChanged({ ...updated, accountType: user.accountType });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setBusy(false);
    }
  }

  function openMonetize() {
    setForm({
      rankBoostScore: String(sp?.rankBoostScore ?? 0),
      priorityTier: (sp?.priorityTier as PriorityTier) || "none",
      isFeaturedSeller: !!sp?.isFeaturedSeller,
      featuredStartDate: toDateInput(sp?.featuredStartDate),
      featuredEndDate: toDateInput(sp?.featuredEndDate),
      planTier: (sp?.planTier as PlanTier) || "free",
      featuredCredits: String(sp?.featuredCredits ?? 0),
      adminNotes: sp?.adminNotes || "",
    });
    setMode("monetize");
  }

  async function saveMonetization() {
    if (!form) return;
    setBusy(true);
    try {
      const updated = await adminMonetization(user.id, {
        rankBoostScore: Number(form.rankBoostScore) || 0,
        priorityTier: form.priorityTier,
        isFeaturedSeller: form.isFeaturedSeller,
        featuredStartDate: form.featuredStartDate || null,
        featuredEndDate: form.featuredEndDate || null,
        planTier: form.planTier,
        featuredCredits: Number(form.featuredCredits) || 0,
        adminNotes: form.adminNotes,
      });
      addToast("Monetization saved", "success");
      setMode("detail");
      onChanged({ ...updated, accountType: user.accountType });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => (busy ? undefined : onClose())}
      title={mode === "monetize" ? `Plan & monetization — ${sp?.companyName || user.name}` : user.name}
      size="md"
      footer={
        mode === "monetize" ? (
          <>
            <Button variant="ghost" onClick={() => setMode("detail")} disabled={busy}>
              Back
            </Button>
            <Button variant="brand" disabled={busy} onClick={saveMonetization}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Close
            </Button>
            {sp && (
              <>
                {sp.status !== "suspended" && (
                  <Button variant="secondary" disabled={busy} onClick={() => act(adminSuspend, "suspended")}>
                    Suspend
                  </Button>
                )}
                {sp.status !== "rejected" && (
                  <Button variant="danger" disabled={busy} onClick={() => act(adminReject, "rejected")}>
                    Reject
                  </Button>
                )}
                {sp.status !== "approved" && (
                  <Button variant="brand" disabled={busy} onClick={() => act(adminApprove, "approved")}>
                    Approve
                  </Button>
                )}
                <Button variant="primary" disabled={busy} onClick={openMonetize}>
                  Manage plan
                </Button>
              </>
            )}
          </>
        )
      }
    >
      {mode === "monetize" && form ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Plan tier"
              value={form.planTier}
              onChange={(e) => setForm({ ...form, planTier: e.target.value as PlanTier })}
              options={[
                { value: "free", label: "Free" },
                { value: "silver", label: "Silver" },
                { value: "gold", label: "Gold" },
              ]}
            />
            <Select
              label="Priority tier (ranking boost baseline)"
              value={form.priorityTier}
              onChange={(e) => setForm({ ...form, priorityTier: e.target.value as PriorityTier })}
              options={[
                { value: "none", label: "None" },
                { value: "premium", label: "Premium" },
                { value: "star", label: "Star" },
                { value: "leader", label: "Leader" },
              ]}
            />
            <Input
              label="Rank boost score"
              type="number"
              value={form.rankBoostScore}
              onChange={(e) => setForm({ ...form, rankBoostScore: e.target.value })}
              hint="Manual additive score used in ranking."
            />
            <Input
              label="Featured credits"
              type="number"
              value={form.featuredCredits}
              onChange={(e) => setForm({ ...form, featuredCredits: e.target.value })}
            />
          </div>

          <Toggle
            label="Featured seller"
            hint="Show this seller in featured placements."
            checked={form.isFeaturedSeller}
            onChange={(v) => setForm({ ...form, isFeaturedSeller: v })}
          />

          {form.isFeaturedSeller && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Featured start date"
                type="date"
                value={form.featuredStartDate}
                onChange={(e) => setForm({ ...form, featuredStartDate: e.target.value })}
              />
              <Input
                label="Featured end date"
                type="date"
                value={form.featuredEndDate}
                onChange={(e) => setForm({ ...form, featuredEndDate: e.target.value })}
              />
            </div>
          )}

          <Textarea
            label="Admin notes"
            placeholder="Internal notes (deal terms, account manager, etc.)"
            value={form.adminNotes}
            onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-tint text-lg font-bold text-brand">
              {(user.name || "?").trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{user.name}</span>
                <Pill tone={user.accountType === "seller" ? "purple" : "blue"}>
                  {user.accountType === "seller" ? "Seller" : "Buyer"}
                </Pill>
                {user.roles?.includes("admin") && <Pill tone="gray">Admin</Pill>}
              </div>
              <div className="text-xs text-faint">ID {user.id}</div>
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">Contact</h3>
            <DetailRow label="Email" value={user.email || "—"} />
            <DetailRow label="Mobile" value={user.mobile || "—"} />
            <DetailRow
              label="Location"
              value={[user.city, user.state].filter(Boolean).join(", ") || "—"}
            />
            <DetailRow label="Joined" value={fmtDate(user.createdAt)} />
          </div>

          {sp && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">
                Seller profile
              </h3>
              <DetailRow label="Company" value={sp.companyName || "—"} />
              <DetailRow label="Slug" value={sp.slug ? `/${sp.slug}` : "—"} />
              <DetailRow
                label="Location"
                value={
                  sp.location?.city
                    ? `${sp.location.city}${sp.location.state ? `, ${sp.location.state}` : ""}`
                    : "—"
                }
              />
              <DetailRow label="Status" value={<Pill status={sp.status || "pending"}>{sp.status}</Pill>} />
              <DetailRow
                label="Verified"
                value={<Pill tone={sp.isVerified ? "green" : "gray"}>{sp.isVerified ? "Yes" : "No"}</Pill>}
              />
              <DetailRow label="Plan tier" value={<Pill status={sp.planTier || "free"}>{sp.planTier}</Pill>} />
              <DetailRow
                label="Priority tier"
                value={<Pill status={sp.priorityTier || "none"}>{sp.priorityTier}</Pill>}
              />
              <DetailRow label="Featured" value={sp.isFeaturedSeller ? "Yes" : "No"} />
              <DetailRow label="Rank boost score" value={sp.rankBoostScore ?? 0} />
              <DetailRow
                label="Rating"
                value={sp.rating != null ? `${sp.rating} (${sp.reviewCount ?? 0} reviews)` : "—"}
              />
              {sp.adminNotes && <DetailRow label="Admin notes" value={sp.adminNotes} />}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
