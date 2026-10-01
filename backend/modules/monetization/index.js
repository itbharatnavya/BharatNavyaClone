/**
 * monetization — public port for the revenue-lever domain (BACKEND-AUDIT.md
 * Phase 8): the feature catalog, subscription plans, ad slots + bookings,
 * payment records, and abuse reports. All admin-controlled (the platform is a
 * mediator — no payment processing).
 *
 * These collections are flat, so each repository is a thin `repoForCollection`
 * over its table. Routes and other modules import from here, not
 * `repoForCollection` directly, so ownership is greppable.
 */

const { repoForCollection } = require("../_shared/repository");

module.exports = {
  featuresRepo: require("./repository/features.repository"),
  plansRepo: repoForCollection("subscription-plans.json"),
  adSlotsRepo: repoForCollection("ad-slots.json"),
  adBookingsRepo: repoForCollection("ad-bookings.json"),
  paymentsRepo: repoForCollection("payment-records.json"),
  reportsRepo: repoForCollection("reports.json"),
};
