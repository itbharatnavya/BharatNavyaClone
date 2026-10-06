/**
 * adPlacements.js — the ONE list of ad placements the platform sells and serves.
 *
 * Why this exists: placement keys used to be hard-coded separately in the seller tab,
 * the recruiter tab, the admin tab, the self-serve API and each page's ad slot, and they
 * drifted (pages asked for keys nobody could book, e.g. listing_detail / recruitment_search,
 * so those ads never rendered). Everything now reads this list:
 *   - routes/myAds + admin ad-bookings validate placementType against it,
 *   - frontend/lib/adPlacements.ts mirrors it (a backend test keeps the two identical),
 *   - every page slot asks for a key from it.
 *
 * Inventory is deliberately small. A page with no slot of its own borrows the closest one:
 *   category_top           category pages, brand pages, listing + seller pages (in-page native ad)
 *   search_top             search results (rail + in-feed)
 *   home_hero              homepage promo banner + late native slot
 *   recruitment_home       Recruitment home, job detail, employer profile
 *   recruitment_search_top Recruitment job search (rail + in-feed)
 */

const PLACEMENTS = [
  { value: "category_top", product: "directory", label: "Category pages and company/listing pages" },
  { value: "search_top", product: "directory", label: "Search results" },
  { value: "home_hero", product: "directory", label: "Homepage" },
  { value: "recruitment_home", product: "recruitment", label: "Recruitment home, job and employer pages" },
  { value: "recruitment_search_top", product: "recruitment", label: "Job search results" },
];

const PLACEMENT_KEYS = PLACEMENTS.map((p) => p.value);

function isValidPlacement(key) {
  return PLACEMENT_KEYS.includes(key);
}

module.exports = { PLACEMENTS, PLACEMENT_KEYS, isValidPlacement };
