/**
 * sellerLocations.js — pure helper for a seller's branch locations.
 *
 * Extracted from routes/users.js in Phase 5d so routes/listings.js stops importing
 * a route module (the `routes/listings.js -> routes/users.js` edge flagged in
 * BACKEND-AUDIT.md "Architecture"). No I/O — operates only on a sellerProfile shape.
 */

/**
 * Resolve a seller's branch locations. Returns sellerProfile.locations when it is a
 * non-empty array; otherwise derives a single-element array from the legacy
 * sellerProfile.location so every seller always has at least one location to assign
 * listings to (no migration needed — this is derived at read time).
 */
function resolveSellerLocations(sellerProfile) {
  const sp = sellerProfile || {};
  if (Array.isArray(sp.locations) && sp.locations.length > 0) {
    return sp.locations;
  }
  const loc = sp.location || {};
  return [
    {
      id: "loc_primary",
      label: "Head Office",
      city: loc.city || "",
      state: loc.state || "",
      pincode: loc.pincode || "",
      address: "",
    },
  ];
}

module.exports = { resolveSellerLocations };
