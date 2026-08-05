"use client";

import React, { useState } from "react";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { Section, TierEditor, KeyValueEditor } from "./editors";
import type { ProductFormState } from "./formTypes";

// Common units of measure — a dropdown keeps entry consistent for non-technical,
// mobile-first sellers. "Other…" reveals a free-text input for anything unlisted.
const UNIT_OPTIONS = [
  "kg", "gram", "ton", "piece", "dozen", "box", "carton", "meter", "foot",
  "sq.ft", "litre", "ml", "set", "pair", "roll", "bag", "bundle", "packet",
];
const OTHER_UNIT = "__other__";

export default function ProductFields({
  value,
  onChange,
}: {
  value: ProductFormState;
  onChange: (patch: Partial<ProductFormState>) => void;
}) {
  // "Other" mode when a non-empty unit isn't one of the presets.
  const [unitMode, setUnitMode] = useState<"preset" | "other">(
    value.unitOfMeasure && !UNIT_OPTIONS.includes(value.unitOfMeasure)
      ? "other"
      : "preset"
  );

  const onUnitSelect = (v: string) => {
    if (v === OTHER_UNIT) {
      setUnitMode("other");
      onChange({ unitOfMeasure: "" });
    } else {
      setUnitMode("preset");
      onChange({ unitOfMeasure: v });
    }
  };

  return (
    <>
      <Section
        title="Pricing"
        desc="Show a price where you can — buyers skip 'Ask Price' listings. Add quantity tiers for wholesale."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <Input
            label="Price"
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="e.g. 250"
            value={value.price}
            onChange={(e) => onChange({ price: e.target.value })}
          />
          <Select
            label="Currency"
            value={value.currency}
            onChange={(e) => onChange({ currency: e.target.value })}
            options={[
              { value: "INR", label: "₹ INR" },
              { value: "USD", label: "$ USD" },
            ]}
          />
          <Select
            label="Unit of measure"
            placeholder="Select unit"
            value={unitMode === "other" ? OTHER_UNIT : value.unitOfMeasure}
            onChange={(e) => onUnitSelect(e.target.value)}
            options={[
              ...UNIT_OPTIONS.map((u) => ({ value: u, label: u })),
              { value: OTHER_UNIT, label: "Other…" },
            ]}
          />
          <Input
            label="Min. order qty (MOQ)"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="e.g. 100"
            value={value.moq}
            onChange={(e) => onChange({ moq: e.target.value })}
          />
          {unitMode === "other" && (
            <Input
              label="Custom unit"
              placeholder="e.g. quintal, gross"
              value={value.unitOfMeasure}
              onChange={(e) => onChange({ unitOfMeasure: e.target.value })}
            />
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="field-label">Quantity price tiers (optional)</label>
          <p className="field-hint" style={{ marginTop: 0, marginBottom: 10 }}>
            Cheaper per-unit as quantity grows — the classic wholesale ladder.
          </p>
          <TierEditor
            value={value.priceTiers}
            onChange={(priceTiers) => onChange({ priceTiers })}
          />
        </div>
      </Section>

      <Section title="Product details">
        <div style={{ maxWidth: 260, marginBottom: 16 }}>
          <Select
            label="Condition"
            value={value.condition}
            onChange={(e) =>
              onChange({ condition: e.target.value as ProductFormState["condition"] })
            }
            options={[
              { value: "new", label: "New" },
              { value: "used", label: "Used" },
              { value: "refurbished", label: "Refurbished" },
            ]}
          />
        </div>
        <label className="field-label">Specifications</label>
        <p className="field-hint" style={{ marginTop: 0, marginBottom: 10 }}>
          Key attributes buyers filter on — material, grade, dimensions, brand…
        </p>
        <KeyValueEditor
          value={value.specifications}
          onChange={(specifications) => onChange({ specifications })}
        />
      </Section>
    </>
  );
}
