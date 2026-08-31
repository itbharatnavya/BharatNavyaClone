"use client";

// components/admin/SellersTab.tsx — seller directory + approval workflow + Monetization editor.
// adminSellers(status), adminApprove/Reject/Suspend, adminMonetization(id, {...}).

import React, { useEffect, useMemo, useState } from "react";
import type { User, PriorityTier, PlanTier } from "@/lib/types";
import {
  adminSellers,
  adminApprove,
  adminReject,
  adminSuspend,
  adminMonetization,
} from "./adminApi";
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
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import { useToast } from "@/components/Toast";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "suspended";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

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

export default function SellersTab() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sellers, setSellers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // monetization modal
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<MonForm | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSellers(await adminSellers(status));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sellers");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const counts = useMemo(() => sellers.length, [sellers]);

  async function act(
    user: User,
    fn: (id: string) => Promise<User>,
    label: string
  ) {
    setBusyId(user.id);
    try {
      await fn(user.id);
      addToast(`${user.sellerProfile?.companyName || user.name} ${label}`, "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  function openMonetize(u: User) {
    const sp = u.sellerProfile;
    setEditing(u);
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
  }

  async function saveMonetization() {
    if (!editing || !form) return;
    setSaving(true);
    try {
      await adminMonetization(editing.id, {
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
      setEditing(null);
      setForm(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Sellers"
        subtitle="Approve, moderate and monetize seller accounts."
        actions={
          <span className="text-sm text-muted">
            {counts} seller{counts === 1 ? "" : "s"}
          </span>
        }
      />

      <div className="mb-4">
        <FilterTabs
          tabs={STATUS_TABS}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
      </div>

      {loading ? (
        <LoadingState label="Loading sellers…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : sellers.length === 0 ? (
        <EmptyState title="No sellers" hint="No sellers match this filter." />
      ) : (
        <AdminTable
          columns={[
            "Company",
            "Owner",
            "Location",
            "Status",
            "Plan",
            "Priority",
            "Featured",
            "Boost",
            "Actions",
          ]}
        >
          {sellers.map((u) => {
            const sp = u.sellerProfile;
            const busy = busyId === u.id;
            return (
              <Row key={u.id}>
                <Td>
                  <div className="font-semibold text-ink">
                    {sp?.companyName || "—"}
                  </div>
                  <div className="text-xs text-faint">/{sp?.slug}</div>
                </Td>
                <Td>
                  <div className="text-ink">{u.name}</div>
                  <div className="text-xs text-faint">{u.mobile}</div>
                </Td>
                <Td className="whitespace-nowrap text-muted">
                  {sp?.location?.city || u.city || "—"}
                  {sp?.location?.state ? `, ${sp.location.state}` : ""}
                </Td>
                <Td>
                  <Pill status={sp?.status || "pending"}>{sp?.status}</Pill>
                </Td>
                <Td>
                  <Pill status={sp?.planTier || "free"}>{sp?.planTier}</Pill>
                </Td>
                <Td>
                  <Pill status={sp?.priorityTier || "none"}>
                    {sp?.priorityTier}
                  </Pill>
                </Td>
                <Td>
                  {sp?.isFeaturedSeller ? (
                    <Pill tone="amber">Featured</Pill>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </Td>
                <Td className="text-muted">{sp?.rankBoostScore ?? 0}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sp?.status !== "approved" && (
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={busy}
                        onClick={() => act(u, adminApprove, "approved")}
                      >
                        Approve
                      </Button>
                    )}
                    {sp?.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
                        onClick={() => act(u, adminReject, "rejected")}
                      >
                        Reject
                      </Button>
                    )}
                    {sp?.status !== "suspended" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => act(u, adminSuspend, "suspended")}
                      >
                        Suspend
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openMonetize(u)}
                    >
                      Monetize
                    </Button>
                  </div>
                </Td>
              </Row>
            );
          })}
        </AdminTable>
      )}

      {/* Monetization editor */}
      <Modal
        open={!!editing && !!form}
        onClose={() => {
          setEditing(null);
          setForm(null);
        }}
        title={`Monetization — ${editing?.sellerProfile?.companyName || editing?.name || ""}`}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setForm(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="brand" disabled={saving} onClick={saveMonetization}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Plan tier"
                value={form.planTier}
                onChange={(e) =>
                  setForm({ ...form, planTier: e.target.value as PlanTier })
                }
                options={[
                  { value: "free", label: "Free" },
                  { value: "silver", label: "Silver" },
                  { value: "gold", label: "Gold" },
                ]}
              />
              <Select
                label="Priority tier (ranking boost baseline)"
                value={form.priorityTier}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priorityTier: e.target.value as PriorityTier,
                  })
                }
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
                onChange={(e) =>
                  setForm({ ...form, rankBoostScore: e.target.value })
                }
                hint="Manual additive score used in ranking."
              />
              <Input
                label="Featured credits"
                type="number"
                value={form.featuredCredits}
                onChange={(e) =>
                  setForm({ ...form, featuredCredits: e.target.value })
                }
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
                  onChange={(e) =>
                    setForm({ ...form, featuredStartDate: e.target.value })
                  }
                />
                <Input
                  label="Featured end date"
                  type="date"
                  value={form.featuredEndDate}
                  onChange={(e) =>
                    setForm({ ...form, featuredEndDate: e.target.value })
                  }
                />
              </div>
            )}

            <Textarea
              label="Admin notes"
              placeholder="Internal notes (deal terms, account manager, etc.)"
              value={form.adminNotes}
              onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
            />

            <p className="text-xs text-faint">
              Current cycle: {form.planTier} · featured{" "}
              {editing?.sellerProfile?.featuredEndDate
                ? `until ${fmtDate(editing.sellerProfile.featuredEndDate)}`
                : "—"}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
