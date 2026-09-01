/**
 * flat.mappings.js — the ONE source of flat-collection mappings, shared by the
 * legacy `FlatCollectionStore` and the Phase 2 `createRepository` so the two
 * engines can never map the same table differently (BACKEND-AUDIT.md Phase 2 —
 * anti-divergence mechanism #1).
 *
 * For now this re-exports from lib/db/flat.js (the mapping table + the class still
 * physically live there — a straight `require` redirection, zero behaviour change).
 * A later cleanup can move `buildFlatConfigs` here outright; nothing needs to change
 * at the call sites when it does, since everyone imports from this path.
 */

module.exports = require("../../../lib/db/flat");
