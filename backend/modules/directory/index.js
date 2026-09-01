/**
 * directory — public port for the Directory domain (BACKEND-AUDIT.md Phase 5).
 *
 * The ONLY file other code (routes, other modules) may import from. Internals
 * (repository/, service/, schema/, policy.js) are private.
 *
 * Phase 5a: aggregate reads for the taxonomy pages. The service / schema / policy
 * layers fill in as categories -> reviews/inquiries -> listings graduate.
 */

const { listingCountsByCategory } = require("./repository/listingStats.repository");

module.exports = {
  listingCountsByCategory,
};
