/**
 * directory/schema/tables.js — the Postgres tables modules/directory owns
 * (BACKEND-AUDIT.md Phase 8.11 — module table manifests).
 *
 * Boundary contract enforced by test/architecture.test.js: only directory code
 * may name these in raw SQL. Other modules reach the Directory aggregates through
 * the public port (listingsRepo, categoriesRepo, reviewsRepo, consultationBookingsRepo,
 * appendSearchEvent, …); the leads ledger is written only via lib/leads.js.
 *
 * Covers the listings composite (parent + child tables), the flat Directory
 * collections, and the two append-only logs directory owns (leads_ledger,
 * search_events).
 */

module.exports = [
  // listings composite
  "listings",
  "listing_media",
  "listing_products",
  "listing_product_variants",
  "listing_product_specifications",
  "listing_product_price_tiers",
  "listing_services",
  "listing_service_rate_card",
  "listing_service_portfolio",
  // flat Directory collections
  "categories",
  "category_suggestions",
  "collections",
  "reviews",
  "follows",
  "shortlist",
  "blogs",
  "stories",
  "inquiries",
  "consultation_bookings",
  "boost_requests",
  // append-only logs
  "leads_ledger",
  "search_events",
];
