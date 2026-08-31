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

// Best-quality mapping for the known industry roots.
export const IMG_BY_SLUG: Record<string, string> = {
  "textiles-fabrics-yarn": "textile-1",
  "apparel-clothing-garments": "apparel-1",
  "industrial-machinery-equipment": "machinery-1",
  "chemicals-dyes-solvents": "chemical-1",
  "electronics-electrical": "electronics-1",
  "packaging-printing": "packaging-1",
  "building-construction": "construction-1",
  "automotive-parts-accessories": "automotive-1",
  "agriculture-farming": "agriculture-1",
  "medical-healthcare-supplies": "medical-1",
  food: "food-1",
  "home-furniture-furnishings": "home-1",
  tools: "industry-2",
  "metals-steel-alloys": "metal-1",
  "plastics-polymers-rubber": "chemical-2",
  "pharmaceuticals-lab-supplies": "medical-2",
  "office-stationery-supplies": "retail-1",
  "beauty-personal-care-wellness": "retail-2",
  "gifts-crafts-sports": "retail-3",
  "home-local-services": "business-1",
  accounting: "business-2",
  "professional-consulting-services": "business-3",
  "logistics-transport-warehousing": "logistics-1",
  "education-training-events": "business-4",
};

export const IMG_KEYWORDS: [RegExp, string][] = [
  [/textile|fabric|yarn/, "textile-1"],
  [/apparel|cloth|garment|wear/, "apparel-1"],
  [/machin|equipment|industrial/, "machinery-1"],
  [/chemical|dye|solvent|polymer|plastic|rubber|paint/, "chemical-1"],
  [/electronic|electr/, "electronics-1"],
  [/packag|print/, "packaging-1"],
  [/build|construction|cement|steel-bar/, "construction-1"],
  [/auto|vehicle|motor/, "automotive-1"],
  [/agri|farm/, "agriculture-1"],
  [/medical|health|pharma|lab/, "medical-1"],
  [/food|beverage|grocery/, "food-1"],
  [/home|furnitur|furnish/, "home-1"],
  [/metal|steel|alloy|iron/, "metal-1"],
  [/logistic|transport|warehous|freight/, "logistics-1"],
  [/tool|hardware/, "industry-2"],
  [/office|station|gift|craft|sport|retail|beauty/, "retail-1"],
  [/service|consult|account|legal|educat|training|professional/, "business-1"],
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
