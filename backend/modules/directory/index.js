/**
 * directory — public port for the Directory domain (BACKEND-AUDIT.md Phase 5).
 *
 * The ONLY file other code (routes, other modules) may import from. Internals
 * (repository/, service/, schema/, policy.js) are private.
 *
 * Phase 5a: aggregate reads for the taxonomy pages. The service / schema / policy
 * layers fill in as categories -> reviews/inquiries -> listings graduate.
 */

const {
  listingCountsByCategory,
  firstListingImageBySeller,
  activeListingCountsBySeller,
  activeListingIdsForSeller,
  listingTitlesByIds,
} = require("./repository/listingStats.repository");
const { bumpListingViews } = require("./repository/listing.repository");
const { activeBrandedListingsLean } = require("./repository/brand.repository");
const { readSearchEvents } = require("./repository/searchTrends.repository");
const { activeListingsForCollectionResolve } = require("./repository/collection.repository");
const reviewsRepo = require("./repository/review.repository");

module.exports = {
  listingCountsByCategory,
  firstListingImageBySeller,
  activeListingCountsBySeller,
  activeListingIdsForSeller,
  bumpListingViews,
  activeBrandedListingsLean,
  readSearchEvents,
  activeListingsForCollectionResolve,
  listingTitlesByIds,
  reviewsRepo,
};
