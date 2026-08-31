// Client-side validation shared by every RFQ ("Post a requirement") form in the
// Directory: the standalone /rfq page and the docked FloatingRfqButton panel —
// both render components/rfq/RfqForm.tsx. Pure functions, no React.
//
// Returns a map of { fieldKey: message }; empty map == valid. RfqForm renders each
// message inline (Input/Select/Textarea take an `error` prop) and the parent blocks
// submit while any are present.

import type { RfqFormState } from "./RfqForm";

export type RfqErrors = Partial<Record<keyof RfqFormState, string>>;

export const RFQ_LIMITS = {
  nameMin: 3,
  nameMax: 120,
  unitMax: 24,
  locationMax: 80,
  timelineMax: 80,
  detailsMax: 4000,
  qtyMax: 1_000_000_000,
  priceMax: 1_000_000_000_000,
} as const;

const isBlank = (s: string | undefined | null) => !s || !s.trim();

// "1,200" / " ₹ 50000 " / "1 200" -> number; non-numeric -> NaN.
function toNumber(raw: string): number {
  return Number(String(raw).replace(/[₹,\s]/g, ""));
}

/**
 * @param form   the structured RFQ form state
 * @param opts.needText  the parent's free-text "describe what you need" box —
 *   the submit path falls back to it for the product name and message, so an
 *   empty productName is only an error when needText is empty too.
 */
export function validateRfq(
  form: RfqFormState,
  opts: { needText?: string } = {}
): RfqErrors {
  const e: RfqErrors = {};
  const need = (opts.needText || "").trim();
  const name = form.productName.trim();

  // ---- product / service name ----
  if (!name && !need) {
    e.productName = "Add the product or service you need.";
  } else if (name && name.length < RFQ_LIMITS.nameMin) {
    e.productName = `Too short — at least ${RFQ_LIMITS.nameMin} characters.`;
  } else if (name.length > RFQ_LIMITS.nameMax) {
    e.productName = `Too long — keep it under ${RFQ_LIMITS.nameMax} characters.`;
  }

  // ---- quantity (optional; numeric when given) ----
  if (!isBlank(form.quantity)) {
    const q = toNumber(form.quantity);
    if (Number.isNaN(q))
      e.quantity = "Enter quantity as a number, e.g. 500 (put the unit in the Unit box).";
    else if (q <= 0) e.quantity = "Quantity must be greater than zero.";
    else if (q > RFQ_LIMITS.qtyMax) e.quantity = "That quantity looks too high — check it.";
  }

  // ---- unit (needed only once a quantity is given) ----
  if (!isBlank(form.quantity) && !e.quantity && isBlank(form.unit)) {
    e.unit = "Add a unit for the quantity, e.g. kg, pieces, tonnes.";
  } else if (form.unit.trim().length > RFQ_LIMITS.unitMax) {
    e.unit = "Keep the unit short.";
  }

  // ---- target price (optional; numeric ₹ when given) ----
  if (!isBlank(form.targetPrice)) {
    const p = toNumber(form.targetPrice);
    if (Number.isNaN(p)) e.targetPrice = "Target price must be a number in ₹, e.g. 50000.";
    else if (p <= 0) e.targetPrice = "Target price must be greater than zero.";
    else if (p > RFQ_LIMITS.priceMax) e.targetPrice = "That price looks too high — check it.";
  }

  // ---- free-text fields: length guards only ----
  if (form.deliveryLocation.trim().length > RFQ_LIMITS.locationMax)
    e.deliveryLocation = `Keep this under ${RFQ_LIMITS.locationMax} characters.`;
  if (form.timeline.trim().length > RFQ_LIMITS.timelineMax)
    e.timeline = `Keep this under ${RFQ_LIMITS.timelineMax} characters.`;

  const details = form.details.trim();
  if (details && details.length < 10)
    e.details = "Add a bit more detail, or leave this blank.";
  else if (details.length > RFQ_LIMITS.detailsMax)
    e.details = `Too long — keep it under ${RFQ_LIMITS.detailsMax} characters.`;

  return e;
}
