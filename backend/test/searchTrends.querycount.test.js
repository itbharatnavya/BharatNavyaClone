/**
 * searchTrends.querycount.test.js — routes/searchTrends.js reads events + categories
 * through the directory port / a flat repo, not lib/store (BACKEND-AUDIT.md Phase 7
 * sweep-3).
 *
 * Was: `store.readJsonl("search-events.jsonl")` (x2) + `store.all("categories.json")`
 * (x2). Now: `directory.readSearchEvents()` (-> lib/db/search-events readAll) and
 * `repoForCollection("categories.json").findMany({})`. The route no longer imports
 * lib/store at all.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

test("searchTrends reads via port/repo, not lib/store (Phase 7 sweep-3)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const src = fs.readFileSync(path.join(__dirname, "../routes/searchTrends.js"), "utf8");
  assert.ok(!/require\(["']\.\.\/lib\/store["']\)/.test(src), "routes/searchTrends.js must not require lib/store");

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const hit = (re) => seen.some((s) => re.test(s));

  try {
    for (const p of ["/api/search/trending", "/api/search/popular"]) {
      seen.length = 0;
      const r = await request(app).get(p);
      assert.equal(r.status, 200, p);
      assert.ok(Array.isArray(r.body.data), `${p} returns a data array`);
      assert.ok(hit(/FROM\s+"?search_events"?/i), `${p} reads search_events via SQL`);
      assert.ok(hit(/FROM\s+"?categories"?/i), `${p} reads categories via SQL`);
    }
  } finally {
    pool.query = orig;
  }
});
