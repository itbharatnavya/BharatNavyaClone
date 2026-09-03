/**
 * listingDocument.repository.js — the composite `listings` aggregate (the row +
 * its 8 child tables: media, product + specs/tiers/variants, service +
 * rateCard/portfolio). Owned by modules/directory (BACKEND-AUDIT.md Phase 8.5).
 *
 * `listings` used to be the one collection that "never graduates" — full-document
 * reads/writes went through `store`. With the file-DB backend removed and
 * `lib/store` slated for deletion, the SAME composite mapper (`lib/db/listings.js`)
 * is wired here against `_shared/pool` + `_shared/ids`. The interface is
 * unchanged — `all / findOne / findMany / getById / insert / update / remove /
 * writeJson` — so route code that did `store.<op>("listings.json", …)` now does
 * `directory.listingsRepo.<op>(…)` with identical behaviour (the mapper is the
 * anti-divergence guarantee).
 *
 * `findOne` / `findMany` here still take a JS predicate and scan `all()` — they
 * exist only for the handful of admin composite reads that have no lean SQL
 * equivalent yet; new query-shaped reads should use a lean directory port.
 */

const { pool } = require("../../_shared/pool");
const { nextId } = require("../../_shared/ids");
const { createListingsStore } = require("../../../lib/db/listings");

module.exports = createListingsStore(pool, nextId);
