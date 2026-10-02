// categoryImages.ts — shared slug/keyword → local /demo/*.jpg image resolver.
//
// Categories (backend/DB/categories.json) have no image field at any level
// (only `icon`, currently unused/null in seed data), so every image-forward
// category UI resolves a photo purely from the slug/name here — local files
// only, per CLAUDE.md's "never hot-link external images" rule. Originally
// lived inline in FeaturedCategories.tsx; extracted so CategoryGroupGrid.tsx
// and the trending/popular search fallback list can share the same mapping
// instead of re-guessing images independently.

import type { Category } from "./types";

// Best-quality mapping for the known industry roots. Chosen by looking at the
// files: several /demo names do not match their content (electronics-1,
// industry-4 and machinery-3 are a castle; industry-2 and machinery-2 are cars;
// metal-1/steel-2 a light bulb; steel-1 a T-shirt), so never map by name alone.
export const IMG_BY_SLUG: Record<string, string> = {
  "textiles-fabrics-yarn": "textile-4",
  "apparel-clothing-garments": "apparel-1",
  "industrial-machinery-equipment": "machinery-1",
  "chemicals-dyes-solvents": "chemical-2",
  "electronics-electrical": "electronics-4",
  "packaging-printing": "packaging-4",
  "building-construction": "construction-4",
  "automotive-parts-accessories": "automotive-1",
  "agriculture-farming": "agriculture-2",
  "medical-healthcare-supplies": "medical-1",
  food: "food-1",
  "home-furniture-furnishings": "home-4",
  tools: "electronics-3",
  "metals-steel-alloys": "metal-2",
  "plastics-polymers-rubber": "industry-1",
  "pharmaceuticals-lab-supplies": "medical-2",
  "office-stationery-supplies": "business-3",
  "beauty-personal-care-wellness": "retail-2",
  "gifts-crafts-sports": "retail-4",
  "home-local-services": "home-1",
  accounting: "retail-3",
  "professional-consulting-services": "business-4",
  "logistics-transport-warehousing": "logistics-2",
  "education-training-events": "business-2",
};

export const IMG_KEYWORDS: [RegExp, string][] = [
  [/textile|fabric|yarn/, "textile-1"],
  [/apparel|cloth|garment|wear/, "apparel-1"],
  [/machin|equipment|industrial/, "machinery-1"],
  [/chemical|dye|solvent|polymer|plastic|rubber|paint/, "chemical-2"],
  [/electronic|electr/, "electronics-4"],
  [/packag|print/, "packaging-1"],
  [/build|construction|cement|steel-bar/, "construction-4"],
  [/auto|vehicle|motor/, "automotive-1"],
  [/agri|farm/, "agriculture-1"],
  [/medical|health|pharma|lab/, "medical-1"],
  [/food|beverage|grocery/, "food-1"],
  [/home|furnitur|furnish/, "home-1"],
  [/metal|steel|alloy|iron/, "metal-2"],
  [/logistic|transport|warehous|freight/, "logistics-2"],
  [/tool|hardware/, "electronics-3"],
  [/office|station|gift|craft|sport|retail|beauty/, "retail-4"],
  [/service|consult|account|legal|educat|training|professional/, "business-4"],
];

export const IMG_FALLBACK = [
  "industry-1",
  "business-5",
  "retail-4",
  "electronics-2",
  "textile-2",
  "construction-2",
  "agriculture-2",
  "metal-2",
];

/** Resolve a `/demo/<name>.jpg` image name for a category, by slug then keyword then a stable fallback. */
export function imgFor(cat: Pick<Category, "slug" | "name">, i = 0): string {
  const slug = (cat.slug || "").toLowerCase();
  if (IMG_BY_SLUG[slug]) return IMG_BY_SLUG[slug];
  const hay = `${slug} ${(cat.name || "").toLowerCase()}`;
  for (const [re, img] of IMG_KEYWORDS) if (re.test(hay)) return img;
  return IMG_FALLBACK[i % IMG_FALLBACK.length];
}

/** Same resolver, keyed by free-text (e.g. a search query) rather than a Category. */
export function imgForText(text: string, i = 0): string {
  const hay = (text || "").toLowerCase();
  for (const [re, img] of IMG_KEYWORDS) if (re.test(hay)) return img;
  return IMG_FALLBACK[i % IMG_FALLBACK.length];
}
