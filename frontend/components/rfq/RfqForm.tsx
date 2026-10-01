"use client";

// RfqForm — the editable structured requirement form used by /rfq. Presentational
// only: the parent owns state, submit and the AI-draft flow. Uses shared Input /
// Select / Textarea so it matches the rest of the light theme.

import React, { useState } from "react";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import { suggestCategory } from "@/lib/api";
import { useToast } from "@/components/Toast";
import type { Category } from "@/lib/types";
import type { RfqErrors } from "./validation";

export interface RfqFormState {
  productName: string;
  categorySlug: string;
  quantity: string;
  unit: string;
  targetPrice: string;
  deliveryLocation: string;
  timeline: string;
  details: string;
}

export const EMPTY_RFQ: RfqFormState = {
  productName: "",
  categorySlug: "",
  quantity: "",
  unit: "",
  targetPrice: "",
  deliveryLocation: "",
  timeline: "",
  details: "",
};

export default function RfqForm({
  value,
  onChange,
  categories,
  errors = {},
}: {
  value: RfqFormState;
  onChange: (patch: Partial<RfqFormState>) => void;
  categories: Category[];
  errors?: RfqErrors;
}) {
  const { addToast } = useToast();

  // "Other (not listed)" — buyer flags a category we don't have yet. Same
  // pattern as components/sell/CategoryPicker.tsx's seller-side suggestion:
  // independent of the RFQ itself (category stays optional either way), just
  // routes the missing-category signal to the same admin review queue.
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);

  const submitSuggestion = async () => {
    const name = otherName.trim();
    if (!name || suggesting) return;
    setSuggesting(true);
    try {
      await suggestCategory({ name, context: "rfq" });
      setSuggestedName(name);
      setOtherName("");
      addToast(`Thanks! "${name}" was sent to our team to review.`, "success");
    } catch (e) {
      addToast(
        e instanceof Error ? e.message : "Couldn't send your suggestion.",
        "error"
      );
    } finally {
      setSuggesting(false);
    }
  };

  const set =
    (key: keyof RfqFormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      onChange({ [key]: e.target.value } as Partial<RfqFormState>);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Input
        label="Product / service name"
        placeholder="e.g. Stainless steel 304 sheets"
        value={value.productName}
        onChange={set("productName")}
        error={errors.productName}
      />

      <Select
        label="Category"
        placeholder="Select a category"
        value={value.categorySlug}
        onChange={set("categorySlug")}
        options={categories.map((c) => ({ value: c.slug, label: c.name }))}
      />

      {!otherOpen ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginTop: -6,
          }}
        >
          <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
            Can&apos;t find your category?
          </span>
          <button type="button" className="chip" onClick={() => setOtherOpen(true)}>
            + Suggest one
          </button>
        </div>
      ) : (
        <div className="card card-flat" style={{ padding: 14, borderStyle: "dashed", marginTop: -6 }}>
          <label className="field-label">Suggest a new category</label>
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", margin: "0 0 8px" }}>
            Tell us what to call it. Your requirement still gets sent below —
            this just flags the gap for our team.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              style={{ flex: "1 1 200px" }}
              placeholder="e.g. Solar inverter repair, Millet flour…"
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitSuggestion();
                }
              }}
              maxLength={80}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!otherName.trim() || suggesting}
              onClick={() => void submitSuggestion()}
            >
              {suggesting ? "Sending…" : "Suggest"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOtherOpen(false)}>
              Cancel
            </button>
          </div>
          {suggestedName && (
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--brand)", marginTop: 10, marginBottom: 0 }}>
              Sent &ldquo;{suggestedName}&rdquo; for review.
            </p>
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <Input
          label="Quantity"
          placeholder="e.g. 500"
          inputMode="numeric"
          value={value.quantity}
          onChange={set("quantity")}
          error={errors.quantity}
        />
        <Input
          label="Unit"
          placeholder="e.g. kg, pieces"
          value={value.unit}
          onChange={set("unit")}
          error={errors.unit}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <Input
          label="Target price (₹)"
          hint="Optional — helps sellers quote accurately."
          placeholder="e.g. 50000"
          inputMode="numeric"
          value={value.targetPrice}
          onChange={set("targetPrice")}
          error={errors.targetPrice}
        />
        <Input
          label="Delivery location"
          placeholder="e.g. Mumbai"
          value={value.deliveryLocation}
          onChange={set("deliveryLocation")}
          error={errors.deliveryLocation}
        />
      </div>

      <Input
        label="Timeline"
        placeholder="e.g. Within 2 weeks"
        value={value.timeline}
        onChange={set("timeline")}
        error={errors.timeline}
      />

      <Textarea
        label="Details"
        placeholder="Specifications, quality, grade, terms, anything sellers should know…"
        value={value.details}
        onChange={set("details")}
        style={{ minHeight: 130 }}
        error={errors.details}
      />
    </div>
  );
}
