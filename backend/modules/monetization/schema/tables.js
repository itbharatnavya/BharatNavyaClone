/**
 * monetization/schema/tables.js — the Postgres tables modules/monetization owns
 * (BACKEND-AUDIT.md Phase 8.11 — module table manifests).
 *
 * Boundary contract enforced by test/architecture.test.js: only monetization code
 * may name these in raw SQL. The admin dashboard reads these collections through
 * repoForCollection (the shared kernel), which is the sanctioned path — it does not
 * count as a raw cross-module table reference.
 */

module.exports = [
  "subscription_plans",
  "ad_slots",
  "ad_bookings",
  "payment_records",
  "reports",
  "features",
];
