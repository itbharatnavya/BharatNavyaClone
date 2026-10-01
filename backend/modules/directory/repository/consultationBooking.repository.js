/**
 * consultationBooking.repository.js — the `consultation-bookings` collection
 * (a buyer's request to hire an expert). Owned by modules/directory
 * (BACKEND-AUDIT.md Phase 8.8). Consultations is no longer a promoted product
 * but the booking flow is kept working (CLAUDE.md §1).
 *
 * Flat repository over `consultation_bookings` — was
 * `store.all/insert("consultation-bookings.json")`.
 */

const { repoForCollection } = require("../../_shared/repository");

module.exports = repoForCollection("consultation-bookings.json");
