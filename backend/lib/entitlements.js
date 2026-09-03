/**
 * entitlements.js — "is this paid benefit active right now?" (DESIGN.md §3.6).
 *
 * The PaymentRecord is the backbone of the whole money layer: a paid benefit
 * (featured placement, ad booking, plan, verified badge, ...) is live ONLY when a
 * linked payment record is marked paid|waived AND the current moment falls inside
 * its [validFrom, validTo] window. This lets monetization run with zero payment
 * gateway — an admin marks a record paid/waived and the benefit switches on.
 *
 * Ranking, featured rails and ad rendering all gate on isBenefitActive().
 */

const { paymentsRepo } = require("../modules/monetization");

/**
 * True when `record` represents a currently-active paid benefit.
 *   - status must be "paid" or "waived"
 *   - now must be >= validFrom (if set) and <= validTo (if set)
 * `now` is a millisecond epoch (defaults to Date.now()).
 */
function isBenefitActive(record, now = Date.now()) {
  return (
    record &&
    (record.paymentStatus === "paid" || record.paymentStatus === "waived") &&
    (!record.validFrom || now >= Date.parse(record.validFrom)) &&
    (!record.validTo || now <= Date.parse(record.validTo))
  );
}

/**
 * All currently-active payment records for a seller (from payment-records.json).
 * Async because it reads the collection through the store.
 */
async function activeBenefitsForSeller(sellerId, now = Date.now()) {
  const records = await paymentsRepo.findMany({});
  return records.filter(
    (r) => r.sellerId === sellerId && isBenefitActive(r, now)
  );
}

module.exports = { isBenefitActive, activeBenefitsForSeller };
