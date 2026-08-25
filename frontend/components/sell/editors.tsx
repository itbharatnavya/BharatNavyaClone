"use client";

// Reusable field editors for the /sell create-listing flow.
// Small, self-contained building blocks styled with the shared design system
// (.card / .input / .chip / .field-label). No external state libraries.

import React, { useId, useState } from "react";
import type { PriceTier, RateCardItem, JobQuestion, CandidateEducation, CandidateWorkHistory } from "@/lib/types";

// Small inline "remove/close" icon shared by the row editors below.
function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// ------------------------------------------------------------
// Section — a labelled panel that groups related fields.
// ------------------------------------------------------------
export function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card card-flat card-pad" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
          {title}
        </h3>
        {desc && (
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            {desc}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

// ------------------------------------------------------------
// TagInput — comma/enter to add chips (keywords, cities, credentials).
// ------------------------------------------------------------
export function TagInput({
  label,
  hint,
  value,
  onChange,
  placeholder,
  suggestions,
}: {
  label?: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  // Optional static picklist (e.g. /api/skills) shown as native browser autocomplete —
  // a <datalist>, not a custom dropdown, per CLAUDE.md's "prefer native controls"
  // guidance. Purely a suggestion: typing anything not in the list and pressing
  // Enter/comma still adds it as a plain custom chip, same as today.
  suggestions?: string[];
}) {
  const [text, setText] = useState("");
  const datalistId = useId();

  const commit = () => {
    const parts = text
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length) {
      const merged = Array.from(new Set([...value, ...parts]));
      onChange(merged);
    }
    setText("");
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  return (
    <div>
      {label && <label className="field-label">{label}</label>}
      <div
        className="input"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          minHeight: 44,
          height: "auto",
          alignItems: "center",
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="badge badge-neutral"
            style={{ paddingRight: 4 }}
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => remove(tag)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--muted)",
                lineHeight: 0,
                padding: "0 2px",
              }}
            >
              <XIcon size={12} />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !text && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={commit}
          placeholder={value.length ? "" : placeholder}
          list={suggestions?.length ? datalistId : undefined}
          style={{
            flex: 1,
            minWidth: 120,
            border: "none",
            outline: "none",
            fontSize: 14,
            background: "transparent",
            color: "var(--ink)",
          }}
        />
      </div>
      {suggestions?.length ? (
        <datalist id={datalistId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

// ------------------------------------------------------------
// KeyValueEditor — specifications (key → value rows).
// Keeps its own row state so blank/duplicate keys are editable mid-typing.
// ------------------------------------------------------------
interface KVRow {
  k: string;
  v: string;
}
export function KeyValueEditor({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const [rows, setRows] = useState<KVRow[]>(() => {
    const entries = Object.entries(value || {}).map(([k, v]) => ({ k, v }));
    return entries.length ? entries : [{ k: "", v: "" }];
  });

  const sync = (next: KVRow[]) => {
    setRows(next);
    const rec: Record<string, string> = {};
    next.forEach(({ k, v }) => {
      const key = k.trim();
      if (key) rec[key] = v;
    });
    onChange(rec);
  };

  const update = (i: number, patch: Partial<KVRow>) =>
    sync(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => sync([...rows, { k: "", v: "" }]);
  const removeRow = (i: number) =>
    sync(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [{ k: "", v: "" }]);

  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            className="input"
            placeholder="Attribute (e.g. Material)"
            value={row.k}
            onChange={(e) => update(i, { k: e.target.value })}
            style={{ flex: 1 }}
          />
          <input
            className="input"
            placeholder="Value (e.g. Stainless Steel 304)"
            value={row.v}
            onChange={(e) => update(i, { v: e.target.value })}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Remove row"
            onClick={() => removeRow(i)}
          >
            <XIcon />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
        + Add attribute
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// TierEditor — quantity price ladder (PriceTier[]).
// ------------------------------------------------------------
export function TierEditor({
  value,
  onChange,
}: {
  value: PriceTier[];
  onChange: (next: PriceTier[]) => void;
}) {
  const update = (i: number, patch: Partial<PriceTier>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    onChange([...value, { minQty: 1, maxQty: null, price: 0, unit: "" }]);
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {value.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
            gap: 8,
            marginBottom: 6,
            fontSize: 12,
            color: "var(--muted)",
            fontWeight: 600,
          }}
        >
          <span>Min qty</span>
          <span>Max qty</span>
          <span>Price (₹)</span>
          <span>Unit</span>
          <span />
        </div>
      )}
      {value.map((row, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <input
            className="input"
            type="number"
            min={1}
            value={row.minQty}
            onChange={(e) => update(i, { minQty: Number(e.target.value) })}
          />
          <input
            className="input"
            type="number"
            placeholder="∞"
            value={row.maxQty ?? ""}
            onChange={(e) =>
              update(i, {
                maxQty: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
          <input
            className="input"
            type="number"
            min={0}
            value={row.price}
            onChange={(e) => update(i, { price: Number(e.target.value) })}
          />
          <input
            className="input"
            placeholder="per pc"
            value={row.unit ?? ""}
            onChange={(e) => update(i, { unit: e.target.value })}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Remove tier"
            onClick={() => removeRow(i)}
          >
            <XIcon />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
        + Add price tier
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// RateCardEditor — service rate-card (RateCardItem[]).
// ------------------------------------------------------------
export function RateCardEditor({
  value,
  onChange,
}: {
  value: RateCardItem[];
  onChange: (next: RateCardItem[]) => void;
}) {
  const update = (i: number, patch: Partial<RateCardItem>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    onChange([...value, { label: "", price: 0, unit: "" }]);
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {value.map((row, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr auto",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <input
            className="input"
            placeholder="Service (e.g. GST filing)"
            value={row.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Price ₹"
            value={row.price}
            onChange={(e) => update(i, { price: Number(e.target.value) })}
          />
          <input
            className="input"
            placeholder="per filing / hr"
            value={row.unit ?? ""}
            onChange={(e) => update(i, { unit: e.target.value })}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Remove rate"
            onClick={() => removeRow(i)}
          >
            <XIcon />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
        + Add rate-card item
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// QuestionsEditor — recruiter-defined per-job screening questions (Recruitment
// enhancement doc §7). A TagInput chip can't carry the "required" checkbox each
// question needs, so this is its own small row editor, same shape as RateCardEditor.
// ------------------------------------------------------------
export function QuestionsEditor({
  value,
  onChange,
}: {
  value: JobQuestion[];
  onChange: (next: JobQuestion[]) => void;
}) {
  const update = (i: number, patch: Partial<JobQuestion>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    onChange([...value, { id: `new_${Date.now()}_${value.length}`, text: "", required: false }]);
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {value.map((row, i) => (
        <div key={row.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="e.g. Are you willing to relocate?"
            value={row.text}
            onChange={(e) => update(i, { text: e.target.value })}
            maxLength={300}
            style={{ flex: 1 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)", flexShrink: 0, whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={row.required} onChange={(e) => update(i, { required: e.target.checked })} />
            Required
          </label>
          <button type="button" className="btn btn-ghost btn-sm" aria-label="Remove question" onClick={() => removeRow(i)}>
            <XIcon />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} disabled={value.length >= 20}>
        + Add question
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// WorkHistoryEditor — candidate's per-company work history (build plan §2). Same row-
// editor shape as RateCardEditor/QuestionsEditor.
// ------------------------------------------------------------
export function WorkHistoryEditor({
  value,
  onChange,
}: {
  value: CandidateWorkHistory[];
  onChange: (next: CandidateWorkHistory[]) => void;
}) {
  const update = (i: number, patch: Partial<CandidateWorkHistory>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => onChange([...value, { company: "", role: "", duration: "", description: "" }]);
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {value.map((row, i) => (
        <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              className="input"
              placeholder="Company"
              value={row.company ?? ""}
              onChange={(e) => update(i, { company: e.target.value })}
            />
            <input
              className="input"
              placeholder="Role"
              value={row.role ?? ""}
              onChange={(e) => update(i, { role: e.target.value })}
            />
          </div>
          <input
            className="input"
            placeholder="Duration (e.g. Jan 2022 – Mar 2024)"
            value={row.duration ?? ""}
            onChange={(e) => update(i, { duration: e.target.value })}
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <textarea
              className="textarea"
              rows={2}
              placeholder="What you worked on"
              value={row.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value })}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-ghost btn-sm" aria-label="Remove work history entry" onClick={() => removeRow(i)}>
              <XIcon />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
        + Add past role
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// EducationEditor — candidate's education history (build plan §2). Same row-editor
// shape as the others above.
// ------------------------------------------------------------
export function EducationEditor({
  value,
  onChange,
}: {
  value: CandidateEducation[];
  onChange: (next: CandidateEducation[]) => void;
}) {
  const update = (i: number, patch: Partial<CandidateEducation>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => onChange([...value, { degree: "", institution: "", year: undefined }]);
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {value.map((row, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 0.7fr auto", gap: 8, marginBottom: 8 }}>
          <input
            className="input"
            placeholder="Degree (e.g. B.Tech)"
            value={row.degree ?? ""}
            onChange={(e) => update(i, { degree: e.target.value })}
          />
          <input
            className="input"
            placeholder="Institution"
            value={row.institution ?? ""}
            onChange={(e) => update(i, { institution: e.target.value })}
          />
          <input
            className="input"
            type="number"
            placeholder="Year"
            value={row.year ?? ""}
            onChange={(e) => update(i, { year: e.target.value ? Number(e.target.value) : undefined })}
          />
          <button type="button" className="btn btn-ghost btn-sm" aria-label="Remove education entry" onClick={() => removeRow(i)}>
            <XIcon />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
        + Add education
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// MediaEditor — list of image/video URLs with thumbnail preview.
// ------------------------------------------------------------
export function MediaEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const update = (i: number, url: string) =>
    onChange(value.map((r, idx) => (idx === i ? url : r)));
  const addRow = () => onChange([...value, ""]);
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      {value.map((url, i) => (
        <div
          key={i}
          style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              flexShrink: 0,
              border: "1px solid var(--border)",
              background: "var(--bg-subtle)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span style={{ color: "var(--faint)", display: "inline-flex" }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </span>
            )}
          </div>
          <input
            className="input"
            placeholder="https://…/photo.jpg"
            value={url}
            onChange={(e) => update(i, e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Remove media"
            onClick={() => removeRow(i)}
          >
            <XIcon />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
        + Add photo URL
      </button>
    </div>
  );
}
