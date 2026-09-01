/**
 * _harness.js — golden-response helper for test/golden.test.js
 * (BACKEND-AUDIT.md Phase 0 — "Golden-response harness").
 *
 * The migration's #1 safety rule is "API responses may only gain keys." These
 * fixtures are how that is enforced mechanically: capture each endpoint's response
 * once, commit it, and fail any later change that alters the shape, the values, or
 * the ORDER of a list — the last one being the only thing that catches a
 * nondeterministic ORDER BY after the .slice() -> LIMIT rewrites.
 *
 * Determinism: run against the frozen PG_URL_TEST database (`npm run test:setup`),
 * never the working dev DB.
 *
 * Normalization (so a golden is stable without hiding a real contract change):
 *   - object keys are sorted (key order is not a JSON contract; mapper/V8 jitter is not a regression)
 *   - ARRAY ORDER IS PRESERVED (it IS the contract)
 *   - values under known time/token keys -> "<volatile>" / 0
 *   - any ISO-8601-looking string -> "<timestamp>"
 * Everything else — including ids and counts — is asserted verbatim (stable in a
 * frozen DB). If a legitimate change alters a shape, review the diff and re-run
 * `npm run goldens:update`.
 */

const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../../app");

const DIR = __dirname;
const UPDATE = process.env.UPDATE_GOLDENS === "1";

const VOLATILE_KEYS = new Set([
  // timestamps / tokens
  "createdAt", "updatedAt", "postedAt", "expiresAt", "publishedAt", "approvedAt",
  "reviewedAt", "lastActiveAt", "lastLoginAt", "seededAt", "date", "timestamp",
  "generatedAt", "token", "iat", "exp",
  // runtime-mutable counters — a fire-and-forget view bump (C2) or an application
  // must not make a golden flaky. The KEY presence is still asserted (as 0); the
  // value is not part of a stable contract.
  "views", "viewCount", "viewsCount", "profileViews", "applicationCount",
  "impressions", "clicks",
]);
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

function normalize(value, key) {
  if (Array.isArray(value)) return value.map((v) => normalize(v, key));
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = normalize(value[k], k);
    return out;
  }
  if (typeof value === "string") {
    if (VOLATILE_KEYS.has(key)) return "<volatile>";
    if (ISO_RE.test(value)) return "<timestamp>";
    return value;
  }
  if (typeof value === "number" && VOLATILE_KEYS.has(key)) return 0;
  return value;
}

/**
 * @param {import('node:test').TestContext} t
 * @param {string} name  fixture basename (also the sub-test name)
 * @param {(agent: import('supertest').SuperTest<any>) => Promise<any>} build
 *        e.g. (r) => r.get("/api/categories").set("Authorization", `Bearer ${tok}`)
 */
async function golden(t, name, build) {
  await t.test(name, async () => {
    const res = await build(request(app));
    const snapshot = { status: res.status, body: normalize(res.body, "") };
    const file = path.join(DIR, `${name}.json`);

    if (UPDATE || !fs.existsSync(file)) {
      fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`);
      t.diagnostic(`${UPDATE ? "updated" : "created"} golden: ${name}`);
      return;
    }
    const expected = JSON.parse(fs.readFileSync(file, "utf-8"));
    assert.deepEqual(
      snapshot,
      expected,
      `golden mismatch for "${name}". If this change is intentional, run \`npm run goldens:update\` and review the diff.`
    );
  });
}

module.exports = { golden, normalize };
