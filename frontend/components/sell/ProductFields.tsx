"use client";

import React from "react";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { Section, MoreOptions, TierEditor, KeyValueEditor } from "./editors";
import type { ProductFormState } from "./formTypes";
import type { Errors } from "./validation";

// Common units of measure — a dropdown keeps entry consistent for non-technical,
// mobile-first sellers. "Other…" reveals a free-text input for anything unlisted.
export const UNIT_OPTIONS = [
  "piece", "bottle", "packet", "box", "carton", "kg", "gram", "litre", "ml", "dozen", "bag", "can",
  "pouch", "crate", "ton", "meter", "foot", "sq.ft", "set", "pair", "roll", "bundle",
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
        title="Price and order size"
        desc="Add a price if you can. Buyers tend to skip listings that only say 'Ask price'."
      >
        <div className="sl-grid3">
          <Input
            label="Price per unit (₹)"
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="e.g. 25"
            value={value.price}
            onChange={(e) => onChange({ price: e.target.value })}
            error={errors.price}
          />
          <Select
            label="Sold by"
            placeholder="Choose a unit"
            value={unitMode === "other" ? OTHER_UNIT : value.unitOfMeasure}
            onChange={(e) => onUnitSelect(e.target.value)}
            hint="Bottle, piece, kg and so on."
            options={[
              ...UNIT_OPTIONS.map((u) => ({ value: u, label: u })),
              { value: OTHER_UNIT, label: "Something else…" },
            ]}
          />
          <Input
            label="Smallest order"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="e.g. 24"
            value={value.moq}
            onChange={(e) => onChange({ moq: e.target.value })}
            hint="Fewest units a buyer can order. Leave empty if none."
            error={errors.moq}
          />
        </div>
        {unitMode === "other" && (
          <div className="sl-mt">
            <Input
              label="Your unit"
              placeholder="e.g. quintal, gross"
              value={value.unitOfMeasure}
              onChange={(e) => onChange({ unitOfMeasure: e.target.value })}
              error={errors.customUnit}
            />
          </div>
        )}
      </Section>

      <MoreOptions title="Add more details (optional)" hint="Bulk prices, size and pack info, condition">
        <div className="sl-stack">
          <div>
            <label className="field-label">Bulk discounts</label>
            <p className="field-hint" style={{ marginTop: 0, marginBottom: 10 }}>
              Lower price per unit when someone orders more, for example 100 or more at ₹22.
            </p>
            <TierEditor
              value={value.priceTiers}
              onChange={(priceTiers) => onChange({ priceTiers })}
            />
            {errors.priceTiers && <p className="field-error">{errors.priceTiers}</p>}
          </div>

          <div>
            <label className="field-label">Product facts</label>
            <p className="field-hint" style={{ marginTop: 0, marginBottom: 10 }}>
              Short facts buyers look for, like size, pack of, material or shelf life.
            </p>
            <KeyValueEditor
              value={value.specifications}
              onChange={(specifications) => onChange({ specifications })}
            />
            {errors.specifications && <p className="field-error">{errors.specifications}</p>}
          </div>

          <div className="sl-grid2">
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
            <Select
              label="Price currency"
              value={value.currency}
              onChange={(e) => onChange({ currency: e.target.value })}
              options={[
                { value: "INR", label: "₹ Indian rupee" },
                { value: "USD", label: "$ US dollar" },
              ]}
            />
          </div>
        </div>
      </MoreOptions>
    </>
  );
}
