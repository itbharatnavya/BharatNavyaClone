/**
 * envelope.js — the one place that writes the success envelope
 * (BACKEND-AUDIT.md Phase 2 kernel). Every handler returns `{ success:true, data }`;
 * these keep that identical while removing the boilerplate.
 *
 *   ok(res, doc)                         -> { success:true, data: doc }
 *   okPaged(res, { items, total, page, totalPages, ...extra })
 *                                        -> { success:true, data: { items, total, page, totalPages, ...extra } }
 *
 * okPaged spreads `extra` so a route that also returns `facets` or `summary`
 * (e.g. GET /api/listings, GET /api/admin/users) keeps every existing key.
 */

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function okPaged(res, { items, total, page, totalPages, ...extra }, status = 200) {
  return res.status(status).json({
    success: true,
    data: { items, total, page, totalPages, ...extra },
  });
}

module.exports = { ok, okPaged };
