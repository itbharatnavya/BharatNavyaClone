"use client";

import React from "react";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { Section, TierEditor, KeyValueEditor } from "./editors";
import type { ProductFormState } from "./formTypes";
import type { Errors } from "./validation";

// Common units of measure — a dropdown keeps entry consistent for non-technical,
// mobile-first sellers. "Other…" reveals a free-text input for anything unlisted.
export const UNIT_OPTIONS = [
  "kg", "gram", "ton", "piece", "dozen", "box", "carton", "meter", "foot",
  "sq.ft", "litre", "ml", "set", "pair", "roll", "bag", "bundle", "packet",
];
const OTHER_UNIT = "__other__";

export default function ProductFields({
  value,
  onChange,
  errors = {},
  unitOther,
  onUnitOtherChange,
}: {
  value: ProductFormState;
  onChange: (patch: Partial<ProductFormState>) => void;
  errors?: Errors;
  // "Other" unit mode is lifted to the page so submit-time validation can tell an
  // empty custom-unit box from "no unit chosen".
  unitOther: boolean;
  onUnitOtherChange: (next: boolean) => void;
}) {
  const unitMode: "preset" | "other" = unitOther ? "other" : "preset";

  const onUnitSelect = (v: string) => {
    if (v === OTHER_UNIT) {
      onUnitOtherChange(true);
      onChange({ unitOfMeasure: "" });
    } else {
      onUnitOtherChange(false);
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
            error={errors.price}
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
            error={errors.moq}
          />
          {unitMode === "other" && (
            <Input
              label="Custom unit"
              placeholder="e.g. quintal, gross"
              value={value.unitOfMeasure}
              onChange={(e) => onChange({ unitOfMeasure: e.target.value })}
              error={errors.customUnit}
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
          {errors.priceTiers && <p className="field-error">{errors.priceTiers}</p>}
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
        {errors.specifications && (
          <p className="field-error">{errors.specifications}</p>
        )}
      </Section>
    </>
  );
}
