"use client";

// components/admin/PlansTab.tsx — subscription plan catalog (drives seller plans).
// adminPlans() list + adminCreatePlan / adminUpdatePlan (all fields).

import React, { useEffect, useState } from "react";
import {
  getPlans,
  createPlan,
  updatePlan,
  type PlanRow,
  type PlanInput,
} from "./adminApi";
import {
  SectionHeader,
  AdminTable,
  Row,
  Td,
  Pill,
  Toggle,
  LoadingState,
  ErrorState,
  EmptyState,
} from "./ui";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { useToast } from "@/components/Toast";

interface PlanForm {
  name: string;
  tier: string;
  billingCycle: string;
  listingLimit: string; // empty = unlimited (null)
  leadQuotaPerCycle: string;
  featuredCreditsPerCycle: string;
  rankBoostBaseline: string;
  perLeadPrice: string;
  priceMonthly: string;
  priceCurrency: string;
  priceLabel: string;
  tierRank: string;
  verifiedBadgeIncluded: boolean;
  analyticsEnabled: boolean;
}

const EMPTY: PlanForm = {
  name: "",
  tier: "free",
  billingCycle: "monthly",
  listingLimit: "",
  leadQuotaPerCycle: "0",
  featuredCreditsPerCycle: "0",
  rankBoostBaseline: "0",
  perLeadPrice: "0",
  priceMonthly: "0",
  priceCurrency: "INR",
  priceLabel: "",
  tierRank: "0",
  verifiedBadgeIncluded: false,
  analyticsEnabled: false,
};

function toForm(p: PlanRow): PlanForm {
  return {
    name: p.name || "",
    tier: p.tier || "free",
    billingCycle: p.billingCycle || "monthly",
    listingLimit: p.listingLimit == null ? "" : String(p.listingLimit),
    leadQuotaPerCycle: String(p.leadQuotaPerCycle ?? 0),
    featuredCreditsPerCycle: String(p.featuredCreditsPerCycle ?? 0),
    rankBoostBaseline: String(p.rankBoostBaseline ?? 0),
    perLeadPrice: String(p.perLeadPrice ?? 0),
    priceMonthly: String(p.priceInfo?.monthly ?? 0),
    priceCurrency: p.priceInfo?.currency || "INR",
    priceLabel: p.priceInfo?.label || "",
    tierRank: String(p.tierRank ?? 0),
    verifiedBadgeIncluded: !!p.verifiedBadgeIncluded,
    analyticsEnabled: !!p.analyticsEnabled,
  };
}

function toInput(f: PlanForm): PlanInput {
  return {
    name: f.name.trim(),
    tier: f.tier,
    billingCycle: f.billingCycle,
    listingLimit: f.listingLimit.trim() === "" ? null : Number(f.listingLimit),
    leadQuotaPerCycle: Number(f.leadQuotaPerCycle) || 0,
    featuredCreditsPerCycle: Number(f.featuredCreditsPerCycle) || 0,
    rankBoostBaseline: Number(f.rankBoostBaseline) || 0,
    perLeadPrice: Number(f.perLeadPrice) || 0,
    priceInfo: {
      monthly: Number(f.priceMonthly) || 0,
      currency: f.priceCurrency || "INR",
      label: f.priceLabel,
    },
    tierRank: Number(f.tierRank) || 0,
    verifiedBadgeIncluded: f.verifiedBadgeIncluded,
    analyticsEnabled: f.analyticsEnabled,
  };
}

