"use client";

// components/admin/EntitlementsTab.tsx — the Feature × Tier ENTITLEMENTS matrix.
//
// Reads the composed catalog from GET /api/entitlements and lets an admin change
// who-gets-what with ZERO code:
//   • The MATRIX — rows = features (grouped by `group`), columns = Free/Silver/Gold.
//     Each cell toggles whether that tier is in the feature's `plans` array.
//   • PLAN LIMITS — per-tier listing/lead/featured quotas, per-lead price, and the
//     verified-badge / analytics switches (the subscription-plans.json fields).
// "Save changes" diffs the local edits against what was loaded and sends only the
// changed feature plans + changed tier limits to PUT /api/admin/entitlements, then
// primes the shared gating cache so runtime gates reflect the new rules immediately.

import React, { useEffect, useMemo, useState } from "react";
import {
  saveEntitlements,
  type EntitlementsSaveBody,
  type EntitlementLimitsInput,
} from "./adminApi";
import { getEntitlements, type Entitlements } from "@/lib/api";
import { primeEntitlementsCache } from "@/lib/entitlements";
import {
  SectionHeader,
  Panel,
  Pill,
  Toggle,
  LoadingState,
  ErrorState,
  EmptyState,
} from "./ui";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useToast } from "@/components/Toast";

// ---- per-tier limit form (strings for numeric inputs; blank listingLimit = unlimited) ----
interface LimitForm {
  listingLimit: string;
  leadQuotaPerCycle: string;
  featuredCreditsPerCycle: string;
  perLeadPrice: string;
  verifiedBadgeIncluded: boolean;
  analyticsEnabled: boolean;
}

function limitsToForm(l: Entitlements["tiers"][number]["limits"]): LimitForm {
  return {
    listingLimit: l.listingLimit == null ? "" : String(l.listingLimit),
    leadQuotaPerCycle: String(l.leadQuotaPerCycle ?? 0),
    featuredCreditsPerCycle: String(l.featuredCreditsPerCycle ?? 0),
    perLeadPrice: String(l.perLeadPrice ?? 0),
    verifiedBadgeIncluded: !!l.verifiedBadgeIncluded,
    analyticsEnabled: !!l.analyticsEnabled,
  };
}

function formToInput(f: LimitForm): EntitlementLimitsInput {
  return {
    listingLimit: f.listingLimit.trim() === "" ? null : Number(f.listingLimit),
    leadQuotaPerCycle: Number(f.leadQuotaPerCycle) || 0,
    featuredCreditsPerCycle: Number(f.featuredCreditsPerCycle) || 0,
    perLeadPrice: Number(f.perLeadPrice) || 0,
    verifiedBadgeIncluded: f.verifiedBadgeIncluded,
    analyticsEnabled: f.analyticsEnabled,
  };
}

const samePlans = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join(",") === [...b].sort().join(",");

const sameLimits = (a: LimitForm, b: LimitForm) =>
  a.listingLimit === b.listingLimit &&
  a.leadQuotaPerCycle === b.leadQuotaPerCycle &&
  a.featuredCreditsPerCycle === b.featuredCreditsPerCycle &&
  a.perLeadPrice === b.perLeadPrice &&
  a.verifiedBadgeIncluded === b.verifiedBadgeIncluded &&
  a.analyticsEnabled === b.analyticsEnabled;

// ---- matrix cell: filled check when the tier is included, empty circle otherwise ----
function MatrixToggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-bg-subtle"
      style={{ color: on ? "var(--brand)" : "var(--faint)" }}
    >
      {on ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="var(--brand)" />
          <path
            d="M7.5 12.5l3 3 6-6.5"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
    </button>
  );
}

