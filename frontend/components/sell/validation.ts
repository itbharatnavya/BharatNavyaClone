// Client-side validation for the /sell create-listing flow.
// Pure functions — no React. Each returns a map of { fieldKey: message }; an empty
// map means that group is valid. The page renders these inline under each field
// (Input/Textarea/Select all take an `error` prop) and blocks step advance / submit
// while any are present.

import type { ProductFormState, ServiceFormState } from "./formTypes";

export type Errors = Record<string, string>;

// ---- limits (kept generous; the point is to stop nonsense, not nitpick) ----
export const LIMITS = {
  titleMin: 5,
  titleMax: 120,
  descMin: 20,
  descMax: 5000,
  keywordsMax: 20,
  keywordLen: 40,
  priceMax: 100_000_000, // ₹10 crore
  moqMax: 10_000_000,
  expYearsMax: 70,
  mediaMax: 10,
} as const;

const isBlank = (s: string | undefined | null) => !s || !s.trim();

// A media entry is a local upload path ("/uploads/…", "/demo/…") or an http(s) URL.
const MEDIA_RE = /^(https?:\/\/[^\s]+|\/[^\s]*)$/i;

// Empty string -> null (optional number left blank). Non-numeric text -> NaN, which
// each caller reports as "must be a number".
function parseNum(raw: string): number | null {
  const t = (raw || "").trim();
  if (!t) return null;
  return Number(t);
}

// ---------------------------------------------------------------------------
// Step 2 — category
// ---------------------------------------------------------------------------
export function validateCategory(categoryId: string | undefined): Errors {
  return categoryId ? {} : { category: "Pick a category to continue." };
}

// ---------------------------------------------------------------------------
// Step 3 — "Basics" (shared by product + service)
// ---------------------------------------------------------------------------
export function validateBasics(v: {
  title: string;
  description: string;
  keywords: string[];
}): Errors {
  const e: Errors = {};

  const title = v.title.trim();
  if (!title) e.title = "Add a title.";
  else if (title.length < LIMITS.titleMin)
    e.title = `Title is too short — at least ${LIMITS.titleMin} characters.`;
  else if (title.length > LIMITS.titleMax)
    e.title = `Title is too long — keep it under ${LIMITS.titleMax} characters.`;

  const desc = v.description.trim();
  if (!desc) e.description = "Add a description.";
  else if (desc.length < LIMITS.descMin)
    e.description = `Add a bit more detail — at least ${LIMITS.descMin} characters.`;
  else if (desc.length > LIMITS.descMax)
    e.description = `Description is too long — keep it under ${LIMITS.descMax} characters.`;

  if (v.keywords.length > LIMITS.keywordsMax)
    e.keywords = `Too many keywords — ${LIMITS.keywordsMax} max.`;
  else if (v.keywords.some((k) => k.length > LIMITS.keywordLen))
    e.keywords = `Each keyword must be under ${LIMITS.keywordLen} characters.`;

  return e;
}

// ---------------------------------------------------------------------------
// Step 3 — media (image URLs / upload paths)
// ---------------------------------------------------------------------------
export function validateMedia(media: string[]): Errors {
  const filled = media.map((m) => m.trim()).filter(Boolean);
  if (filled.length > LIMITS.mediaMax)
    return { media: `Too many photos — ${LIMITS.mediaMax} max.` };
  if (filled.some((m) => !MEDIA_RE.test(m)))
    return {
      media:
        "One of the photo links doesn't look valid. Use an uploaded photo or a full https:// URL.",
    };
  return {};
}

// ---------------------------------------------------------------------------
// Step 3 — location
// ---------------------------------------------------------------------------
export function validateLocation(v: {
  locChoice: string;
  isPan: boolean;
  isCities: boolean;
  city: string;
  serviceCitiesCount: number;
}): Errors {
  if (v.isPan) return {};
  if (v.isCities)
    return v.serviceCitiesCount > 0
      ? {}
      : { location: "Add at least one city, or choose PAN India." };
  // a branch / derived single location
  return isBlank(v.city) ? { location: "Add your city for this location." } : {};
}

// ---------------------------------------------------------------------------
// Step 3 — product-specific
// ---------------------------------------------------------------------------
export function validateProduct(
  p: ProductFormState,
  unitMode: "preset" | "other"
): Errors {
  const e: Errors = {};

  const price = parseNum(p.price);
  if (price !== null) {
    if (Number.isNaN(price)) e.price = "Price must be a number.";
    else if (price < 0) e.price = "Price can't be negative.";
    else if (price === 0) e.price = "Enter a real price, or leave it blank for 'Ask price'.";
    else if (price > LIMITS.priceMax) e.price = "That price looks too high — check it.";
  }

  const moq = parseNum(p.moq);
  if (moq !== null) {
    if (Number.isNaN(moq)) e.moq = "MOQ must be a number.";
    else if (!Number.isInteger(moq) || moq < 1) e.moq = "MOQ must be a whole number, 1 or more.";
    else if (moq > LIMITS.moqMax) e.moq = "That MOQ looks too high — check it.";
  }

  if (unitMode === "other" && isBlank(p.unitOfMeasure))
    e.customUnit = "Type your custom unit, or pick one from the list.";

  // Price tiers: every added row must be coherent.
  for (let i = 0; i < p.priceTiers.length; i++) {
    const t = p.priceTiers[i];
    if (!Number.isFinite(t.minQty) || t.minQty < 1) {
      e.priceTiers = `Tier ${i + 1}: min qty must be 1 or more.`;
      break;
    }
    if (t.maxQty != null && t.maxQty <= t.minQty) {
      e.priceTiers = `Tier ${i + 1}: max qty must be greater than min qty.`;
      break;
    }
    if (!Number.isFinite(t.price) || t.price < 0) {
      e.priceTiers = `Tier ${i + 1}: price can't be negative.`;
      break;
    }
  }

  // Specifications: a value with no attribute name is a mistake.
  if (Object.keys(p.specifications).some((k) => !k.trim())) {
    e.specifications = "Every specification needs an attribute name.";
  }

  return e;
}

// ---------------------------------------------------------------------------
// Step 3 — service-specific
// ---------------------------------------------------------------------------
export function validateService(s: ServiceFormState): Errors {
  const e: Errors = {};

  const hasRate = s.rateCard.length > 0;
  if (s.pricingModel !== "quote" && !hasRate) {
    e.rateCard =
      "Add at least one rate-card item, or switch pricing to 'Request a quote'.";
  } else {
    for (let i = 0; i < s.rateCard.length; i++) {
      const r = s.rateCard[i];
      if (isBlank(r.label)) {
        e.rateCard = `Rate-card row ${i + 1}: add a service name.`;
        break;
      }
      if (!Number.isFinite(r.price) || r.price < 0) {
        e.rateCard = `Rate-card row ${i + 1}: price can't be negative.`;
        break;
      }
    }
  }

  const exp = parseNum(s.experienceYears);
  if (exp !== null) {
    if (Number.isNaN(exp)) e.experienceYears = "Years of experience must be a number.";
    else if (!Number.isInteger(exp) || exp < 0)
      e.experienceYears = "Years of experience must be a whole number.";
    else if (exp > LIMITS.expYearsMax)
      e.experienceYears = `That looks too high — ${LIMITS.expYearsMax} max.`;
  }

  return e;
}

// Merge helper — combine group maps, first message per key wins.
export function mergeErrors(...groups: Errors[]): Errors {
  const out: Errors = {};
  for (const g of groups) for (const k in g) if (!(k in out)) out[k] = g[k];
  return out;
}
