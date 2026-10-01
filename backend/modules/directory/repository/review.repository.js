/**
 * review.repository.js — the `reviews` collection for the Directory domain
 * (BACKEND-AUDIT.md Phase 5b).
 *
 * A plain flat repository (criteria grammar over the `reviews` table). routes/
 * reviews.js is the ONLY writer of this collection, so it graduates atomically
 * here; the read-only references in routes/admin.js and routes/users.js may
 * straddle on `store` until Phase 6.
 */

const { repoForCollection } = require("../../_shared/repository");

module.exports = repoForCollection("reviews.json");
