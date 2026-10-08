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
  sellerCardExtras,
  listingCountsByCategory,
  firstListingImageBySeller,
  activeListingCountsBySeller,
  activeListingIdsForSeller,
  sellerListingIds,
  sellerListingStats,
  activeListingCountsByType,
  listingsForAiFallback,
  listingTitlesByIds,
} = require("./repository/listingStats.repository");
const { bumpListingViews } = require("./repository/listing.repository");
const listingsRepo = require("./repository/listingDocument.repository");
const { activeBrandedListingsLean } = require("./repository/brand.repository");
const { readSearchEvents, appendSearchEvent } = require("./repository/searchTrends.repository");
const { activeListingsForCollectionResolve } = require("./repository/collection.repository");
const { rfqMatchListingsLean, listingOwner } = require("./repository/rfq.repository");
const reviewsRepo = require("./repository/review.repository");
const categoriesRepo = require("./repository/category.repository");
const consultationBookingsRepo = require("./repository/consultationBooking.repository");

module.exports = {
  sellerCardExtras,
  listingCountsByCategory,
  firstListingImageBySeller,
  activeListingCountsBySeller,
  activeListingIdsForSeller,
  sellerListingIds,
  sellerListingStats,
  activeListingCountsByType,
  listingsForAiFallback,
  bumpListingViews,
  activeBrandedListingsLean,
  readSearchEvents,
  appendSearchEvent,
  activeListingsForCollectionResolve,
  rfqMatchListingsLean,
  listingOwner,
  listingTitlesByIds,
  reviewsRepo,
  categoriesRepo,
  listingsRepo,
  consultationBookingsRepo,
};
