"use client";

// QuoteForm — the inline form a seller uses to send a structured quote back against
// an inquiry/RFQ delivered to them. Native inputs + the light design system.

import React, { useState } from "react";
import { submitQuote } from "@/lib/api";
import type { Quote } from "@/lib/types";
import { useToast } from "@/components/Toast";

// Same 18 units as the sell form's product step, so quotes speak the sellers' language.
const UNIT_OPTIONS = [
  "kg", "gram", "ton", "piece", "dozen", "box", "carton", "meter", "foot",
  "sq.ft", "litre", "ml", "set", "pair", "roll", "bag", "bundle", "packet",
];

interface Props {
  inquiryId: string;
  onSent: (quote: Quote) => void;
  onCancel: () => void;
}

export default function QuoteForm({ inquiryId, onSent, onCancel }: Props) {
  const { addToast } = useToast();
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("piece");
  const [moq, setMoq] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [note, setNote] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const priceNum = Number(price);
    if (!price.trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      addToast("Enter a valid price", "error");
      return;
    }
    setSaving(true);
    try {
      const quote = await submitQuote(inquiryId, {
        price: priceNum,
        unit: unit || undefined,
        moq: moq.trim() ? Number(moq) : undefined,
        deliveryDays: deliveryDays.trim() ? Number(deliveryDays) : undefined,
        note: note.trim() || undefined,
        validUntil: validUntil || undefined,
      });
      addToast("Quote sent to buyer", "success");
      onSent(quote);
    } catch (e) {
      addToast((e as Error).message || "Could not send quote", "error");
      setSaving(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <div>
          <label className="field-label">Price (per unit)</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="e.g. 250"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Unit</label>
          <select
            className="select"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">MOQ (min. order)</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="optional"
            value={moq}
            onChange={(e) => setMoq(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Delivery (days)</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="optional"
            value={deliveryDays}
            onChange={(e) => setDeliveryDays(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Valid until</label>
          <input
            className="input"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="field-label">Note to buyer</label>
        <textarea
          className="input"
          rows={2}
          placeholder="Optional — payment terms, specs, anything the buyer should know."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ resize: "vertical" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={submit}
          disabled={saving}
        >
          {saving ? "Sending…" : "Send quote"}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