export default function EntitlementsTab() {
  const { addToast } = useToast();

  const [ent, setEnt] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // editable working copy
  const [featurePlans, setFeaturePlans] = useState<Record<string, string[]>>({});
  const [limits, setLimits] = useState<Record<string, LimitForm>>({});
  // originals (for diffing on save)
  const [origPlans, setOrigPlans] = useState<Record<string, string[]>>({});
  const [origLimits, setOrigLimits] = useState<Record<string, LimitForm>>({});

  function hydrate(data: Entitlements) {
    const fp: Record<string, string[]> = {};
    for (const f of data.features) fp[f.id] = [...(f.plans || [])];
    const lm: Record<string, LimitForm> = {};
    for (const t of data.tiers) lm[t.key] = limitsToForm(t.limits);
    setEnt(data);
    setFeaturePlans(fp);
    setLimits(lm);
    setOrigPlans(JSON.parse(JSON.stringify(fp)));
    setOrigLimits(JSON.parse(JSON.stringify(lm)));
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      hydrate(await getEntitlements());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entitlements");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const tiers = ent?.tiers ?? [];

  // Features grouped by `group`, preserving the backend's group order.
  const grouped = useMemo(() => {
    const map = new Map<string, Entitlements["features"]>();
    for (const f of ent?.features ?? []) {
      const g = f.group || "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(f);
    }
    return Array.from(map.entries());
  }, [ent]);

  function toggleCell(featureId: string, tierKey: string) {
    setFeaturePlans((prev) => {
      const cur = prev[featureId] || [];
      const next = cur.includes(tierKey)
        ? cur.filter((t) => t !== tierKey)
        : [...cur, tierKey];
      return { ...prev, [featureId]: next };
    });
  }

  function setLimitField<K extends keyof LimitForm>(
    tierKey: string,
    field: K,
    value: LimitForm[K]
  ) {
    setLimits((prev) => ({
      ...prev,
      [tierKey]: { ...prev[tierKey], [field]: value },
    }));
  }

  // --- diff: which feature plans + which tier limits actually changed ---
  const changedFeatureIds = useMemo(
    () =>
      Object.keys(featurePlans).filter(
        (id) => !samePlans(featurePlans[id], origPlans[id] || [])
      ),
    [featurePlans, origPlans]
  );
  const changedTierKeys = useMemo(
    () =>
      Object.keys(limits).filter(
        (k) => origLimits[k] && !sameLimits(limits[k], origLimits[k])
      ),
    [limits, origLimits]
  );
  const dirty = changedFeatureIds.length > 0 || changedTierKeys.length > 0;

  async function save() {
    if (!dirty) {
      addToast("No changes to save", "info");
      return;
    }
    setSaving(true);
    try {
      const body: EntitlementsSaveBody = {};
      if (changedFeatureIds.length) {
        body.features = changedFeatureIds.map((id) => ({
          id,
          plans: featurePlans[id],
        }));
      }
      if (changedTierKeys.length) {
        body.planLimits = {};
        for (const k of changedTierKeys) body.planLimits[k] = formToInput(limits[k]);
      }
      const fresh = await saveEntitlements(body);
      hydrate(fresh);
      primeEntitlementsCache(fresh); // keep runtime gating in sync
      addToast("Entitlements saved", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Entitlements"
        subtitle="The Feature × Tier access matrix — decide who gets what, no code. Toggle a cell to include a feature in a tier; edit per-tier limits below."
        actions={
          <Button variant="brand" disabled={saving || !dirty} onClick={save}>
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading entitlements…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !ent || ent.features.length === 0 ? (
        <EmptyState
          title="No features"
          hint="Add features in the Features tab — they appear here automatically."
        />
      ) : (
        <div className="space-y-6">
          {/* ---------------------------------------------------- The matrix -- */}
          <Panel
            title="Feature access matrix"
            desc="A filled check means that tier includes the feature. Changes apply after Save."
          >
            <div
              className="overflow-x-auto rounded-xl border border-border bg-canvas"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-bg-subtle">
                    <th className="sticky left-0 z-10 min-w-[220px] whitespace-nowrap border-b border-border bg-bg-subtle px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      Feature
                    </th>
                    {tiers.map((t) => (
                      <th
                        key={t.key}
                        className="whitespace-nowrap border-b border-border px-3.5 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted"
                      >
                        {t.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([group, items]) => (
                    <React.Fragment key={group}>
                      <tr>
                        <td
                          colSpan={tiers.length + 1}
                          className="border-b border-border bg-bg-subtle px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-faint"
                        >
                          {group}
                        </td>
                      </tr>
                      {items.map((f) => {
                        const plans = featurePlans[f.id] || [];
                        return (
                          <tr key={f.id} className="transition-colors hover:bg-bg-subtle">
                            <td className="sticky left-0 z-10 min-w-[220px] border-b border-border bg-canvas px-3.5 py-2.5 align-top">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink">{f.name}</span>
                                {f.status && f.status !== "live" && (
                                  <Pill status={f.status}>{f.status}</Pill>
                                )}
                              </div>
                              {f.description && (
                                <div className="mt-0.5 max-w-[360px] text-xs text-muted">
                                  {f.description}
                                </div>
                              )}
                            </td>
                            {tiers.map((t) => (
                              <td
                                key={t.key}
                                className="border-b border-border px-3.5 py-2.5 text-center align-middle"
                              >
                                <MatrixToggle
                                  on={plans.includes(t.key)}
                                  onClick={() => toggleCell(f.id, t.key)}
                                  label={`${plans.includes(t.key) ? "Remove" : "Add"} ${f.name} ${
                                    plans.includes(t.key) ? "from" : "to"
                                  } ${t.name}`}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* --------------------------------------------------- Plan limits -- */}
          <Panel
            title="Plan limits"
            desc="Per-cycle quotas and included capabilities for each tier. Blank listing limit = unlimited."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tiers.map((t) => {
                const lf = limits[t.key];
                if (!lf) return null;
                return (
                  <div key={t.key} className="rounded-xl border border-border bg-canvas p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[15px] font-bold text-ink">{t.name}</span>
                      <Pill status={t.key}>{t.key}</Pill>
                      {t.limits.priceInfo?.label && (
                        <span className="ml-auto text-xs text-faint">
                          {t.limits.priceInfo.label}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Listing limit"
                        type="number"
                        value={lf.listingLimit}
                        onChange={(e) =>
                          setLimitField(t.key, "listingLimit", e.target.value)
                        }
                        hint="Blank = unlimited"
                      />
                      <Input
                        label="Lead quota / cycle"
                        type="number"
                        value={lf.leadQuotaPerCycle}
                        onChange={(e) =>
                          setLimitField(t.key, "leadQuotaPerCycle", e.target.value)
                        }
                      />
                      <Input
                        label="Featured credits / cycle"
                        type="number"
                        value={lf.featuredCreditsPerCycle}
                        onChange={(e) =>
                          setLimitField(t.key, "featuredCreditsPerCycle", e.target.value)
                        }
                      />
                      <Input
                        label="Per-lead price (₹)"
                        type="number"
                        value={lf.perLeadPrice}
                        onChange={(e) =>
                          setLimitField(t.key, "perLeadPrice", e.target.value)
                        }
                      />
                    </div>
                    <div className="mt-3 grid gap-2">
                      <Toggle
                        label="Verified badge included"
                        checked={lf.verifiedBadgeIncluded}
                        onChange={(v) =>
                          setLimitField(t.key, "verifiedBadgeIncluded", v)
                        }
                      />
                      <Toggle
                        label="Analytics enabled"
                        checked={lf.analyticsEnabled}
                        onChange={(v) => setLimitField(t.key, "analyticsEnabled", v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* footer save (mirrors header, handy after scrolling the matrix) */}
          <div className="flex items-center justify-end gap-3">
            {dirty && (
              <span className="text-xs text-muted">
                {changedFeatureIds.length} feature
                {changedFeatureIds.length === 1 ? "" : "s"} · {changedTierKeys.length}{" "}
                tier limit{changedTierKeys.length === 1 ? "" : "s"} changed
              </span>
            )}
            <Button variant="brand" disabled={saving || !dirty} onClick={save}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
