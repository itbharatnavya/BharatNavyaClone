"use client";

// RfqForm — the editable structured requirement form used by /rfq. Presentational
// only: the parent owns state, submit and the AI-draft flow. Uses shared Input /
// Select / Textarea so it matches the rest of the light theme.

import React from "react";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import type { Category } from "@/lib/types";

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
}: {
  value: RfqFormState;
  onChange: (patch: Partial<RfqFormState>) => void;
  categories: Category[];
}) {
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
      />

      <Select
        label="Category"
        placeholder="Select a category"
        value={value.categorySlug}
        onChange={set("categorySlug")}
        options={categories.map((c) => ({ value: c.slug, label: c.name }))}
      />

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
          value={value.quantity}
          onChange={set("quantity")}
        />
        <Input
          label="Unit"
          placeholder="e.g. kg, pieces"
          value={value.unit}
          onChange={set("unit")}
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
        />
        <Input
          label="Delivery location"
          placeholder="e.g. Mumbai"
          value={value.deliveryLocation}
          onChange={set("deliveryLocation")}
        />
      </div>

      <Input
        label="Timeline"
        placeholder="e.g. Within 2 weeks"
        value={value.timeline}
        onChange={set("timeline")}
      />

      <Textarea
        label="Details"
        placeholder="Specifications, quality, grade, terms, anything sellers should know…"
        value={value.details}
        onChange={set("details")}
        style={{ minHeight: 130 }}
      />
    </div>
  );
}
