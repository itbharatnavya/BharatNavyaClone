// The one list of ad placements the platform sells and serves. Mirrors
// backend/lib/adPlacements.js (backend/test/adPlacements.test.js fails if they drift).
// Every page ad slot must ask for one of these keys — a key that isn't listed here can't be
// booked by anyone, so an ad slot asking for it would only ever show the house fallback.
//
//   category_top           category pages, brand pages, listing + seller pages
//   search_top             search results (rail + in-feed)
//   home_hero              homepage promo banner + late native slot
//   recruitment_home       Recruitment home, job detail, employer profile
//   recruitment_search_top Recruitment job search (rail + in-feed)

export type AdPlacementKey =
  | "category_top"
  | "search_top"
  | "home_hero"
  | "recruitment_home"
  | "recruitment_search_top";

export interface AdPlacementInfo {
  value: AdPlacementKey;
  product: "directory" | "recruitment";
  label: string;
}

export const AD_PLACEMENTS: AdPlacementInfo[] = [
  { value: "category_top", product: "directory", label: "Category pages and company/listing pages" },
  { value: "search_top", product: "directory", label: "Search results" },
  { value: "home_hero", product: "directory", label: "Homepage" },
  { value: "recruitment_home", product: "recruitment", label: "Recruitment home, job and employer pages" },
  { value: "recruitment_search_top", product: "recruitment", label: "Job search results" },
];

export const DIRECTORY_AD_PLACEMENTS = AD_PLACEMENTS.filter((p) => p.product === "directory");
export const RECRUITMENT_AD_PLACEMENTS = AD_PLACEMENTS.filter((p) => p.product === "recruitment");

export function adPlacementLabel(key?: string | null): string {
  return AD_PLACEMENTS.find((p) => p.value === key)?.label || key || "—";
}
