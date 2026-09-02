/**
 * ai.querycount.test.js — routes/ai.js + routes/assistant.js off the every-row
 * store scans (BACKEND-AUDIT.md Phase 7 sweep-14, the AI cluster + C8).
 *
 * ai.js dropped `lib/store` entirely: `store.all("categories.json")` (×3) →
 * `repoForCollection("categories.json").findMany({})`; `fallbackScan`'s
 * `store.all("listings.json")` → `directory.listingsForAiFallback()`.
 * assistant.js keeps `lib/store` ONLY for the `settings.json` singleton read
 * (`isRecruitmentLive`); `buildStatsReply`'s three `store.all` scans →
 * `directory.activeListingCountsByType()` + `identity.directoryCounts()` +
 * `repoForCollection("categories.json").count()`; the two `store.all(
 * "categories.json")` in `/chat` → the flat repo.
 *
 * C8: `/api/ai/search` and `/api/assistant/chat` now carry a `degraded` boolean
 * (true only when an AI refine call was attempted and failed → deterministic
 * fallback). Response shapes are otherwise unchanged (no goldens on these).
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

// Force the pure deterministic path — no real `claude` spawn, so the test is
// fast and independent of the host's CLI login / hourly budget.
process.env.AI_CLI_ENABLED = "false";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

test("ai + assistant read via module ports, not store scans; C8 degraded flag (Phase 7 sweep-14)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const aiSrc = fs.readFileSync(path.join(__dirname, "../routes/ai.js"), "utf8");
  assert.ok(!/require\(["']\.\.\/lib\/store["']\)/.test(aiSrc), "routes/ai.js must not require lib/store");

  const asSrc = fs.readFileSync(path.join(__dirname, "../routes/assistant.js"), "utf8");
  assert.ok(!/store\.all\(/.test(asSrc), "routes/assistant.js must not call store.all()");

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const hit = (re) => seen.some((s) => re.test(s));

  try {
    // --- POST /api/ai/search : categories via the flat repo, degraded flag -----
    seen.length = 0;
    const s = await request(app).post("/api/ai/search").send({ query: "steel pipes in Mumbai" });
    assert.equal(s.status, 200);
    assert.equal(s.body.data.degraded, false, "no key -> not degraded");
    assert.ok(["navigate", "list", "clarify"].includes(s.body.data.mode));
    assert.ok(hit(/FROM\s+"?categories"?/i), "/ai/search reads categories via SQL");

    // --- POST /api/assistant/chat (stats) : counts via GROUP BY + profile counts,
    //     never a full users / listings hydrate --------------------------------
    seen.length = 0;
    const c = await request(app).post("/api/assistant/chat").send({ message: "how many products are there" });
    assert.equal(c.status, 200);
    assert.ok("degraded" in c.body.data, "chat response carries degraded");
    assert.equal(typeof c.body.data.usedAI, "boolean");
    assert.ok(hit(/FROM\s+listings\s+WHERE\s+status\s*=\s*'active'\s+GROUP\s+BY\s+type/i), "stats uses the type GROUP BY");
    assert.ok(hit(/FROM\s+seller_profiles/i), "stats counts sellers via seller_profiles");
    assert.ok(hit(/FROM\s+expert_profiles/i), "stats counts experts via expert_profiles");
    assert.ok(!hit(/SELECT\s+\*\s+FROM\s+users\s+ORDER\s+BY/i), "stats must NOT hydrate every user");
    assert.ok(!hit(/SELECT\s+\*\s+FROM\s+listings\s+ORDER\s+BY\s+id\s+ASC/i), "stats must NOT hydrate every listing");

    // --- POST /api/assistant/chat (navigation) : categories via the flat repo --
    seen.length = 0;
    const c2 = await request(app).post("/api/assistant/chat").send({ message: "i need industrial pumps" });
    assert.equal(c2.status, 200);
    assert.ok("degraded" in c2.body.data);
    assert.ok(hit(/FROM\s+"?categories"?/i), "chat navigation reads categories via SQL");
    assert.ok(!hit(/SELECT\s+\*\s+FROM\s+users\s+ORDER\s+BY/i), "chat nav must NOT hydrate every user");
  } finally {
    pool.query = orig;
  }
});
