"use client";

// components/admin/CategoriesTab.tsx — no-code taxonomy editor.
// getCategories() (flat) → nested tree; adminCreateCategory / adminUpdateCategory / adminDeleteCategory.

import React, { useEffect, useMemo, useState } from "react";
import type { Category } from "@/lib/types";
import {
  getCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
} from "./adminApi";
import {
  getCategorySuggestions,
  approveCategorySuggestion,
  mergeCategorySuggestion,
  rejectCategorySuggestion,
} from "@/lib/api";
import type { CategorySuggestion } from "@/lib/api";
import {
  SectionHeader,
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

interface TreeNode extends Category {
  kids: TreeNode[];
}

function buildTree(flat: Category[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  flat.forEach((c) => map.set(c.id, { ...c, kids: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.kids.push(node);
    } else {
      roots.push(node);
    }
  });
  const sort = (arr: TreeNode[]) => {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    arr.forEach((n) => sort(n.kids));
  };
  sort(roots);
  return roots;
}

type ModalMode =
  | { kind: "create"; parent: Category | null }
  | { kind: "edit"; node: Category }
  | null;

export default function CategoriesTab() {
  const { addToast } = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState({
    name: "",
    type: "both" as "product" | "service" | "both",
    description: "",
    icon: "",
    order: "0",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---- Category suggestions ("Other / not listed") ----
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [sugLoading, setSugLoading] = useState(true);
  // Per-row admin choices, keyed by suggestion id.
  const [parentChoice, setParentChoice] = useState<Record<string, string>>({});
  const [mergeChoice, setMergeChoice] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCats(await getCategories());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }
  async function loadSuggestions() {
    setSugLoading(true);
    try {
      setSuggestions(await getCategorySuggestions("pending"));
    } catch {
      // Non-fatal: the taxonomy editor still works without the queue.
      setSuggestions([]);
    } finally {
      setSugLoading(false);
    }
  }
  useEffect(() => {
    void load();
    void loadSuggestions();
  }, []);

  // Flat, alphabetized options for the parent / merge-target selects.
  const catOptions = useMemo(
    () =>
      cats
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.id, label: `${c.name} · /${c.slug}` })),
    [cats]
  );

  async function approveSuggestion(s: CategorySuggestion) {
    setActingId(s.id);
    try {
      await approveCategorySuggestion(s.id, parentChoice[s.id] || undefined);
      addToast(`Created category “${s.name}”`, "success");
      await Promise.all([load(), loadSuggestions()]);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Approve failed", "error");
    } finally {
      setActingId(null);
    }
  }
  async function mergeSuggestion(s: CategorySuggestion) {
    const target = mergeChoice[s.id];
    if (!target) {
      addToast("Choose a category to merge into", "error");
      return;
    }
    setActingId(s.id);
    try {
      await mergeCategorySuggestion(s.id, target);
      addToast(`Merged “${s.name}”`, "success");
      await loadSuggestions();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Merge failed", "error");
    } finally {
      setActingId(null);
    }
  }
  async function rejectSuggestion(s: CategorySuggestion) {
    setActingId(s.id);
    try {
      await rejectCategorySuggestion(s.id);
      addToast(`Rejected “${s.name}”`, "success");
      await loadSuggestions();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Reject failed", "error");
    } finally {
      setActingId(null);
    }
  }

  const tree = useMemo(() => buildTree(cats), [cats]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(parent: Category | null) {
    setModal({ kind: "create", parent });
    setForm({
      name: "",
      type: (parent?.type as "product" | "service" | "both") || "both",
      description: "",
      icon: "",
      order: "0",
    });
  }
  function openEdit(node: Category) {
    setModal({ kind: "edit", node });
    setForm({
      name: node.name,
      type: node.type,
      description: node.description || "",
      icon: node.icon || "",
      order: String(node.order ?? 0),
    });
  }

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.kind === "create") {
        await adminCreateCategory({
          name: form.name.trim(),
          parentId: modal.parent?.id ?? null,
          type: form.type,
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
          order: Number(form.order) || 0,
        });
        addToast("Category created", "success");
        if (modal.parent) {
          setExpanded((prev) => new Set(prev).add(modal.parent!.id));
        }
      } else {
        await adminUpdateCategory(modal.node.id, {
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim(),
          icon: form.icon.trim() || undefined,
          order: Number(form.order) || 0,
        });
        addToast("Category updated", "success");
      }
      setModal(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await adminDeleteCategory(confirmDel.id);
      addToast("Category deleted", "success");
      setConfirmDel(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const hasKids = node.kids.length > 0;
    const isOpen = expanded.has(node.id);
    return (
      <React.Fragment key={node.id}>
        <div
          className="flex items-center gap-2 border-b border-border py-2.5 pr-2 hover:bg-bg-subtle"
          style={{ paddingLeft: 12 + depth * 22 }}
        >
          <button
            type="button"
            onClick={() => hasKids && toggle(node.id)}
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${
              hasKids ? "text-muted hover:bg-border" : "invisible"
            }`}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              style={{
                transform: isOpen ? "rotate(90deg)" : "none",
                transition: "transform 120ms ease",
              }}
            >
              <path d="M4 2.5L8 6L4 9.5" />
            </svg>
          </button>

          {node.icon && <span className="text-sm">{node.icon}</span>}
          <span className="font-medium text-ink">{node.name}</span>
          <span className="text-xs text-faint">/{node.slug}</span>
          <Pill status={node.type}>{node.type}</Pill>
          {typeof node.listingCount === "number" && node.listingCount > 0 && (
            <span className="text-xs text-muted">
              {node.listingCount} listing{node.listingCount === 1 ? "" : "s"}
            </span>
          )}

          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openCreate(node)}
              title="Add sub-category"
            >
              + Sub
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openEdit(node)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDel(node)}
              className="text-error"
            >
              Delete
            </Button>
          </div>
        </div>
        {hasKids && isOpen && node.kids.map((k) => renderNode(k, depth + 1))}
      </React.Fragment>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Categories"
        subtitle="The taxonomy tree. Add, rename, retype or remove nodes — no code."
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setExpanded(new Set(cats.map((c) => c.id)))
              }
            >
              Expand all
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setExpanded(new Set())}
            >
              Collapse all
            </Button>
            <Button variant="brand" onClick={() => openCreate(null)}>
              + Root category
            </Button>
          </>
        }
      />

      {loading ? (
        <LoadingState label="Loading categories…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : tree.length === 0 ? (
        <EmptyState title="No categories" hint="Create your first root category." />
      ) : (
        <div
          className="overflow-hidden rounded-xl border border-border bg-canvas"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {tree.map((n) => renderNode(n, 0))}
        </div>
      )}

      {/* ---------------- Category suggestions ("Other / not listed") --------------- */}
      <div style={{ marginTop: 32 }}>
        <SectionHeader
          title="Category suggestions"
          subtitle="Seller ideas for categories we don’t have yet. Approve one as a new category, merge it into an existing one, or reject it."
          actions={
            <Button size="sm" variant="secondary" onClick={loadSuggestions}>
              Refresh
            </Button>
          }
        />

        {sugLoading ? (
          <LoadingState label="Loading suggestions…" />
        ) : suggestions.length === 0 ? (
          <EmptyState
            title="No pending suggestions"
            hint="When sellers pick “Other” and name a category, it shows up here."
          />
        ) : (
          <div
            className="overflow-hidden rounded-xl border border-border bg-canvas"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {suggestions.map((s) => {
              const busy = actingId === s.id;
              return (
                <div
                  key={s.id}
                  className="border-b border-border p-4 last:border-b-0"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{s.name}</span>
                    {s.count > 1 && (
                      <Pill tone="blue">{s.count} requests</Pill>
                    )}
                    <span className="text-xs text-faint">
                      by {s.suggestedBy} ·{" "}
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {s.note && (
                    <p className="mb-3 text-sm text-muted">“{s.note}”</p>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    {/* Approve as new (optional parent) */}
                    <div className="flex items-end gap-2">
                      <Select
                        containerClassName="min-w-[200px]"
                        label="Approve as new — parent"
                        value={parentChoice[s.id] || ""}
                        placeholder="Top level (no parent)"
                        onChange={(e) =>
                          setParentChoice((prev) => ({
                            ...prev,
                            [s.id]: e.target.value,
                          }))
                        }
                        options={catOptions}
                      />
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={busy}
                        onClick={() => approveSuggestion(s)}
                      >
                        Approve as new
                      </Button>
                    </div>

                    {/* Merge into an existing category */}
                    <div className="flex items-end gap-2">
                      <Select
                        containerClassName="min-w-[200px]"
                        label="Merge into…"
                        value={mergeChoice[s.id] || ""}
                        placeholder="Choose category…"
                        onChange={(e) =>
                          setMergeChoice((prev) => ({
                            ...prev,
                            [s.id]: e.target.value,
                          }))
                        }
                        options={catOptions}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy || !mergeChoice[s.id]}
                        onClick={() => mergeSuggestion(s)}
                      >
                        Merge
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error sm:ml-auto"
                      disabled={busy}
                      onClick={() => rejectSuggestion(s)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.kind === "edit"
            ? `Edit — ${modal.node.name}`
            : modal?.kind === "create" && modal.parent
            ? `Add under “${modal.parent.name}”`
            : "New root category"
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={saving || !form.name.trim()}
              onClick={save}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Industrial Machinery"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as "product" | "service" | "both",
                })
              }
              options={[
                { value: "both", label: "Both" },
                { value: "product", label: "Product" },
                { value: "service", label: "Service" },
              ]}
            />
            <Input
              label="Order"
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
            />
          </div>
          <Input
            label="Icon (optional)"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            placeholder="Optional"
          />
          <Textarea
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {modal?.kind === "create" && (
            <p className="text-xs text-faint">
              Slug is auto-generated from the name on the server.
            </p>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Delete category"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDel(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={deleting} onClick={doDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Delete <b>{confirmDel?.name}</b>? Categories with sub-categories must be
          emptied first.
        </p>
      </Modal>
    </div>
  );
}
