/**
 * recruitment.mount.test.js — guards the explicit admin-route ordering introduced
 * in Phase 4f (BACKEND-AUDIT.md — "The admin-ordering constraint").
 *
 * modules/recruitment/mount.js mounts every "admin-sub" router (each self-guarded
 * with authGuard + requireRole) BEFORE app.js's blanket app.use("/api/admin", …).
 * Get that ordering wrong and the catch-all either shadows these routers or — with
 * a different guard — silently OPENS them. This test proves /api/admin/jobs is
 * reachable and enforces admin-only through adminJobs.js's own requireRole.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const auth = require("../lib/auth");
const store = require("../lib/store");
const { pool } = require("../modules/_shared/pool");

test("admin-sub ordering: /api/admin/jobs enforces admin-only via its own requireRole", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  // No token -> authGuard rejects (401), not a 404 (route IS mounted / reachable).
  const anon = await request(app).get("/api/admin/jobs");
  assert.equal(anon.status, 401, "unauthenticated request must be 401, not 404");

  // Valid non-admin token -> authGuard passes, requireRole("admin") rejects (403).
  const candidate = await store.getById("users.json", "usr_000026");
  assert.ok(candidate, "seed candidate usr_000026 missing — run npm run test:setup");
  const token = auth.signToken(candidate);
  const forbidden = await request(app)
    .get("/api/admin/jobs")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(forbidden.status, 403, "non-admin must get 403 from adminJobs requireRole");

  // Admin token -> 200 (the router actually runs).
  const admin = await store.getById("users.json", "usr_admin");
  assert.ok(admin, "seed admin usr_admin missing — run npm run test:setup");
  const ok = await request(app)
    .get("/api/admin/jobs")
    .set("Authorization", `Bearer ${auth.signToken(admin)}`);
  assert.equal(ok.status, 200, "admin request reaches the router");
  assert.equal(ok.body.success, true);
});
