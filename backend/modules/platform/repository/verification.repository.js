/**
 * verification.repository.js — the `verification-requests` collection (seller
 * GST/PAN verification queue reviewed in the admin console). Owned by
 * modules/platform (BACKEND-AUDIT.md Phase 8.3).
 *
 * Flat repository over `verification_requests` — was
 * `store.all/getById/update/remove("verification-requests.json")`.
 */

const { repoForCollection } = require("../../_shared/repository");

module.exports = repoForCollection("verification-requests.json");
