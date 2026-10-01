/**
 * admin-recruitment-reads.querycount.test.js — routes/admin.js reads jobs +
 * applications through modules/recruitment, not lib/store (BACKEND-AUDIT.md
 * Phase 7 sweep-11 — closes tidy-item 4: `jobs.json` + `applications.json` join
 * GRADUATED_COLLECTIONS).
 *
 * `GET /api/admin/analytics` did `store.all("jobs.json")` + `store.all("applications.json")`;
 * `GET /api/admin/users/:id` did `store.findMany("jobs.json"|"applications.json", pred)`.
 * Now: `recruitment.jobsRepo.findMany` / `recruitment.appsRepo.findMany({ where })`.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const app = require("../app");
const auth = require("../lib/auth");
const store = require("../lib/pg-store");
const { pool } = require("../modules/_shared/pool");

test("admin.js analytics + user detail read jobs/apps via recruitment repos (Phase 7 sweep-11)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const src = fs.readFileSync(path.join(__dirname, "../modules/platform/routes/admin.routes.js"), "utf8");
  for (const lit of ['"jobs.json"', '"applications.json"', "'jobs.json'", "'applications.json'"]) {
    assert.ok(!src.includes(lit), `routes/admin.js must not reference ${lit}`);
  }

  const admin = await store.getById("users.json", "usr_admin");
  assert.ok(admin, "seed user usr_admin missing — run `npm run test:setup`");
  const H = { Authorization: `Bearer ${auth.signToken(admin)}` };

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const hit = (re) => seen.some((s) => re.test(s));

  try {
    seen.length = 0;
    const a = await request(app).get("/api/admin/analytics").set(H);
    assert.equal(a.status, 200);
    assert.ok(hit(/FROM\s+"?jobs"?/i), "analytics reads jobs via SQL");
    assert.ok(hit(/FROM\s+"?applications"?/i), "analytics reads applications via SQL");

    seen.length = 0;
    const u = await request(app).get("/api/admin/users/usr_emp4").set(H);
    assert.equal(u.status, 200);
    assert.ok(hit(/FROM\s+"?jobs"?\s+WHERE/i), "user detail filters jobs by employerId in SQL");
    assert.ok(hit(/FROM\s+"?applications"?\s+WHERE/i), "user detail filters applications in SQL");
  } finally {
    pool.query = orig;
  }
});
