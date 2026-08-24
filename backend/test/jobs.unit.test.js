/**
 * Pure-function unit tests for routes/jobs.js's validation/normalization helpers.
 * No DB, no server — run with `npm test` (node:test).
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { paginationOf, buildLocation, buildSalaryRange, normalizeStringList, isOwnerOrAdmin } =
  require("../routes/jobs")._internal;

test("paginationOf clamps limit to MAX_LIMIT (50) even if the client asks for more", () => {
  const { page, limit } = paginationOf({ page: "1", limit: "999999" });
  assert.equal(page, 1);
  assert.equal(limit, 50);
});

test("paginationOf floors page/limit at 1 for zero/negative/garbage input", () => {
  assert.deepEqual(paginationOf({ page: "0", limit: "-5" }), { page: 1, limit: 1 });
  assert.deepEqual(paginationOf({ page: "not-a-number", limit: "" }), { page: 1, limit: 12 });
});

test("buildLocation coerces remote to a real boolean and trims city/state", () => {
  assert.deepEqual(buildLocation({ city: "  Pune ", state: " MH ", remote: "true" }), {
    city: "Pune", state: "MH", remote: true,
  });
  assert.deepEqual(buildLocation(undefined), { city: "", state: "", remote: false });
});

test("buildSalaryRange defaults isDisclosed to true when omitted, not false", () => {
  const sr = buildSalaryRange({ min: "50000", max: "80000" });
  assert.equal(sr.isDisclosed, true);
  assert.equal(sr.min, 50000);
  assert.equal(sr.max, 80000);
  assert.equal(sr.currency, "INR");
});

test("buildSalaryRange respects an explicit isDisclosed:false", () => {
  assert.equal(buildSalaryRange({ isDisclosed: false }).isDisclosed, false);
});

test("normalizeStringList drops blanks and caps at the given max", () => {
  const input = ["a", "", "  ", "b", "c", "d"];
  assert.deepEqual(normalizeStringList(input, 2), ["a", "b"]);
  assert.deepEqual(normalizeStringList("not-an-array"), []);
});

test("isOwnerOrAdmin: owner matches employerId, admin bypasses, stranger is rejected", () => {
  const job = { employerId: "usr_emp1" };
  assert.equal(isOwnerOrAdmin({ id: "usr_emp1", roles: [] }, job), true);
  assert.equal(isOwnerOrAdmin({ id: "usr_other", roles: ["admin"] }, job), true);
  assert.equal(isOwnerOrAdmin({ id: "usr_other", roles: [] }, job), false);
  assert.equal(isOwnerOrAdmin(null, job), false);
});
