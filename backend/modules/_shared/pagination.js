/**
 * pagination.js — the shared page/limit parser (BACKEND-AUDIT.md Phase 2 kernel;
 * also closes deferred 1f / finding C9).
 *
 * Same clamping `routes/jobs.js`'s local `paginationOf` has always used — page floored
 * at 1, limit in [1, maxLimit] defaulting to `defaultLimit` — plus a derived `offset`
 * for SQL `LIMIT/OFFSET`. `routes/jobs.js` and `routes/adminJobs.js` should switch to
 * this; `GET /api/listings` (currently uncapped — C9) gets its first cap by using it.
 */

function paginationOf(query = {}, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

/** total -> total pages, never below 1 (an empty collection is "page 1 of 1"). */
function totalPagesFor(total, limit) {
  return Math.max(1, Math.ceil((Number(total) || 0) / limit));
}

module.exports = { paginationOf, totalPagesFor };
