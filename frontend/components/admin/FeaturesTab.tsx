"use client";

// components/admin/FeaturesTab.tsx — the living Feature Catalog (what the SALES team reads).
// getFeatures() grouped by `group`; adminCreateFeature / adminUpdateFeature / adminDeleteFeature.
// Shows audience / plans / status / phase.

import React, { useEffect, useMemo, useState } from "react";
import {
  getFeatures,
  adminCreateFeature,
  adminUpdateFeature,
  adminDeleteFeature,
  type Feature,
  type FeatureInput,
} from "./adminApi";
import {
  SectionHeader,
  Panel,
  AdminTable,
  Row,
  Td,
  Pill,
  LoadingState,
  ErrorState,
  EmptyState,
} from "./ui";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import { useToast } from "@/components/Toast";

const ALL_PLANS = ["free", "silver", "gold"];

interface FForm {
  name: string;
  group: string;
  description: string;
  audience: string;
  plans: string[];
  status: string;
  phase: string;
}
const EMPTY: FForm = {
  name: "",
  group: "",
  description: "",
  audience: "all",
  plans: [...ALL_PLANS],
  status: "live",
  phase: "1",
};

export default function FeaturesTab() {
  const { addToast } = useToast();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Feature | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setFeatures(await getFeatures());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load features");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Feature[]>();
    for (const f of features) {
      const g = f.group || "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(f);
    }
    return Array.from(map.entries());
  }, [features]);

  const knownGroups = useMemo(
    () => Array.from(new Set(features.map((f) => f.group))).sort(),
    [features]
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(f: Feature) {
    setEditingId(f.id);
    setForm({
      name: f.name,
      group: f.group,
      description: f.description || "",
      audience: f.audience || "all",
      plans: f.plans?.length ? f.plans : [...ALL_PLANS],
      status: f.status || "live",
      phase: String(f.phase ?? 1),
    });
    setOpen(true);
  }

  function togglePlan(p: string) {
    setForm((f) => ({
      ...f,
      plans: f.plans.includes(p)
        ? f.plans.filter((x) => x !== p)
        : [...f.plans, p],
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: FeatureInput = {
        name: form.name.trim(),
        group: form.group.trim(),
        description: form.description.trim(),
        audience: form.audience,
        plans: form.plans,
        status: form.status,
        phase: Number(form.phase) || 1,
      };
      if (editingId) {
        await adminUpdateFeature(editingId, body);
        addToast("Feature updated", "success");
      } else {
        await adminCreateFeature(body);
        addToast("Feature added", "success");
      }
      setOpen(false);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    try {
      await adminDeleteFeature(confirmDel.id);
      addToast("Feature removed", "success");
      setConfirmDel(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Delete failed", "error");
    }
  }

  return (
    <div>
      <SectionHeader
        title="Features"
        subtitle="The living capability catalog — grouped by area. Powers /features, and keeps sales current."
        actions={
          <Button variant="brand" onClick={openCreate}>
            + Add feature
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading features…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : features.length === 0 ? (
        <EmptyState title="No features" hint="Add the first feature." />
      ) : (
        <div className="space-y-5">
          {grouped.map(([group, items]) => (
            <Panel
              key={group}
              title={group}
              right={
                <span className="text-xs text-faint">{items.length}</span>
              }
            >
              <AdminTable
                columns={[
                  "Feature",
                  "Audience",
                  "Plans",
                  "Status",
                  "Phase",
                  "Actions",
                ]}
              >
                {items.map((f) => (
                  <Row key={f.id}>
                    <Td>
                      <div className="font-semibold text-ink">{f.name}</div>
                      {f.description && (
                        <div className="max-w-[420px] text-xs text-muted">
                          {f.description}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Pill tone="blue">{f.audience}</Pill>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {(f.plans || []).map((p) => (
                          <Pill key={p} status={p}>
                            {p}
                          </Pill>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <Pill status={f.status}>{f.status}</Pill>
                    </Td>
                    <Td className="text-muted">{f.phase}</Td>
                    <Td>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(f)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-error"
                          onClick={() => setConfirmDel(f)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Td>
                  </Row>
                ))}
              </AdminTable>
            </Panel>
          ))}
        </div>
      )}

      {/* Add / edit modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit feature" : "Add feature"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={saving || !form.name.trim() || !form.group.trim()}
              onClick={save}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="AI Listing Auto-fill"
              required
            />
            <Input
              label="Group"
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value })}
              placeholder="Marketplace Listings"
              list="feature-groups"
              required
            />
            <datalist id="feature-groups">
              {knownGroups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Audience"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              options={[
                { value: "all", label: "All" },
                { value: "seller", label: "Seller" },
                { value: "buyer", label: "Buyer" },
                { value: "admin", label: "Admin" },
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "live", label: "Live" },
                { value: "beta", label: "Beta" },
                { value: "planned", label: "Planned" },
              ]}
            />
            <Input
              label="Phase"
              type="number"
              value={form.phase}
              onChange={(e) => setForm({ ...form, phase: e.target.value })}
            />
          </div>
          <div>
            <span className="field-label">Included in plans</span>
            <div className="flex flex-wrap gap-2">
              {ALL_PLANS.map((p) => {
                const on = form.plans.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePlan(p)}
                    className={`chip capitalize ${on ? "chip-active" : ""}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Remove feature"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDel(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={doDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Remove <b>{confirmDel?.name}</b> from the catalog?
        </p>
      </Modal>
    </div>
  );
}
