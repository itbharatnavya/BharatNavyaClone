"use client";

// components/admin/RecruitmentTaxonomyTab.tsx — no-code editor for Recruitment's
// flat, admin-editable taxonomy (RECRUITMENT.md §2): Job Functions, Job Roles and
// Skills. Each is a flat list (deliberately not a tree like Directory's Categories),
// so one shared list+modal view handles all three via a small per-kind config,
// mirroring CategoriesTab.tsx's create/edit/delete pattern.

import React, { useEffect, useMemo, useState } from "react";
import type { JobFunction, JobRole, Skill } from "@/lib/types";
import {
  adminGetJobFunctions,
  adminCreateJobFunction,
  adminUpdateJobFunction,
  adminDeleteJobFunction,
  adminGetJobRoles,
  adminCreateJobRole,
  adminUpdateJobRole,
  adminDeleteJobRole,
  adminGetSkills,
  adminCreateSkill,
  adminUpdateSkill,
  adminDeleteSkill,
} from "./adminApi";
import { SectionHeader, FilterTabs, Pill, LoadingState, ErrorState, EmptyState } from "./ui";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { useToast } from "@/components/Toast";

type Kind = "functions" | "roles" | "skills";

interface Row {
  id: string;
  label: string; // name (functions/skills) or title (roles)
  jobFunction: string | null;
  order: number;
  isActive: boolean;
}

const KIND_TABS: { value: Kind; label: string }[] = [
  { value: "functions", label: "Job Functions" },
  { value: "roles", label: "Job Roles" },
  { value: "skills", label: "Skills" },
];

function toRows(kind: Kind, data: (JobFunction | JobRole | Skill)[]): Row[] {
  return data.map((d) => ({
    id: d.id,
    label: "title" in d ? d.title : d.name,
    jobFunction: "jobFunction" in d ? d.jobFunction : null,
    order: d.order,
    isActive: d.isActive,
  }));
}

export default function RecruitmentTaxonomyTab() {
  const { addToast } = useToast();
  const [kind, setKind] = useState<Kind>("functions");
  const [rows, setRows] = useState<Row[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<{ kind: "create" } | { kind: "edit"; row: Row } | null>(null);
  const [form, setForm] = useState({ label: "", jobFunction: "", order: "0" });
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (kind === "functions") setRows(toRows(kind, await adminGetJobFunctions()));
      else if (kind === "roles") setRows(toRows(kind, await adminGetJobRoles()));
      else setRows(toRows(kind, await adminGetSkills()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // job-function picker (for roles/skills) always reflects the live Job Functions list
    void adminGetJobFunctions().then(setJobFunctions).catch(() => setJobFunctions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const jobFunctionOptions = useMemo(
    () => jobFunctions.map((f) => ({ value: f.slug, label: f.name })),
    [jobFunctions]
  );
  const hasJobFunctionPicker = kind !== "functions";
  const kindLabel = KIND_TABS.find((t) => t.value === kind)?.label || "";

  function openCreate() {
    setModal({ kind: "create" });
    setForm({ label: "", jobFunction: "", order: "0" });
  }
  function openEdit(row: Row) {
    setModal({ kind: "edit", row });
    setForm({ label: row.label, jobFunction: row.jobFunction || "", order: String(row.order ?? 0) });
  }

  async function save() {
    if (!modal) return;
    setSaving(true);
    try {
      const order = Number(form.order) || 0;
      const jobFunction = hasJobFunctionPicker ? form.jobFunction || null : undefined;
      if (modal.kind === "create") {
        if (kind === "functions") await adminCreateJobFunction({ name: form.label.trim(), order });
        else if (kind === "roles")
          await adminCreateJobRole({ title: form.label.trim(), jobFunction, order });
        else await adminCreateSkill({ name: form.label.trim(), jobFunction, order });
        addToast(`${kindLabel.slice(0, -1)} created`, "success");
      } else {
        if (kind === "functions") await adminUpdateJobFunction(modal.row.id, { name: form.label.trim(), order });
        else if (kind === "roles")
          await adminUpdateJobRole(modal.row.id, { title: form.label.trim(), jobFunction, order });
        else await adminUpdateSkill(modal.row.id, { name: form.label.trim(), jobFunction, order });
        addToast(`${kindLabel.slice(0, -1)} updated`, "success");
      }
      setModal(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: Row) {
    try {
      const patch = { isActive: !row.isActive };
      if (kind === "functions") await adminUpdateJobFunction(row.id, patch);
      else if (kind === "roles") await adminUpdateJobRole(row.id, patch);
      else await adminUpdateSkill(row.id, patch);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Update failed", "error");
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      if (kind === "functions") await adminDeleteJobFunction(confirmDel.id);
      else if (kind === "roles") await adminDeleteJobRole(confirmDel.id);
      else await adminDeleteSkill(confirmDel.id);
      addToast(`${kindLabel.slice(0, -1)} deleted`, "success");
      setConfirmDel(null);
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Taxonomy"
        subtitle="Job Functions, Job Roles and Skills — the flat picklists behind job posting and candidate profiles."
        actions={
          <Button variant="brand" onClick={openCreate}>
            + {kindLabel.slice(0, -1)}
          </Button>
        }
      />

      <div className="mb-4">
        <FilterTabs tabs={KIND_TABS} value={kind} onChange={(v) => setKind(v as Kind)} />
      </div>

      {loading ? (
        <LoadingState label={`Loading ${kindLabel.toLowerCase()}…`} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState title={`No ${kindLabel.toLowerCase()}`} hint="Add the first one." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-canvas" style={{ boxShadow: "var(--shadow-card)" }}>
          {rows
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-bg-subtle"
              >
                <span className="font-medium text-ink">{row.label}</span>
                {hasJobFunctionPicker && row.jobFunction && (
                  <span className="text-xs text-faint">
                    · {jobFunctions.find((f) => f.slug === row.jobFunction)?.name || row.jobFunction}
                  </span>
                )}
                {!row.isActive && <Pill tone="gray">Inactive</Pill>}
                <div className="ml-auto flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(row)}>
                    {row.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-error" onClick={() => setConfirmDel(row)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create / edit modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.kind === "edit" ? `Edit — ${modal.row.label}` : `New ${kindLabel.slice(0, -1)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button variant="brand" disabled={saving || !form.label.trim()} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={kind === "roles" ? "Title" : "Name"}
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder={kind === "roles" ? "Backend Engineer" : kind === "skills" ? "Node.js" : "Engineering"}
            required
          />
          {hasJobFunctionPicker && (
            <Select
              label="Job function (optional)"
              value={form.jobFunction}
              placeholder="None"
              onChange={(e) => setForm({ ...form, jobFunction: e.target.value })}
              options={jobFunctionOptions}
            />
          )}
          <Input
            label="Order"
            type="number"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: e.target.value })}
          />
          {modal?.kind === "create" && (
            <p className="text-xs text-faint">Slug is auto-generated from the name on the server.</p>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title={`Delete ${kindLabel.slice(0, -1).toLowerCase()}`}
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
          Delete <b>{confirmDel?.label}</b>? This can&apos;t be undone.
        </p>
      </Modal>
    </div>
  );
}
