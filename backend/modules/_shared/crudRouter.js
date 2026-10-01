/**
 * crudRouter.js — factory for the ~10 thin admin-taxonomy routers (categories,
 * job-functions, job-roles, skills, …). BACKEND-AUDIT.md "What explicitly stays
 * as-is": these get the shared factory instead of a full service/repository triad —
 * ~330 lines collapse to ~60.
 *
 *   crudRouter(repo, { role = "admin", listSchema, writeSchema, orderBy })
 *
 * Routes:  GET /  ·  GET /:id  ·  POST /  ·  PUT /:id  ·  DELETE /:id
 * Writes are role-gated (requireRole) and validated by `writeSchema` (a zod schema —
 * "the schema IS the allowlist"). Reads are public unless `role` gates them too.
 *
 * Not yet wired anywhere — shipped with the Phase 2 kernel so Phase 4/5 can adopt it.
 */

const express = require("express");
const { requireRole, authGuard } = require("../../middleware/authGuard");
const { validate } = require("../../lib/validate");
const { ok } = require("./envelope");
const { NotFound } = require("./errors");

function crudRouter(repo, opts = {}) {
  const { role = "admin", writeSchema, listOrderBy } = opts;
  const router = express.Router();
  const guard = [authGuard, requireRole(role)];

  router.get("/", async (req, res, next) => {
    try {
      ok(res, await repo.findMany({ orderBy: listOrderBy }));
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const doc = await repo.findById(req.params.id);
      if (!doc) throw new NotFound("Item");
      ok(res, doc);
    } catch (err) {
      next(err);
    }
  });

  router.post("/", ...guard, ...(writeSchema ? [validate(writeSchema)] : []), async (req, res, next) => {
    try {
      ok(res, await repo.insert(req.body), 201);
    } catch (err) {
      next(err);
    }
  });

  router.put("/:id", ...guard, ...(writeSchema ? [validate(writeSchema.partial ? writeSchema.partial() : writeSchema)] : []), async (req, res, next) => {
    try {
      const updated = await repo.updateById(req.params.id, req.body);
      if (!updated) throw new NotFound("Item");
      ok(res, updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", ...guard, async (req, res, next) => {
    try {
      const removed = await repo.deleteById(req.params.id);
      if (!removed) throw new NotFound("Item");
      ok(res, { id: req.params.id, deleted: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { crudRouter };