export default function PlansTab() {
  const { addToast } = useToast();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await getPlans();
      list.sort((a, b) => (a.tierRank ?? 0) - (b.tierRank ?? 0));
      setPlans(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(p: PlanRow) {
    setEditingId(p.id);
    setForm(toForm(p));
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = toInput(form);
      if (editingId) {
        await updatePlan(editingId, body);
        addToast("Plan updated", "success");
      } else {
        await createPlan(body);
        addToast("Plan created", "success");
      }
      setOpen(false);
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
        title="Plans"
        subtitle="Subscription tiers. This catalog drives plans in the seller dashboard and /offer."
        actions={
          <Button variant="brand" onClick={openCreate}>
            + New plan
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading plans…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : plans.length === 0 ? (
        <EmptyState title="No plans yet" hint="Create your first plan." />
      ) : (
        <AdminTable
          columns={[
            "Plan",
            "Price",
            "Listings",
            "Lead quota",
            "Featured/cycle",
            "Rank baseline",
            "Per-lead",
            "Badge",
            "Analytics",
            "Actions",
          ]}
        >
          {plans.map((p) => (
            <Row key={p.id}>
              <Td>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{p.name}</span>
                  <Pill status={p.tier}>{p.tier}</Pill>
                </div>
              </Td>
              <Td className="whitespace-nowrap">
                <span className="font-medium text-ink">
                  {p.priceInfo?.label ||
                    `${p.priceInfo?.currency || "INR"} ${p.priceInfo?.monthly ?? 0}`}
                </span>
                <span className="ml-1 text-xs text-faint">
                  /{p.billingCycle || "mo"}
                </span>
              </Td>
              <Td className="text-muted">
                {p.listingLimit == null ? "Unlimited" : p.listingLimit}
              </Td>
              <Td className="text-muted">{p.leadQuotaPerCycle ?? 0}</Td>
              <Td className="text-muted">{p.featuredCreditsPerCycle ?? 0}</Td>
              <Td className="text-muted">{p.rankBoostBaseline ?? 0}</Td>
              <Td className="text-muted">₹{p.perLeadPrice ?? 0}</Td>
              <Td>
                <Pill status={p.verifiedBadgeIncluded ? "yes" : "no"}>
                  {p.verifiedBadgeIncluded ? "Yes" : "No"}
                </Pill>
              </Td>
              <Td>
                <Pill status={p.analyticsEnabled ? "yes" : "no"}>
                  {p.analyticsEnabled ? "Yes" : "No"}
                </Pill>
              </Td>
              <Td>
                <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                  Edit
                </Button>
              </Td>
            </Row>
          ))}
        </AdminTable>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit plan" : "New plan"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={saving || !form.name.trim()}
              onClick={save}
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Create plan"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Plan name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Gold"
              required
            />
            <Select
              label="Tier"
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value })}
              options={[
                { value: "free", label: "Free" },
                { value: "silver", label: "Silver" },
                { value: "gold", label: "Gold" },
              ]}
            />
            <Select
              label="Billing cycle"
              value={form.billingCycle}
              onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
            <Input
              label="Tier rank (sort order)"
              type="number"
              value={form.tierRank}
              onChange={(e) => setForm({ ...form, tierRank: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Monthly price"
              type="number"
              value={form.priceMonthly}
              onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })}
            />
            <Input
              label="Currency"
              value={form.priceCurrency}
              onChange={(e) => setForm({ ...form, priceCurrency: e.target.value })}
            />
            <Input
              label="Price label"
              value={form.priceLabel}
              onChange={(e) => setForm({ ...form, priceLabel: e.target.value })}
              placeholder="₹7,999 / mo"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Listing limit"
              type="number"
              value={form.listingLimit}
              onChange={(e) => setForm({ ...form, listingLimit: e.target.value })}
              hint="Blank = unlimited"
            />
            <Input
              label="Lead quota / cycle"
              type="number"
              value={form.leadQuotaPerCycle}
              onChange={(e) =>
                setForm({ ...form, leadQuotaPerCycle: e.target.value })
              }
            />
            <Input
              label="Featured credits / cycle"
              type="number"
              value={form.featuredCreditsPerCycle}
              onChange={(e) =>
                setForm({ ...form, featuredCreditsPerCycle: e.target.value })
              }
            />
            <Input
              label="Rank boost baseline"
              type="number"
              value={form.rankBoostBaseline}
              onChange={(e) =>
                setForm({ ...form, rankBoostBaseline: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Per-lead price (₹)"
              type="number"
              value={form.perLeadPrice}
              onChange={(e) => setForm({ ...form, perLeadPrice: e.target.value })}
            />
            <Toggle
              label="Verified badge included"
              checked={form.verifiedBadgeIncluded}
              onChange={(v) => setForm({ ...form, verifiedBadgeIncluded: v })}
            />
            <Toggle
              label="Analytics enabled"
              checked={form.analyticsEnabled}
              onChange={(v) => setForm({ ...form, analyticsEnabled: v })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
