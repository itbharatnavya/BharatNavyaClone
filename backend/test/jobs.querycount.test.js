/**
 * jobs.querycount.test.js — the standing "GET /api/jobs stays cheap" assertion
 * (BACKEND-AUDIT.md Phase 4e + "Verification / Query count").
 *
 * Before Phase 4e the public job browse issued ~11 queries (store.all("users.json")
 * hydrating every user with all 9 child tables, then a full jobs scan, then a JS
 * sort). The rewrite is one indexed JOIN. Without this test, someone adds an
 * innocent-looking store.all() and it silently regresses to 11 with every other
 * test still green.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

test("GET /api/jobs issues <= 2 SQL queries (Phase 4e — was ~11)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const orig = pool.query.bind(pool);
  let n = 0;
  pool.query = (...args) => {
    n += 1;
    return orig(...args);
  };

  try {
    const res = await request(app).get("/api/jobs?limit=12");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.jobs), "response has a jobs array");
    assert.ok(n <= 2, `expected <= 2 queries for GET /api/jobs, got ${n}`);
  } finally {
    pool.query = orig;
  }
});
