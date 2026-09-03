/**
 * settings-repo.test.js — the `settings` singleton is reached through
 * modules/platform/repository/settings.repository, not `store.readJson/
 * writeJson/withLock("settings.json")` (BACKEND-AUDIT.md Phase 8.1).
 *
 * Consumers moved: routes/config.js, routes/admin.js (GET/PUT /settings),
 * routes/assistant.js (isRecruitmentLive), lib/ranking.js (loadWeights).
 * `GET /api/config` is golden-guarded elsewhere; this checks the repo returns
 * the SAME doc the legacy store path did, and that the source files no longer
 * name "settings.json" through `store`.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const store = require("../lib/store");
const settingsRepo = require("../modules/platform/repository/settings.repository");
const { pool } = require("../modules/_shared/pool");

test("settings repo matches the legacy store path; consumers no longer use store for it", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const viaRepo = await settingsRepo.read({});
  const viaStore = await store.readJson("settings.json", {});
  assert.deepEqual(viaRepo, viaStore, "settingsRepo.read() != store.readJson('settings.json')");

  for (const rel of ["../routes/config.js", "../routes/assistant.js", "../lib/ranking.js"]) {
    const src = fs.readFileSync(path.join(__dirname, rel), "utf8");
    assert.ok(
      !/store\.(readJson|writeJson|withLock)\(\s*["']settings\.json["']/.test(src),
      `${rel} still reaches settings.json through store`
    );
  }
  // config.js + ranking.js should not require lib/store at all any more
  for (const rel of ["../routes/config.js", "../lib/ranking.js"]) {
    const src = fs.readFileSync(path.join(__dirname, rel), "utf8");
    assert.ok(!/require\(["']\.\.\/lib\/store["']\)/.test(src), `${rel} must not require lib/store`);
  }
});
