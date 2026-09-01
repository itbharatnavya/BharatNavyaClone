/**
 * differential.test.js — the Phase 2 gate (BACKEND-AUDIT.md: "the single most
 * important assertion in the migration — it makes divergence structurally
 * impossible rather than merely discouraged").
 *
 * For each flat collection: the new repository and the legacy predicate store must
 * return deep-equal documents for the same logical query.
 *   repo.findMany({})            === store.all(coll)
 *   repo.findById(id)            === store.getById(coll, id)
 *   repo.findMany({ where: X })  === store.findMany(coll, predicateFor(X))
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`). Read-only except a
 * single increment/restore pair that nets to zero.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const store = require("../lib/store");
const { pool, createRepository } = require("../modules/_shared");
const { buildFlatConfigs } = require("../modules/_shared/mappings/flat.mappings");
const { nextId } = require("../lib/pg-store");

const CONFIGS = Object.fromEntries(buildFlatConfigs(nextId).map((c) => [c.file, c]));
const repoFor = (file) => createRepository({ pool, mapping: CONFIGS[file] });

// { collection : [ { name, where, predicate } ] } — one representative filter each,
// deliberately exercising a JS-key -> column rename (jobFunction -> job_function).
const CASES = {
  "categories.json": [
    { name: "top-level (isNull)", where: { parentId: { isNull: true } }, predicate: (c) => c.parentId == null },
    { name: "type eq", where: { type: "category" }, predicate: (c) => c.type === "category" },
  ],
  "job-functions.json": [
    { name: "active", where: { isActive: true }, predicate: (j) => j.isActive === true },
  ],
  "jobs.json": [
    { name: "status eq", where: { status: "active" }, predicate: (j) => j.status === "active" },
    { name: "jobFunction rename", where: { jobFunction: "engineering" }, predicate: (j) => j.jobFunction === "engineering" },
  ],
  "reviews.json": [
    { name: "approved", where: { status: "approved" }, predicate: (r) => r.status === "approved" },
  ],
  "collections.json": [
    { name: "published", where: { status: "published" }, predicate: (c) => c.status === "published" },
  ],
  "features.json": [
    { name: "live", where: { status: "live" }, predicate: (f) => f.status === "live" },
  ],
};

test("repository vs legacy store — differential", async (t) => {
  t.after(async () => {
    // shared pool; pg-store owns close() in the real process, but the test process
    // must release it so `node --test` can exit.
    await pool.end().catch(() => {});
  });

  for (const [coll, cases] of Object.entries(CASES)) {
    await t.test(coll, async () => {
      const repo = repoFor(coll);

      const repoAll = await repo.findMany({});
      const storeAll = await store.all(coll);
      assert.deepEqual(repoAll, storeAll, `findMany({}) must equal store.all("${coll}")`);

      if (storeAll.length) {
        const id = storeAll[Math.floor(storeAll.length / 2)].id;
        assert.deepEqual(
          await repo.findById(id),
          await store.getById(coll, id),
          `findById("${id}") must equal store.getById`
        );
      }

      for (const c of cases) {
        assert.deepEqual(
          await repo.findMany({ where: c.where }),
          await store.findMany(coll, c.predicate),
          `${coll} [${c.name}]: findMany({where}) must equal store.findMany(predicate)`
        );
      }
    });
  }

  await t.test("page() returns items + total in the paged shape", async () => {
    const repo = repoFor("jobs.json");
    const all = await store.all("jobs.json");
    const p = await repo.page({ page: 1, limit: 5, orderBy: "-postedAt" });
    assert.equal(p.total, all.length);
    assert.ok(p.items.length <= 5);
    assert.equal(p.page, 1);
    assert.equal(p.totalPages, Math.max(1, Math.ceil(all.length / 5)));
  });

  await t.test("incrementById is atomic and reversible", async () => {
    const repo = repoFor("jobs.json");
    const before = await store.getById("jobs.json", "job_000011");
    if (!before) return; // seed variance — skip
    const base = before.viewCount || 0;
    const up = await repo.incrementById("job_000011", "viewCount", 5);
    assert.equal(up.viewCount, base + 5);
    const down = await repo.incrementById("job_000011", "viewCount", -5);
    assert.equal(down.viewCount, base, "restored to the original count");
  });
});
