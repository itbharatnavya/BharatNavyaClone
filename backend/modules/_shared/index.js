/**
 * _shared — the Phase 2 kernel (BACKEND-AUDIT.md). Cross-cutting primitives every
 * domain module builds on: the pool, the repository seam, the criteria compiler,
 * pagination, the success envelope, typed errors, and the admin-CRUD factory.
 *
 * Not a domain module — it has no tables and no `mount.js`; it is the layer the
 * domain modules sit on. Import from here:  require("../_shared")
 */

const { pool, ping, close } = require("./pool");
const { nextId, seedCounter } = require("./ids");
const { createRepository, repoForCollection } = require("./repository");
const { buildWhere, buildOrderBy, escapeLike } = require("./queryBuilder");
const { paginationOf, totalPagesFor } = require("./pagination");
const { ok, okPaged } = require("./envelope");
const errors = require("./errors");
const { crudRouter } = require("./crudRouter");

module.exports = {
  pool, ping, close,
  nextId, seedCounter,
  createRepository, repoForCollection,
  buildWhere, buildOrderBy, escapeLike,
  paginationOf, totalPagesFor,
  ok, okPaged,
  errors,
  ...errors, // AppError / BadRequest / Unauthorized / Forbidden / NotFound / Conflict
  crudRouter,
};
