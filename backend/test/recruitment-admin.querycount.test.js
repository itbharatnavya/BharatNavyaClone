/**
 * recruitment-admin.querycount.test.js — GET /api/admin/employers[/pending] and
 * GET /api/admin/jobs stop full-scanning users + jobs (BACKEND-AUDIT.md Phase 7
 * sweep-2).
 *
 * adminEmployers did `store.findMany("users.json", u => !!u.employerProfile)` (full
 * composite scan) for its list/pending; adminJobs did `store.all("jobs.json")` +
 * `store.all("users.json")`. Now: indexed `employer_profiles` probes +
 * `hydrateUsersByIds`, `recruitment.jobsRepo.findMany({where})`, and a
 * view-backed `identity.getEmployerStatusCards`.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const auth = require("../lib/auth");
const store = require("../lib/pg-store");
const { pool } = require("../modules/_shared/pool");

test("recruitment-admin lists don't full-scan users/jobs (Phase 7 sweep-2)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const admin = await store.getById("users.json", "usr_admin");
  assert.ok(admin, "seed user usr_admin missing — run `npm run test:setup`");
  const H = { Authorization: `Bearer ${auth.signToken(admin)}` };

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const fullScan = (tbl) => seen.some((s) => new RegExp(`SELECT \\* FROM ${tbl}\\s+ORDER BY`, "i").test(s));

  try {
    for (const path of ["/api/admin/employers", "/api/admin/employers/pending"]) {
      seen.length = 0;
      const r = await request(app).get(path).set(H);
      assert.equal(r.status, 200, path);
      assert.ok(!fullScan("users"), `${path} must not SELECT * FROM users ORDER BY`);
    }

    seen.length = 0;
    const jr = await request(app).get("/api/admin/jobs?limit=10").set(H);
    assert.equal(jr.status, 200);
    assert.ok(Array.isArray(jr.body.data.jobs));
    assert.ok(!fullScan("users"), "GET /api/admin/jobs must not full-scan users");
  } finally {
    pool.query = orig;
  }
});
